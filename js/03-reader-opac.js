    // ==================== RENDER VIEWS ====================
    function updateDynamicBookCategories() {
     const defaultCats = ['Tin học & CNTT', 'Khoa học tự nhiên', 'Văn học & Nghệ thuật', 'Kỹ năng & Kinh tế', 'Sách giáo khoa', 'Sách tham khảo'];
     const catSet = new Set(defaultCats);
     (db.books || []).forEach(b => {
       if (b.category && String(b.category).trim()) catSet.add(String(b.category).trim());
     });
     const allCats = Array.from(catSet);
  
     const filterEl = document.getElementById('publicCategoryFilter');
       if (filterEl) {
       const currentVal = filterEl.value || 'ALL';
        filterEl.innerHTML = `<option value="ALL">Tất cả thể loại (${allCats.length})</option>` +
       allCats.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
       }

     const dataListEl = document.getElementById('bookCategoryDataList');
       if (dataListEl) {
         dataListEl.innerHTML = allCats.map(c => `<option value="${c}"></option>`).join('');
       }
    }

   function renderPublicBooks() {
     updateDynamicBookCategories();
     const query = (document.getElementById('publicSearchInput')?.value || '').trim();
     const cleanQ = removeVietnameseTones(query);
     const cat = document.getElementById('publicCategoryFilter')?.value || 'ALL';
     const status = document.getElementById('publicStatusFilter')?.value || 'ALL';
     const featuredList = db.books.filter(b => b.featured).slice(0, 4);
      document.getElementById('featuredBooksGrid').innerHTML = featuredList.map(b => createBookCardHTML(b, true)).join('');

      const filtered = db.books.filter(b => {
        const normTitle = removeVietnameseTones(b.title);
        const normAuthor = removeVietnameseTones(b.author);
        const normCode = removeVietnameseTones(b.code);
        const matchQuery = cleanQ === '' || normTitle.includes(cleanQ) || normAuthor.includes(cleanQ) || normCode.includes(cleanQ);
        const matchCat = cat === 'ALL' || b.category === cat;
        const matchStatus = status === 'ALL' || (status === 'AVAILABLE' ? b.available > 0 : b.available <= 0);
        return matchQuery && matchCat && matchStatus;
      });

      document.getElementById('publicBookCount').textContent = `${filtered.length} đầu sách`;
      if (filtered.length === 0) {
        document.getElementById('publicBooksGrid').innerHTML = `
          <div class="col-span-full py-12 text-center text-slate-400">
            <i class="ph ph-magnifying-glass text-3xl mb-2 block"></i>
            Không có cuốn sách nào khớp với điều kiện tìm kiếm của bạn.
          </div>
        `;
      } else {
        document.getElementById('publicBooksGrid').innerHTML = filtered.map(b => createBookCardHTML(b, false)).join('');
      }
    }

    function createBookCardHTML(book, isFeatured) {
      const availBadge = book.available > 0
        ? `<span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Còn ${book.available}/${book.total} bản</span>`
        : `<span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-rose-50 text-rose-600 border border-rose-200">Tạm hết</span>`;

      return `
        <div class="bg-white rounded-2xl border ${isFeatured ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'} p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${book.code}</span>
              ${availBadge}
            </div>
            <h4 class="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">${book.title}</h4>
            <p class="text-xs text-slate-500 mt-1">${book.author}</p>
            <div class="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
              <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">${book.category}</span>
              <span>• ${book.shelf || 'Kệ A'}</span>
            </div>
          </div>
          <div class="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button onclick="openBookDetailModal(${book.id})" class="w-full py-2 rounded-xl text-xs font-semibold ${book.available > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'} transition flex items-center justify-center gap-1.5">
              <i class="ph-bold ph-hand-pointing"></i> ${book.available > 0 ? 'Chi tiết & Đăng ký mượn' : 'Xem thông tin'}
            </button>
          </div>
        </div>
      `;
    }

    function openBookDetailModal(bookId) {
      const book = db.books.find(b => b.id === bookId);
      if (!book) return;
      selectedBookForBorrow = book;

      document.getElementById('detailBookCategory').textContent = book.category;
      document.getElementById('detailBookTitle').textContent = book.title;
      document.getElementById('detailBookAuthor').textContent = `Tác giả: ${book.author}`;
      document.getElementById('detailBookCode').textContent = book.code;
      document.getElementById('detailBookShelf').textContent = book.shelf || 'Chưa xếp kệ';
      document.getElementById('detailBookPublisher').textContent = book.publisher || 'Đang cập nhật';
      document.getElementById('detailBookYear').textContent = book.publishYear || '---';
      document.getElementById('detailBookPages').textContent = book.pages ? `${book.pages} trang` : '---';
      document.getElementById('detailBookStock').textContent = `${book.available} / ${book.total} cuốn sẵn sàng`;
      document.getElementById('detailBookDesc').textContent = book.desc || 'Chưa có mô tả chi tiết cho đầu sách này.';

      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 14);
      document.getElementById('onlineBorrowDueDate').value = defaultDue.toISOString().split('T')[0];

      const btn = document.getElementById('btnConfirmOnlineBorrow');
      if (book.available <= 0) {
        btn.disabled = true;
        btn.className = 'w-full py-2.5 bg-slate-200 text-slate-500 font-semibold rounded-xl text-sm cursor-not-allowed';
        btn.innerHTML = 'Sách hiện đã hết bản có sẵn';
      } else {
        btn.disabled = false;
        btn.className = 'w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md';
        btn.innerHTML = db.currentUser
          ? `<i class="ph-bold ph-paper-plane-tilt"></i> Đặt mượn với thẻ (${db.currentUser.cardCode || 'Admin'})`
          : `<i class="ph-bold ph-sign-in"></i> Đăng nhập để Đặt mượn Online`;
      }

      document.getElementById('bookDetailModal').classList.remove('hidden');
    }

    function closeBookDetailModal() {
      document.getElementById('bookDetailModal').classList.add('hidden');
    }

    async function confirmOnlineBorrow() {
      if (!selectedBookForBorrow) return;

      if (!db.currentUser) {
        closeBookDetailModal();
        openAuthModal('login');
        showToast('Vui lòng đăng nhập thẻ độc giả để đăng ký mượn sách!');
        return;
      }

      const dueDate = document.getElementById('onlineBorrowDueDate').value;
      if (!dueDate) { showNoticeModal('Thiếu thông tin', 'Vui lòng chọn hạn trả dự kiến!'); return; }

      const activeYear = db.currentSchoolYear && db.currentSchoolYear !== 'ALL' ? db.currentSchoolYear : '2026-2027';

      if (isCloudConnected && supabaseClient) {
        if (db.currentUser.role === 'reader') {
          const cred = getSavedReaderCred();
          const { data: res, error } = await supabaseClient.rpc('reader_borrow_online', {
            p_reader_id: db.currentUser.id,
            p_password_hash: cred?.passHash || '',
            p_plain_is_default: Boolean(cred?.isDefaultInput),
            p_book_id: selectedBookForBorrow.id,
            p_due_date: dueDate,
            p_school_year: activeYear
          });
          if (error || !res || !res.success) {
            showNoticeModal('Không thể đặt mượn', res?.error || error?.message || 'Rất tiếc, cuốn sách này vừa hết bản trong kho!');
            return;
          }
          const book = db.books.find(b => b.id === selectedBookForBorrow.id);
          if (book) book.available = Number(res.remaining_available);
          db.borrows.unshift(res.borrow);
          renderAll();
          closeBookDetailModal();
          showToast(`Đã gửi phiếu đặt mượn ${res.borrow.ticketCode}! Chờ Thủ thư duyệt.`);
          return;
        }
      }

      if (isCloudConnected) await syncFromCloud(false);

      let readerId = db.currentUser.id;
      if (db.currentUser.role === 'admin') {
        readerId = db.users[0]?.id;
      }

      const book = db.books.find(b => b.id === selectedBookForBorrow.id);
      if (!book || book.available <= 0) { showNoticeModal('Hết sách', 'Rất tiếc, cuốn sách này vừa hết bản trong kho!'); return; }

      book.available -= 1;
      const ticketCode = 'ONL-' + Math.floor(1000 + Math.random() * 9000);
      db.borrows.unshift({
        id: Date.now(),
        ticketCode,
        userId: readerId,
        bookId: book.id,
        schoolYear: activeYear,
        borrowDate: new Date().toISOString().split('T')[0],
        dueDate,
        returnDate: null,
        status: 'pending'
      });

      await saveDB('ALL');
      closeBookDetailModal();
      showToast(`Đã gửi phiếu đặt mượn ${ticketCode}! Chờ Thủ thư duyệt.`);
    }

    function renderReaderProfile() {
      if (!db.currentUser) return;

      let activeReader = db.users.find(u => u.id === db.currentUser.id || u.cardCode === db.currentUser.cardCode) || db.users[0];
      if (!activeReader) return;

      document.getElementById('profileFullName').textContent = activeReader.fullName;
      const isTeacher = getUserType(activeReader) === 'teacher';
      const cohort = getUserCohort(activeReader, db.currentSchoolYear);
      document.getElementById('profileGroup').textContent = isTeacher 
        ? `Tổ / Đơn vị: ${activeReader.group} • Cán bộ - Giáo viên`
        : `Lớp: ${activeReader.group} • Niên khóa: ${cohort}`;
      document.getElementById('profileCardCode').textContent = activeReader.cardCode;
      renderBarcodeSvg('#profileBarcodeSvg', activeReader.cardCode, { height: 42, fontSize: 12, margin: 2 });
      document.getElementById('profileEmail').textContent = activeReader.email || 'Chưa cập nhật Email';
      document.getElementById('profilePhone').textContent = activeReader.phone || 'Chưa cập nhật SĐT';
      document.getElementById('readerFineRateLabel').textContent = (db.finePerDay || 5000).toLocaleString('vi-VN');

      const myBorrows = db.borrows.filter(b => b.userId === activeReader.id);
      const activeCount = myBorrows.filter(b => b.status === 'borrowing' || b.status === 'pending').length;
      const overdueCount = myBorrows.filter(b => isOverdue(b)).length;
      const returnedCount = myBorrows.filter(b => b.status === 'returned').length;

      document.getElementById('readerStatActive').textContent = activeCount;
      document.getElementById('readerStatOverdue').textContent = overdueCount;
      const retEl = document.getElementById('readerStatReturned');
      if (retEl) retEl.textContent = returnedCount;
      
      const badge = document.getElementById('readerBadgeCount');
      if (activeCount > 0) {
        badge.textContent = activeCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }

      const tbody = document.getElementById('readerBorrowTableBody');
      if (myBorrows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Bạn chưa có lịch sử mượn sách nào.</td></tr>`;
        return;
      }

      tbody.innerHTML = myBorrows.map(b => {
        const book = db.books.find(x => x.id === b.bookId) || { title: 'Sách đã xóa', code: '---' };
        const overdueDays = getOverdueDays(b)
        let badgeHTML = '';
        if (b.status === 'pending') badgeHTML = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Chờ Thủ thư duyệt</span>`;
        else if (b.status === 'returned') badgeHTML = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã trả (${b.returnDate})</span>`;
        else if (overdueDays > 0) badgeHTML = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">Quá hạn</span>`;
        else badgeHTML = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Đang mượn</span>`;

        let cancelBtn = `<span class="text-xs text-slate-400">---</span>`;
        if (b.status === 'pending') {
          cancelBtn = `<button onclick="cancelPendingBorrow(${b.id})" class="text-xs font-semibold text-rose-600 hover:underline">Hủy đăng ký</button>`;
        } else if (b.status === 'borrowing' && overdueDays === 0 && !b.renewed) {
          cancelBtn = `<button onclick="renewBorrowTicket(${b.id})" class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition">+ Gia hạn 7 ngày</button>`;
        } else if (b.renewed) {
          cancelBtn = `<span class="text-[11px] font-semibold text-emerald-600">Đã gia hạn</span>`;
        }

        return `
          <tr class="hover:bg-slate-50">
            <td class="py-3.5 px-4 font-mono font-bold text-xs text-slate-700">${b.ticketCode}</td>
            <td class="py-3.5 px-4">
              <p class="font-semibold text-slate-800">${book.title}</p>
              <span class="text-xs text-slate-400 font-mono">${book.code}</span>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-600">${b.borrowDate}</td>
            <td class="py-3.5 px-4 text-xs font-semibold text-slate-700">${b.dueDate}</td>
            <td class="py-3.5 px-4">${badgeHTML}</td>
            <td class="py-3.5 px-4 text-xs font-bold ${overdueDays > 0 ? 'text-rose-600' : 'text-emerald-600'}">${b.status === 'returned' ? 'Hoàn tất' : (overdueDays > 0 ? `Trễ ${overdueDays} ngày` : 'Đúng hạn')}</td>
            <td class="py-3.5 px-4 text-right">${cancelBtn}</td>
          </tr>
        `;
      }).join('');
    }

    async function cancelPendingBorrow(borrowId) {
      const idx = db.borrows.findIndex(b => b.id === borrowId && b.status === 'pending');
      if (idx === -1) return;

      if (isCloudConnected && supabaseClient && db.currentUser?.role === 'reader') {
        const cred = getSavedReaderCred();
        const { data: res, error } = await supabaseClient.rpc('reader_cancel_pending_borrow', {
          p_reader_id: db.currentUser.id,
          p_password_hash: cred?.passHash || '',
          p_plain_is_default: Boolean(cred?.isDefaultInput),
          p_borrow_id: borrowId
        });
        if (error || !res || !res.success) {
          showNoticeModal('Không thể hủy phiếu', res?.error || error?.message || 'Lỗi kết nối Cloud!');
          return;
        }
        const book = db.books.find(b => b.id === db.borrows[idx].bookId);
        if (book) book.available = Math.min(book.total, book.available + 1);
        db.borrows.splice(idx, 1);
        renderAll();
        showToast('Đã hủy phiếu đăng ký mượn online.');
        return;
      }

      const book = db.books.find(b => b.id === db.borrows[idx].bookId);
      if (book) book.available += 1;
      db.borrows.splice(idx, 1);
      await saveDB('ALL');
      showToast('Đã hủy phiếu đăng ký mượn online.');
    }

    function changeGlobalSchoolYear(selectedYear) {
      db.currentSchoolYear = selectedYear;
      adminUserPage = 1;
      renderAll();
      showToast(`Đã chuyển bộ lọc hoạt động sang: Năm học ${selectedYear}`);
    }

