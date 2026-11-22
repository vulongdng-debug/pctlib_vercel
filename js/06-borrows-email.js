// ==================== XỬ LÝ DUYỆT / TRẢ SÁCH (CÓ THÔNG BÁO EMAIL) ====================
    const EMAILJS_CONFIG = {
      publicKey: "CcpIy42dhGnI2rz4D",
      serviceId: "service_3m8fdif",
      templateId: "template_zaw40tw"
    };

    if (window.emailjs) {
      try { emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey }); } catch (err) {}
    }

    async function sendBorrowStatusEmail(user, book, borrow) {
      if (!user || !user.email) return;
      const templateParams = {
        to_email: user.email,
        reader_name: user.fullName,
        ticket_code: borrow.ticketCode,
        status_label: borrow.status === 'borrowing' ? 'Đã duyệt cho mượn' : 'Đã hoàn trả',
        book_title: book.title,
        book_code: book.code,
        shelf: book.shelf || 'Quầy Thủ thư',
        borrow_date: borrow.borrowDate,
        due_date: borrow.dueDate
      };
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams);
      } catch (error) { console.error("Lỗi gửi EmailJS:", error); }
    }

    async function approvePendingBorrow(id) {
      const b = db.borrows.find(x => x.id === id);
      if (!b) return;
      const actorName = db.currentUser ? `${db.currentUser.fullName} (${db.currentUser.username || 'Admin'})` : 'Thủ thư';
      if (isCloudConnected && supabaseClient) {
        const { data: res, error } = await supabaseClient.rpc('approve_borrow_atomic', {
          p_borrow_id: id,
          p_due_date: null,
          p_actor_name: actorName
        });
        if (error || !res || !res.success) {
          showNoticeModal('Lỗi duyệt phiếu', res?.error || error?.message || 'Không thể duyệt phiếu trên Cloud!');
          return;
        }
        b.borrowDate = res.borrow_date || new Date().toISOString().split('T')[0];
      } else {
        b.borrowDate = new Date().toISOString().split('T')[0];
      }
      b.status = 'borrowing';
      b.processedBy = actorName;
      const user = db.users.find(u => u.id === b.userId);
      const book = db.books.find(x => x.id === b.bookId);
      await saveDB('borrows');
      if (user && user.email) sendBorrowStatusEmail(user, book, b);
      showToast(`Đã duyệt phiếu ${b.ticketCode}!`);
    }

    async function markBorrowReturned(id) {
      const b = db.borrows.find(x => x.id === id);
      if (!b) return;
      const actorName = db.currentUser ? `${db.currentUser.fullName} (${db.currentUser.username || 'Admin'})` : 'Thủ thư';
      if (isCloudConnected && supabaseClient) {
        const { data: res, error } = await supabaseClient.rpc('return_book_atomic', { p_borrow_id: id });
        if (error || !res || !res.success) {
          showNoticeModal('Lỗi trả sách', res?.error || error?.message || 'Không thể nhận trả sách trên Cloud!');
          return;
        }
        await supabaseClient.from('borrows').update({ returned_by_name: actorName }).eq('id', id);
      }
      b.status = 'returned';
      b.returnDate = new Date().toISOString().split('T')[0];
      b.returnedBy = actorName;
      const book = db.books.find(x => x.id === b.bookId);
      if (book) book.available = Math.min(book.total, book.available + 1);
      await saveDB('ALL');
      showToast(`Đã nhận trả sách cho phiếu ${b.ticketCode}!`);
    }

async function sendOverdueEmail(id) {
      const b = db.borrows.find(x => x.id === id);
      if (!b) return;

      const user = db.users.find(u => u.id === b.userId);
      const book = db.books.find(x => x.id === b.bookId);

      if (!user || !user.email) {
        showNoticeModal('Thiếu địa chỉ Email', `Không thể gửi! Độc giả ${user ? user.fullName : ''} chưa được cập nhật địa chỉ Email trên hệ thống.`);
        return;
      }

      // Gửi email qua EmailJS

      showToast(`Đang kết nối EmailJS để gửi thư cho ${user.fullName}...`);
      
      const templateParams = {
        to_email: user.email,
        reader_name: user.fullName,
        ticket_code: b.ticketCode,
        status_label: 'QUÁ HẠN TRẢ SÁCH',
        book_title: book ? book.title : 'Không rõ tên sách',
        book_code: book ? book.code : '---',
        borrow_date: b.borrowDate,
        due_date: b.dueDate,
        // Dùng biến message để truyền thêm thông báo phí phạt vào template EmailJS
        message: `Cuốn sách này đã quá hạn hoàn trả. Vui lòng mang sách đến thư viện hoàn trả trong thời gian sớm nhất.`
      };

      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, "template_uvusubm", templateParams);
        showToast(`✓ Đã gửi Email nhắc nhở quá hạn thành công!`);
      } catch (error) {
        console.error("Lỗi gửi EmailJS:", error);
        showNoticeModal("Lỗi gửi Email", "Lỗi khi gửi thư. Vui lòng kiểm tra lại cấu hình EmailJS.");
      }
    }

    async function updateFineRate(val) {
      db.finePerDay = Number(val) || 5000;
      await saveDB('settings');
      showToast(`Đã cập nhật đơn giá phạt: ${db.finePerDay.toLocaleString('vi-VN')}đ/ngày`);
    }

    // ==================== LẬP PHIẾU MƯỢN TRỰC TIẾP TẠI QUẦY ====================
    function filterDirectBorrowUsers(keyword = '') {
      const userSel = document.getElementById('directBorrowUserSelect');
      const cleanK = removeVietnameseTones(keyword.trim());
      const matched = db.users.filter(u => {
        if (u.status !== 'active') return false;
        if (!cleanK) return true;
        return removeVietnameseTones(u.cardCode).includes(cleanK) ||
               removeVietnameseTones(u.fullName).includes(cleanK) ||
               removeVietnameseTones(u.group).includes(cleanK);
      }).slice(0, 100);

      if (matched.length === 0) {
        userSel.innerHTML = `<option value="">-- Không tìm thấy độc giả --</option>`;
      } else {
        userSel.innerHTML = matched.map(u => `<option value="${u.id}">${u.cardCode} - ${u.fullName} (${u.group})</option>`).join('');
      }
    }

    function filterDirectBorrowBooks(keyword = '') {
      const bookSel = document.getElementById('directBorrowBookSelect');
      if (!bookSel) return;
      const cleanK = removeVietnameseTones(keyword.trim());
      const matched = db.books.filter(b => {
        if (b.available <= 0) return false;
        if (!cleanK) return true;
        return removeVietnameseTones(b.code).includes(cleanK) ||
               removeVietnameseTones(b.title).includes(cleanK) ||
               removeVietnameseTones(b.author).includes(cleanK);
      });
      if (matched.length === 0) {
        bookSel.innerHTML = `<option value="">-- Không tìm thấy sách còn trong kho --</option>`;
      } else {
        bookSel.innerHTML = matched.map(b => `<option value="${b.id}">${b.code} - ${b.title} (Còn ${b.available})</option>`).join('');
      }
    }

    function openAdminCreateBorrowModal() {
      document.getElementById('directBorrowUserFilter').value = '';
      filterDirectBorrowUsers('');
      const bookFilterEl = document.getElementById('directBorrowBookFilter');
      if (bookFilterEl) bookFilterEl.value = '';
      filterDirectBorrowBooks('');

      // Mặc định ngày mượn là hôm nay nhưng cho phép chọn bất kỳ ngày nào trong quá khứ
      const todayStr = new Date().toISOString().split('T')[0];
      const borrowDateInput = document.getElementById('directBorrowDate');
      if (borrowDateInput) borrowDateInput.value = todayStr;

      const due = new Date();
      due.setDate(due.getDate() + 14);
      document.getElementById('directBorrowDueDate').value = due.toISOString().split('T')[0];

      const radBorrowing = document.querySelector('input[name="directBorrowStatus"][value="borrowing"]');
      if (radBorrowing) radBorrowing.checked = true;
      toggleDirectBorrowReturnDateUI();

      document.getElementById('adminBorrowModal').classList.remove('hidden');
    }

    function closeAdminBorrowModal() { document.getElementById('adminBorrowModal').classList.add('hidden'); }

    function toggleDirectBorrowReturnDateUI() {
      const status = document.querySelector('input[name="directBorrowStatus"]:checked')?.value || 'borrowing';
      const wrapper = document.getElementById('directBorrowReturnDateWrapper');
      if (wrapper) {
        wrapper.classList.toggle('hidden', status !== 'returned');
        if (status === 'returned' && !document.getElementById('directBorrowReturnDate').value) {
          document.getElementById('directBorrowReturnDate').value = new Date().toISOString().split('T')[0];
        }
      }
    }

    function setDirectBorrowDueFullYear() {
      const currentYear = db.currentSchoolYear && db.currentSchoolYear !== 'ALL' ? db.currentSchoolYear : '2026-2027';
      const m = currentYear.match(/-(\d{4})$/);
      const endYear = m ? m[1] : '2027';
      const dueDateInput = document.getElementById('directBorrowDueDate');
      if (dueDateInput) {
        dueDateInput.value = `${endYear}-05-31`;
        showToast(`Đã đặt hạn trả đến hết năm học: 31/05/${endYear}`);
      }
    }

    function handleDirectBorrowUserSelected(userId) {
      const u = db.users.find(x => x.id === Number(userId));
      if (u && getUserType(u) === 'teacher') {
        setDirectBorrowDueFullYear();
      }
    }

    async function saveAdminDirectBorrow(e) {
      e.preventDefault();
      const userId = Number(document.getElementById('directBorrowUserSelect').value);
      const bookId = Number(document.getElementById('directBorrowBookSelect').value);
      const borrowDate = document.getElementById('directBorrowDate')?.value || new Date().toISOString().split('T')[0];
      const dueDate = document.getElementById('directBorrowDueDate').value;
      const status = document.querySelector('input[name="directBorrowStatus"]:checked')?.value || 'borrowing';
      const returnDate = status === 'returned' ? (document.getElementById('directBorrowReturnDate')?.value || borrowDate) : null;

      if (!userId) { showNoticeModal('Thiếu thông tin', 'Vui lòng chọn độc giả!'); return; }
      if (!bookId) { showNoticeModal('Thiếu thông tin', 'Vui lòng chọn đầu sách!'); return; }
      if (!dueDate) { showNoticeModal('Thiếu thông tin', 'Vui lòng chọn hạn trả sách!'); return; }

      const book = db.books.find(b => b.id === bookId);
      if (!book) { showNoticeModal('Lỗi', 'Không tìm thấy thông tin sách!'); return; }

      const activeYear = db.currentSchoolYear && db.currentSchoolYear !== 'ALL' ? db.currentSchoolYear : '2026-2027';
      const actorName = db.currentUser ? `${db.currentUser.fullName} (${db.currentUser.username || 'Admin'})` : 'Thủ thư';

      if (isCloudConnected && supabaseClient) {
        try {
          const { data: res, error } = await supabaseClient.rpc('staff_create_borrow_atomic', {
            p_reader_id: userId,
            p_book_id: bookId,
            p_borrow_date: borrowDate,
            p_due_date: dueDate,
            p_return_date: returnDate,
            p_status: status,
            p_school_year: activeYear,
            p_ticket_code: null,
            p_processed_by_name: actorName
          });
          if (error || !res || !res.success) {
            showNoticeModal('Lỗi lập phiếu', error?.message || res?.error || 'Không thể lưu phiếu mượn lên Cloud!');
            return;
          }
          book.available = Number(res.remaining_available);
          db.borrows.unshift(res.borrow);
          await saveDB('ALL');
          closeAdminBorrowModal();
          showToast(status === 'returned' ? 'Đã lưu phiếu mượn trả trong quá khứ thành công!' : 'Đã lập phiếu mượn sách thành công!');
          return;
        } catch (err) {
          showNoticeModal('Lỗi lập phiếu', err.message || 'Không thể kết nối Cloud!');
          return;
        }
      }

      // Nếu là phiếu Đang mượn: trừ tồn kho sách sẵn có (Offline)
      if (status === 'borrowing') {
        if (book.available <= 0) {
          showNoticeModal('Hết sách', `Sách "${book.title}" hiện đã hết bản có sẵn trong kho (0/${book.total})!`);
          return;
        }
        book.available -= 1;
      }

      db.borrows.unshift({
       id: Date.now(),
       ticketCode: 'PM-' + Math.floor(1000 + Math.random() * 9000),
       userId,
       bookId,
       schoolYear: activeYear,
       borrowDate,
       dueDate,
       returnDate,
       status,
       processedBy: actorName
     });

      await saveDB('ALL');
      closeAdminBorrowModal();
      showToast(status === 'returned' ? 'Đã lưu phiếu mượn trả trong quá khứ thành công!' : 'Đã lập phiếu mượn sách thành công!');
    }

