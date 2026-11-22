    // ==================== BỘ PHÁT ÂM THANH "BÍP" CHO SÚNG QUÉT MÃ VẠCH ====================
    let scannerSoundEnabled = true;
    let sharedAudioCtx = null;

    function playScannerBeep(type = 'success') {
      if (!scannerSoundEnabled) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!sharedAudioCtx) sharedAudioCtx = new AudioContextClass();
        if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();

        const now = sharedAudioCtx.currentTime;
        const osc = sharedAudioCtx.createOscillator();
        const gain = sharedAudioCtx.createGain();
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);

        if (type === 'success') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1046.5, now); // C6 crisp high beep
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'card') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(784, now); // G5
          osc.frequency.setValueAtTime(1174.66, now + 0.07); // D6
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.18);
        } else {
          // Error / warning double low buzz
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.start(now);
          osc.stop(now + 0.28);
        }
      } catch (e) {}
    }

    function toggleScannerSound() {
      scannerSoundEnabled = !scannerSoundEnabled;
      const btn = document.getElementById('btnToggleScannerSound');
      if (btn) {
        btn.innerHTML = scannerSoundEnabled
          ? '<i class="ph-bold ph-speaker-high"></i> Âm Bíp: BẬT'
          : '<i class="ph-bold ph-speaker-slash"></i> Âm Bíp: TẮT';
      }
      if (scannerSoundEnabled) playScannerBeep('success');
    }

    // ==================== HỆ THỐNG BẮT SÓNG SÚNG QUÉT MÃ VẠCH (USB / BLUETOOTH HID) ====================
    let globalScannerEnabled = true;
    let posScannerMode = 'SMART_POS'; // 'SMART_POS' | 'FAST_BORROW' | 'FAST_RETURN'
    let posActiveReaderId = null;
    let posScanHistory = [];
    let barcodeKeyBuffer = '';
    let lastBarcodeKeyTime = 0;

    function toggleGlobalScannerMode() {
      globalScannerEnabled = !globalScannerEnabled;
      const btn = document.getElementById('btnToggleGlobalScanner');
      const headerBadge = document.getElementById('headerScannerBadge');
      if (btn) {
        btn.className = globalScannerEnabled
          ? 'px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm'
          : 'px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition';
        btn.innerHTML = globalScannerEnabled
          ? '<i class="ph-bold ph-broadcast"></i> Bắt Súng Toàn Cục: ĐANG BẬT'
          : '<i class="ph-bold ph-broadcast"></i> Bắt Súng Toàn Cục: ĐÃ TẮT';
      }
      if (headerBadge) {
        headerBadge.className = globalScannerEnabled
          ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200';
        headerBadge.innerHTML = globalScannerEnabled
          ? '<i class="ph-bold ph-barcode"></i> Súng Barcode: Bật'
          : '<i class="ph-bold ph-barcode"></i> Súng Barcode: Tắt';
      }
      showToast(globalScannerEnabled ? 'Đã bật cảm biến Súng Quét Mã Vạch toàn cục!' : 'Đã tắt bắt sóng súng quét toàn cục.');
    }

    function setPosScannerMode(mode) {
      posScannerMode = mode;
      ['SMART_POS', 'FAST_BORROW', 'FAST_RETURN'].forEach(m => {
        const btn = document.getElementById(`posModeBtn-${m}`);
        if (!btn) return;
        if (m === mode) {
          btn.className = 'p-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-500/20 text-left transition';
        } else {
          btn.className = 'p-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-left transition';
        }
      });
      focusScannerInput();
    }

    function focusScannerInput() {
      const el = document.getElementById('barcodeScannerInput');
      if (el && !el.closest('.hidden')) {
        el.focus();
        el.select();
      }
    }

    function handleManualBarcodeSubmit(e) {
      e.preventDefault();
      const input = document.getElementById('barcodeScannerInput');
      if (!input) return;
      const code = input.value.trim();
      if (!code) return;
      input.value = '';
      processScannedBarcode(code, 'INPUT_BOX');
    }

    function simulateBarcodeScan(sampleCode) {
      const input = document.getElementById('barcodeScannerInput');
      if (input) input.value = sampleCode;
      processScannedBarcode(sampleCode, 'DEMO_TRIGGER');
      if (input) input.value = '';
    }

    // Bộ lắng nghe xung phím tốc độ cao từ Súng Quét Mã Vạch USB/Bluetooth
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !document.getElementById('admin-tab-scanner')?.classList.contains('hidden')) {
        clearPosActiveReader();
        return;
      }

      if (!globalScannerEnabled) return;

      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      const activeId = document.activeElement ? document.activeElement.id : '';
      // Nếu đang gõ trong một ô input khác (không phải barcodeScannerInput), không cướp phím trừ khi súng bắn ở ngoài
      if ((activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') && activeId !== 'barcodeScannerInput') {
        return;
      }
      if (activeId === 'barcodeScannerInput') {
        return; // Đã có form submit của barcodeScannerInput xử lý
      }

      const now = Date.now();
      if (now - lastBarcodeKeyTime > 120) {
        barcodeKeyBuffer = '';
      }
      lastBarcodeKeyTime = now;

      if (e.key === 'Enter') {
        if (barcodeKeyBuffer.length >= 3) {
          e.preventDefault();
          const scannedCode = barcodeKeyBuffer.trim();
          barcodeKeyBuffer = '';
          // Nếu Admin đang đăng nhập, tự động chuyển sang xử lý mã vạch
          if (db.currentUser && db.currentUser.role === 'admin') {
            processScannedBarcode(scannedCode, 'GUN_GLOBAL');
          } else {
            // Nếu là Độc giả đang tra cứu OPAC ngoài trang chủ, điền thẳng vào thanh tìm kiếm OPAC!
            const opacInput = document.getElementById('publicSearchInput');
            if (opacInput) {
              opacInput.value = scannedCode;
              handleSearchInput(scannedCode);
              const matchedBook = db.books.find(b => String(b.code).toUpperCase() === scannedCode.toUpperCase());
              if (matchedBook) openBookDetailModal(matchedBook.id);
            }
          }
        }
        barcodeKeyBuffer = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeKeyBuffer += e.key;
      }
    });

    async function processScannedBarcode(rawCode, source = 'GUN') {
      const code = String(rawCode || '').trim().toUpperCase();
      if (!code) return;

      const timeStr = new Date().toLocaleTimeString('vi-VN');
      const timeLabel = document.getElementById('lastScannedTimeLabel');
      if (timeLabel) timeLabel.textContent = `Lượt bắn gần nhất: ${code} lúc ${timeStr}`;

      // 1. Kiểm tra xem mã vừa bắn có phải là MÃ THẺ ĐỘC GIẢ (User CardCode) không?
      const matchedUser = db.users.find(u => String(u.cardCode || '').toUpperCase() === code);
      if (matchedUser) {
        if (matchedUser.status === 'locked') {
          playScannerBeep('error');
          logPosScan(code, 'THẺ ĐỘC GIẢ', `Thẻ ${matchedUser.cardCode} (${matchedUser.fullName}) đang bị KHÓA!`, 'error');
          showToast(`Cảnh báo: Thẻ ${matchedUser.cardCode} đang bị khóa!`);
          return;
        }
        posActiveReaderId = matchedUser.id;
        playScannerBeep('card');
        logPosScan(code, 'THẺ ĐỘC GIẢ', `Đã nạp độc giả: ${matchedUser.fullName} (Lớp ${matchedUser.group})`, 'card');
        renderPosScannerStation();
        showToast(`Đã nhận thẻ: ${matchedUser.fullName} (${matchedUser.cardCode})`);
        focusScannerInput();
        return;
      }

      // 2. Kiểm tra xem mã vừa bắn có phải là MÃ PHIẾU MƯỢN (TicketCode: PM-... hoặc ONL-...) không?
      const matchedTicket = db.borrows.find(b => String(b.ticketCode || '').toUpperCase() === code);
      if (matchedTicket) {
        const reader = db.users.find(u => u.id === matchedTicket.userId);
        const book = db.books.find(x => x.id === matchedTicket.bookId);
        const actorName = db.currentUser ? `${db.currentUser.fullName} (${db.currentUser.username || 'Admin'})` : 'Thủ thư';
        if (matchedTicket.status === 'pending') {
          if (isCloudConnected && supabaseClient) {
            const { data: res, error } = await supabaseClient.rpc('approve_borrow_atomic', { p_borrow_id: matchedTicket.id, p_due_date: null, p_actor_name: actorName });
            if (error || !res?.success) {
              playScannerBeep('error');
              showToast(error?.message || 'Lỗi duyệt phiếu trên Cloud!');
              return;
            }
          }
          matchedTicket.status = 'borrowing';
          matchedTicket.borrowDate = new Date().toISOString().split('T')[0];
          await saveDB('borrows');
          playScannerBeep('success');
          logPosScan(code, 'MÃ PHIẾU', `Duyệt giao sách "${book ? book.title : ''}" cho ${reader ? reader.fullName : ''}`, 'success');
          showToast(`Đã duyệt phiếu ${matchedTicket.ticketCode}!`);
        } else if (matchedTicket.status === 'borrowing') {
          if (isCloudConnected && supabaseClient) {
            const { data: res, error } = await supabaseClient.rpc('return_book_atomic', { p_borrow_id: matchedTicket.id });
            if (error || !res?.success) {
              playScannerBeep('error');
              showToast(error?.message || 'Lỗi thu hồi sách trên Cloud!');
              return;
            }
            await supabaseClient.from('borrows').update({ returned_by_name: actorName }).eq('id', matchedTicket.id);
          }
          matchedTicket.status = 'returned';
          matchedTicket.returnDate = new Date().toISOString().split('T')[0];
          if (book) book.available = Math.min(book.total, book.available + 1);
          await saveDB('ALL');
          playScannerBeep('success');
          logPosScan(code, 'MÃ PHIẾU', `Thu hồi trả sách "${book ? book.title : ''}" từ ${reader ? reader.fullName : ''}`, 'success');
          showToast(`Đã nhận trả sách phiếu ${matchedTicket.ticketCode}!`);
        } else {
          playScannerBeep('error');
          logPosScan(code, 'MÃ PHIẾU', `Phiếu ${matchedTicket.ticketCode} đã hoàn trả trước đó (${matchedTicket.returnDate})`, 'warning');
          showToast(`Phiếu ${matchedTicket.ticketCode} đã trả rồi!`);
        }
        renderPosScannerStation();
        focusScannerInput();
        return;
      }

      // 3. Kiểm tra xem mã vừa bắn có phải là MÃ SÁCH (Book Code: TH12-001...) không?
      const matchedBook = db.books.find(b => String(b.code || '').toUpperCase() === code);
      if (matchedBook) {
        await handleScannedBookOnPos(matchedBook);
        renderPosScannerStation();
        focusScannerInput();
        return;
      }

      // 4. Không khớp mã nào trong CSDL
      playScannerBeep('error');
      logPosScan(code, 'KHÔNG XÁC ĐỊNH', `Không tìm thấy Thẻ, Sách hay Phiếu nào khớp với mã "${code}"`, 'error');
      showToast(`Không tìm thấy mã vạch "${code}" trong hệ thống!`);
      renderPosScannerStation();
      focusScannerInput();
    }

    async function posAtomicReturnTicket(ticket, book) {
      const todayStr = new Date().toISOString().split('T')[0];
      const actorName = db.currentUser ? `${db.currentUser.fullName} (${db.currentUser.username || 'Admin'})` : 'Thủ thư';
      if (isCloudConnected && supabaseClient) {
        const { data: res, error } = await supabaseClient.rpc('return_book_atomic', { p_borrow_id: ticket.id });
        if (error || !res?.success) {
          playScannerBeep('error');
          showToast(error?.message || 'Lỗi trả sách trên Cloud!');
          return false;
        }
        await supabaseClient.from('borrows').update({ returned_by_name: actorName }).eq('id', ticket.id);
      }
      ticket.status = 'returned';
      ticket.returnDate = todayStr;
      ticket.returnedBy = actorName;
      if (book) book.available = Math.min(book.total, book.available + 1);
      await saveDB('ALL');
      return true;
    }

    async function handleScannedBookOnPos(book) {
      const loanDays = Number(document.getElementById('posDefaultLoanDays')?.value || 14);
      const dueObj = new Date();
      dueObj.setDate(dueObj.getDate() + loanDays);
      const dueDateStr = dueObj.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      const actorName = db.currentUser ? `${db.currentUser.fullName} (${db.currentUser.username || 'Admin'})` : 'Thủ thư';

      // Chế độ 3: TRẢ SÁCH NHANH 1 BƯỚC (Không cần quét thẻ độc giả nếu chỉ có 1 người đang mượn cuốn này)
      if (posScannerMode === 'FAST_RETURN' || !posActiveReaderId) {
        const activeBorrowsForBook = db.borrows.filter(b => b.bookId === book.id && b.status === 'borrowing');
        if (posScannerMode === 'FAST_RETURN') {
          // Nếu đang chọn độc giả và độc giả đó có mượn cuốn này -> Trả luôn
          const targetBorrow = posActiveReaderId
            ? activeBorrowsForBook.find(b => b.userId === posActiveReaderId)
            : (activeBorrowsForBook.length === 1 ? activeBorrowsForBook[0] : null);

          if (targetBorrow) {
            const holder = db.users.find(u => u.id === targetBorrow.userId);
            const ok = await posAtomicReturnTicket(targetBorrow, book);
            if (!ok) return;
            playScannerBeep('success');
            logPosScan(book.code, 'TRẢ SÁCH NHANH', `Nhận trả "${book.title}" từ ${holder ? holder.fullName : 'Độc giả'} (${targetBorrow.ticketCode})`, 'success');
            showToast(`Đã thu hồi sách "${book.title}"!`);
            return;
          } else if (activeBorrowsForBook.length > 1) {
            playScannerBeep('error');
            logPosScan(book.code, 'CẦN QUÉT THẺ', `Có ${activeBorrowsForBook.length} độc giả đang mượn "${book.code}". Hãy bắn Thẻ Độc Giả trước!`, 'warning');
            showToast(`Có ${activeBorrowsForBook.length} người đang mượn sách này. Hãy quét Thẻ học sinh!`);
            return;
          } else {
            playScannerBeep('error');
            logPosScan(book.code, 'KHÔNG CÓ ĐƠN MƯỢN', `Sách "${book.title}" hiện không có ai đang mượn.`, 'error');
            showToast(`Sách "${book.code}" hiện không có phiếu đang mượn!`);
            return;
          }
        }

        // Nếu chưa quét thẻ độc giả ở chế độ SMART_POS, kiểm tra xem cuốn sách này có đúng 1 người đang mượn hoặc chờ duyệt không
        if (!posActiveReaderId) {
          if (activeBorrowsForBook.length === 1) {
            const singleBorrow = activeBorrowsForBook[0];
            const holder = db.users.find(u => u.id === singleBorrow.userId);
            const ok = await posAtomicReturnTicket(singleBorrow, book);
            if (!ok) return;
            posActiveReaderId = singleBorrow.userId;
            playScannerBeep('success');
            logPosScan(book.code, 'TỰ ĐỘNG TRẢ SÁCH', `Nhận trả "${book.title}" từ ${holder ? holder.fullName : ''} (${singleBorrow.ticketCode})`, 'success');
            showToast(`Đã thu hồi sách "${book.title}" của ${holder ? holder.fullName : ''}!`);
            return;
          }
          playScannerBeep('error');
          logPosScan(book.code, 'CHƯA QUÉT THẺ', `Đã nhận diện sách "${book.title}". Vui lòng bắn Mã Thẻ Độc Giả trước để cho mượn!`, 'warning');
          showToast('Vui lòng dùng súng bắn Mã Thẻ Độc Giả trước khi bắn Mã Sách!');
          return;
        }
      }

      // Khi ĐÃ CÓ Độc giả đang giao dịch tại quầy (posActiveReaderId)
      const reader = db.users.find(u => u.id === posActiveReaderId);
      if (!reader) {
        posActiveReaderId = null;
        return;
      }

      // Kiểm tra xem độc giả này có phiếu PENDING (đặt online) cho cuốn sách này không
      const pendingTicket = db.borrows.find(b => b.userId === reader.id && b.bookId === book.id && b.status === 'pending');
      if (pendingTicket && posScannerMode !== 'FAST_RETURN') {
        if (isCloudConnected && supabaseClient) {
          const { data: res, error } = await supabaseClient.rpc('approve_borrow_atomic', {
            p_borrow_id: pendingTicket.id,
            p_due_date: dueDateStr,
            p_actor_name: actorName
          });
          if (error || !res?.success) {
            playScannerBeep('error');
            showToast(error?.message || 'Lỗi duyệt phiếu trên Cloud!');
            return;
          }
        }
        pendingTicket.status = 'borrowing';
        pendingTicket.borrowDate = todayStr;
        pendingTicket.dueDate = dueDateStr;
        pendingTicket.processedBy = actorName;
        await saveDB('borrows');
        if (reader.email) sendBorrowStatusEmail(reader, book, pendingTicket);
        playScannerBeep('success');
        logPosScan(book.code, 'DUYỆT ĐẶT ONLINE', `Giao sách "${book.title}" cho ${reader.fullName} (Phiếu ${pendingTicket.ticketCode})`, 'success');
        showToast(`Đã duyệt & giao sách "${book.title}" cho ${reader.fullName}!`);
        return;
      }

      // Kiểm tra xem độc giả này có đang MƯỢN (borrowing) cuốn sách này không -> Nếu ở chế độ SMART_POS thì tự động THU HỒI TRẢ SÁCH!
      const activeTicket = db.borrows.find(b => b.userId === reader.id && b.bookId === book.id && b.status === 'borrowing');
      if (activeTicket && posScannerMode === 'SMART_POS') {
        const ok = await posAtomicReturnTicket(activeTicket, book);
        if (!ok) return;
        playScannerBeep('success');
        logPosScan(book.code, 'NHẬN TRẢ SÁCH', `${reader.fullName} đã trả sách "${book.title}" (Phiếu ${activeTicket.ticketCode})`, 'success');
        showToast(`Đã nhận trả sách "${book.title}" từ ${reader.fullName}!`);
        return;
      }

      // Ngược lại: Lập phiếu CHO MƯỢN MỚI cho độc giả này
      if (book.available <= 0) {
        playScannerBeep('error');
        logPosScan(book.code, 'HẾT SÁCH TRONG KHO', `Sách "${book.title}" hiện đã hết bản có sẵn (0/${book.total})!`, 'error');
        showToast(`Sách "${book.title}" đã hết bản trong kho!`);
        return;
      }

      const activeYear = db.currentSchoolYear && db.currentSchoolYear !== 'ALL' ? db.currentSchoolYear : '2026-2027';
      let newTicket = null;
      if (isCloudConnected && supabaseClient) {
        const { data: res, error } = await supabaseClient.rpc('staff_create_borrow_atomic', {
          p_reader_id: reader.id,
          p_book_id: book.id,
          p_borrow_date: todayStr,
          p_due_date: dueDateStr,
          p_return_date: null,
          p_status: 'borrowing',
          p_school_year: activeYear,
          p_ticket_code: 'POS-' + Math.floor(1000 + Math.random() * 9000),
          p_processed_by_name: actorName
        });
        if (error || !res?.success) {
          playScannerBeep('error');
          logPosScan(book.code, 'LỖI CLOUD', error?.message || 'Không thể lập phiếu mượn trên Cloud!', 'error');
          showToast(error?.message || 'Lỗi tạo phiếu trên Cloud!');
          return;
        }
        book.available = Number(res.remaining_available);
        newTicket = res.borrow;
      } else {
        book.available -= 1;
        newTicket = {
          id: Date.now(),
          ticketCode: 'POS-' + Math.floor(1000 + Math.random() * 9000),
          userId: reader.id,
          bookId: book.id,
          schoolYear: activeYear,
          borrowDate: todayStr,
          dueDate: dueDateStr,
          returnDate: null,
          status: 'borrowing'
        };
      }
      db.borrows.unshift(newTicket);
      await saveDB('ALL');
      playScannerBeep('success');
      logPosScan(book.code, 'CHO MƯỢN MỚI', `Cho ${reader.fullName} mượn "${book.title}" • Hạn trả: ${dueDateStr}`, 'success');
      showToast(`Đã cho ${reader.fullName} mượn "${book.title}" (${newTicket.ticketCode})!`);
    }

    function logPosScan(code, actionLabel, detail, status = 'success') {
      const time = new Date().toLocaleTimeString('vi-VN');
      posScanHistory.unshift({ id: Date.now(), time, code, actionLabel, detail, status });
      if (posScanHistory.length > 30) posScanHistory.pop();

      const banner = document.getElementById('posLastActionBanner');
      if (banner) {
        const styleMap = {
          success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          card: 'bg-blue-50 border-blue-200 text-blue-800',
          warning: 'bg-amber-50 border-amber-200 text-amber-800',
          error: 'bg-rose-50 border-rose-200 text-rose-800'
        };
        const iconMap = {
          success: 'ph-check-circle text-emerald-600',
          card: 'ph-identification-card text-blue-600',
          warning: 'ph-warning text-amber-600',
          error: 'ph-x-circle text-rose-600'
        };
        banner.className = `m-4 p-3.5 rounded-xl border text-xs flex items-center gap-3 ${styleMap[status] || styleMap.success}`;
        banner.innerHTML = `
          <i class="ph-fill ${iconMap[status] || iconMap.success} text-2xl shrink-0"></i>
          <div class="min-w-0">
            <p class="font-bold uppercase tracking-wider text-[11px]">[${time}] ${actionLabel} • Mã: <span class="font-mono">${code}</span></p>
            <p class="text-xs font-semibold mt-0.5 truncate">${detail}</p>
          </div>
        `;
      }
    }

    function clearPosActiveReader() {
      posActiveReaderId = null;
      renderPosScannerStation();
      focusScannerInput();
    }

    function clearPosScanLog() {
      posScanHistory = [];
      renderPosScannerStation();
    }

    function renderPosScannerStation() {
      const box = document.getElementById('posActiveReaderBox');
      const logList = document.getElementById('posScanHistoryList');
      if (!box || !logList) return;

      if (!posActiveReaderId) {
        box.innerHTML = `
          <div class="py-10 text-center space-y-3">
            <div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-3xl">
              <i class="ph-duotone ph-barcode"></i>
            </div>
            <div>
              <h5 class="font-bold text-slate-800 text-base">Chưa chọn Độc giả tại quầy</h5>
              <p class="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Hãy dùng <strong>Súng quét mã vạch</strong> bắn vào <strong>Thẻ thư viện học sinh/giáo viên</strong> (hoặc bắn trực tiếp Mã sách nếu muốn thu hồi trả sách nhanh).
              </p>
            </div>
            <div class="pt-2 flex flex-wrap justify-center gap-2">
              ${db.users.slice(0, 4).map(u => `
                <button type="button" onclick="simulateBarcodeScan('${u.cardCode}')" class="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-semibold text-slate-700 transition">
                  Chọn nhanh: <span class="font-mono text-blue-600">${u.cardCode}</span> (${u.fullName})
                </button>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        const reader = db.users.find(u => u.id === posActiveReaderId);
        if (!reader) {
          posActiveReaderId = null;
          renderPosScannerStation();
          return;
        }
        const readerBorrows = db.borrows.filter(b => b.userId === reader.id && (b.status === 'borrowing' || b.status === 'pending'));
        
        box.innerHTML = `
          <div class="space-y-4">
            <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-600 text-white">${reader.cardCode}</span>
                  <span class="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">Lớp / ĐV: ${reader.group}</span>
                </div>
                <h4 class="text-lg font-bold text-slate-900">${reader.fullName}</h4>
                <p class="text-xs text-slate-600">${reader.email || 'Chưa có email'} ${reader.phone ? '• ' + reader.phone : ''}</p>
              </div>
              <div class="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-blue-100 shadow-sm">
                <div class="text-center pr-3 border-r border-slate-200">
                  <span class="text-[10px] font-semibold text-slate-400 uppercase block">Đang giữ</span>
                  <span class="text-lg font-bold text-blue-600">${readerBorrows.length}/5</span>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                <span>Sách đang giữ / Chờ duyệt của ${reader.fullName} (${readerBorrows.length})</span>
                <span class="text-[11px] text-emerald-600 font-normal">Bắn mã sách bất kỳ để Mượn mới hoặc Trả sách</span>
              </div>
              ${readerBorrows.length === 0 ? `
                <div class="p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  Độc giả hiện không giữ cuốn sách nào. Hãy bắn <strong>Mã vạch Sách</strong> để lập phiếu mượn!
                </div>
              ` : `
                <div class="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  ${readerBorrows.map(b => {
                    const bk = db.books.find(x => x.id === b.bookId) || { title: 'Sách đã xóa', code: '---' };
                    const fine = calculateFine(b);
                    return `
                      <div class="p-3 bg-white hover:bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">${bk.code}</span>
                            <span class="font-bold text-slate-800">${bk.title}</span>
                          </div>
                          <p class="text-[11px] text-slate-500 mt-0.5">
                            Mã phiếu: <strong class="font-mono">${b.ticketCode}</strong> • Hạn trả: <strong>${b.dueDate}</strong>
                            ${isOverdue(b) ? '<span class="text-rose-600 font-bold"> • Quá hạn trả</span>' : ''}
                          </p>
                        </div>
                        <div class="flex items-center gap-1.5">
                          ${b.status === 'pending'
                            ? `<button type="button" onclick="simulateBarcodeScan('${bk.code}')" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">🔫 Duyệt giao sách</button>`
                            : `
                              ${!b.renewed && !isOverdue(b) ? `<button type="button" onclick="renewBorrowTicket(${b.id})" class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">+7 ngày</button>` : ''}
                              <button type="button" onclick="simulateBarcodeScan('${bk.code}')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">🔫 Nhận trả sách</button>
                            `
                          }
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          </div>
        `;
      }

      if (posScanHistory.length === 0) {
        logList.innerHTML = `<div class="py-8 text-center text-xs text-slate-400">Chưa có thao tác quét mã vạch nào trong phiên này.</div>`;
      } else {
        logList.innerHTML = posScanHistory.map(item => {
          const badgeClass = item.status === 'error'
            ? 'bg-rose-100 text-rose-700'
            : (item.status === 'warning' ? 'bg-amber-100 text-amber-800' : (item.status === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'));
          return `
            <div class="py-2.5 flex items-start justify-between gap-2 text-xs">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-mono text-[11px] text-slate-400">${item.time}</span>
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${badgeClass}">${item.actionLabel}</span>
                  <span class="font-mono font-bold text-slate-800">${item.code}</span>
                </div>
                <p class="text-slate-600 mt-0.5 truncate">${item.detail}</p>
              </div>
            </div>
          `;
        }).join('');
      }
    }

