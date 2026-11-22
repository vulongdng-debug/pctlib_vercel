    // ==================== ADMIN DASHBOARD ====================
    // ==================== CÔNG CỤ THỐNG KÊ & BÁO CÁO THỦ THƯ ====================
    function renderAdminDeepStats() {
      const period = document.getElementById('statsPeriodFilter')?.value || 'CURRENT_YEAR';
      const currentYear = db.currentSchoolYear || '2026-2027';
      const today = new Date();
      const currentMonthStr = today.toISOString().slice(0, 7);

      const filteredBorrows = db.borrows.filter(b => {
        if (period === 'CURRENT_YEAR' && currentYear !== 'ALL') return (b.schoolYear || '2026-2027') === currentYear;
        if (period === 'THIS_MONTH') return b.borrowDate && b.borrowDate.startsWith(currentMonthStr);
        if (period === 'OVERDUE_ONLY') return isOverdue(b);
        return true;
      });

      const totalCopies = db.books.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      const activeBorrowCount = db.borrows.filter(b => b.status === 'borrowing').length;
      const circulationRate = totalCopies > 0 ? ((activeBorrowCount / totalCopies) * 100).toFixed(1) : 0;

      const returnedBorrows = filteredBorrows.filter(b => b.status === 'returned');
      const onTimeReturns = returnedBorrows.filter(b => !b.returnDate || !b.dueDate || new Date(b.returnDate) <= new Date(b.dueDate)).length;
      const onTimeRate = returnedBorrows.length > 0 ? ((onTimeReturns / returnedBorrows.length) * 100).toFixed(1) : 100;

      const activeUserIds = new Set(filteredBorrows.map(b => b.userId));

      const elCirc = document.getElementById('statCirculationRate');
      if (elCirc) elCirc.textContent = `${circulationRate}%`;
      const elCircSub = document.getElementById('statCirculationSub');
      if (elCircSub) elCircSub.textContent = `${activeBorrowCount} / ${totalCopies} bản in đang lưu hành`;

      const elOnTime = document.getElementById('statOnTimeRate');
      if (elOnTime) elOnTime.textContent = `${onTimeRate}%`;
      const elOnTimeSub = document.getElementById('statOnTimeSub');
      if (elOnTimeSub) elOnTimeSub.textContent = `${onTimeReturns}/${returnedBorrows.length} phiếu trả đúng hạn`;

      const elTotalTurns = document.getElementById('statTotalBorrowTurns');
      if (elTotalTurns) elTotalTurns.textContent = filteredBorrows.length.toLocaleString('vi-VN');

      const elActiveReaders = document.getElementById('statActiveReadersCount');
      if (elActiveReaders) elActiveReaders.textContent = activeUserIds.size.toLocaleString('vi-VN');
      const elActiveReadersSub = document.getElementById('statActiveReadersSub');
      if (elActiveReadersSub) elActiveReadersSub.textContent = `Trên tổng ${db.users.length} bạn đọc`;

      // Top Sách
      const bookBorrowMap = {};
      filteredBorrows.forEach(b => { bookBorrowMap[b.bookId] = (bookBorrowMap[b.bookId] || 0) + 1; });
      const topBooks = Object.keys(bookBorrowMap).map(id => ({ book: db.books.find(x => x.id == id), count: bookBorrowMap[id] })).filter(x => x.book).sort((a, b) => b.count - a.count).slice(0, 5);
      const maxBookCount = topBooks.length > 0 ? topBooks[0].count : 1;
      const topBooksContainer = document.getElementById('statTopBooksList');
      if (topBooksContainer) {
        topBooksContainer.innerHTML = topBooks.length === 0 ? '<div class="py-8 text-center text-xs text-slate-400">Chưa có dữ liệu mượn sách trong kỳ này.</div>' : topBooks.map((item, idx) => `
          <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-6 h-6 rounded-lg ${idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'} flex items-center justify-center font-bold text-xs shrink-0">${idx + 1}</span>
              <div class="min-w-0"><p class="font-bold text-slate-900 truncate">${item.book.title}</p><p class="text-[11px] text-slate-500">${item.book.author} • <span class="text-blue-700 font-mono">${item.book.code}</span></p></div>
            </div>
            <div class="text-right shrink-0 w-28"><span class="font-bold text-blue-700 text-xs">${item.count} lượt</span><div class="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden"><div class="bg-blue-600 h-full rounded-full" style="width: ${Math.round((item.count/maxBookCount)*100)}%"></div></div></div>
          </div>
        `).join('');
      }

      // Top Bạn Đọc
      const userBorrowMap = {};
      filteredBorrows.forEach(b => { userBorrowMap[b.userId] = (userBorrowMap[b.userId] || 0) + 1; });
      const topUsers = Object.keys(userBorrowMap).map(id => ({ user: db.users.find(u => u.id == id), count: userBorrowMap[id] })).filter(x => x.user).sort((a, b) => b.count - a.count).slice(0, 5);
      const maxUserCount = topUsers.length > 0 ? topUsers[0].count : 1;
      const topUsersContainer = document.getElementById('statTopReadersList');
      if (topUsersContainer) {
        topUsersContainer.innerHTML = topUsers.length === 0 ? '<div class="py-8 text-center text-xs text-slate-400">Chưa có dữ liệu bạn đọc trong kỳ này.</div>' : topUsers.map((item, idx) => `
          <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0">${idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`))}</span>
              <div class="min-w-0"><p class="font-bold text-slate-900 truncate">${item.user.fullName}</p><p class="text-[11px] text-slate-500">Lớp: <strong>${item.user.group}</strong> • Mã: <span class="font-mono text-indigo-700">${item.user.cardCode}</span></p></div>
            </div>
            <div class="text-right shrink-0 w-28"><span class="font-bold text-indigo-700 text-xs">${item.count} cuốn</span><div class="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden"><div class="bg-indigo-600 h-full rounded-full" style="width: ${Math.round((item.count/maxUserCount)*100)}%"></div></div></div>
          </div>
        `).join('');
      }

      // Thể loại & Khối lớp
      const catCountMap = {};
      filteredBorrows.forEach(b => { const bk = db.books.find(x => x.id === b.bookId); const cat = bk ? bk.category : 'Khác'; catCountMap[cat] = (catCountMap[cat] || 0) + 1; });
      const catTotal = Object.values(catCountMap).reduce((s, v) => s + v, 0) || 1;
      const catContainer = document.getElementById('statCategoryBars');
      if (catContainer) {
        catContainer.innerHTML = Object.keys(catCountMap).sort((a,b)=>catCountMap[b]-catCountMap[a]).map(cat => `
          <div><div class="flex items-center justify-between text-xs font-semibold mb-1"><span class="text-slate-700">${cat}</span><span class="text-indigo-700 font-bold">${catCountMap[cat]} lượt (${Math.round((catCountMap[cat]/catTotal)*100)}%)</span></div><div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div class="bg-indigo-600 h-full rounded-full" style="width: ${Math.round((catCountMap[cat]/catTotal)*100)}%"></div></div></div>
        `).join('');
      }

      const gradeCountMap = { 'Khối 10': 0, 'Khối 11': 0, 'Khối 12': 0, 'Giáo viên': 0, 'Khác': 0 };
      filteredBorrows.forEach(b => {
        const u = db.users.find(x => x.id === b.userId);
        const grp = u ? (u.group || '') : '';
        if (/^10/.test(grp)) gradeCountMap['Khối 10']++;
        else if (/^11/.test(grp)) gradeCountMap['Khối 11']++;
        else if (/^12/.test(grp)) gradeCountMap['Khối 12']++;
        else if (grp.includes('Tổ') || grp.includes('học') || /^(GV|Tin|Toán|Văn|Anh|Lý|Hóa)/i.test(grp)) gradeCountMap['Giáo viên']++;
        else gradeCountMap['Khác']++;
      });
      const gradeTotal = filteredBorrows.length || 1;
      const gradeContainer = document.getElementById('statGradeBars');
      if (gradeContainer) {
        gradeContainer.innerHTML = Object.keys(gradeCountMap).map(k => `
          <div><div class="flex items-center justify-between text-xs font-semibold mb-1"><span class="text-slate-700">${k}</span><span class="text-emerald-700 font-bold">${gradeCountMap[k]} lượt (${Math.round((gradeCountMap[k]/gradeTotal)*100)}%)</span></div><div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div class="bg-emerald-600 h-full rounded-full" style="width: ${Math.round((gradeCountMap[k]/gradeTotal)*100)}%"></div></div></div>
        `).join('');
      }

      // Danh sách quá hạn
      const overdueList = db.borrows.filter(b => isOverdue(b));
      const badgeOverdue = document.getElementById('statOverdueBadgeCount');
      if (badgeOverdue) badgeOverdue.textContent = `${overdueList.length} phiếu quá hạn`;
      const tbodyOverdue = document.getElementById('statOverdueTableBody');
      if (tbodyOverdue) {
        tbodyOverdue.innerHTML = overdueList.length === 0 ? '<tr><td colspan="7" class="py-8 text-center text-xs text-emerald-700 font-medium">Tuyệt vời! Hiện không có cuốn sách nào bị trễ hạn hoàn trả.</td></tr>' : overdueList.map(b => {
          const u = db.users.find(x => x.id === b.userId) || { fullName: 'Đã xóa', cardCode: '---', group: '---' };
          const bk = db.books.find(x => x.id === b.bookId) || { title: 'Đã xóa', code: '---' };
          const dueDays = Math.max(1, Math.floor((new Date() - new Date(b.dueDate)) / (1000 * 60 * 60 * 24)));
          return `
            <tr class="hover:bg-rose-50/50 text-xs">
              <td class="py-3 px-4 font-mono font-bold text-rose-700">${b.ticketCode}</td>
              <td class="py-3 px-4"><p class="font-bold text-slate-800">${u.fullName}</p><p class="text-[11px] text-slate-500">Lớp: ${u.group} • Mã: ${u.cardCode}</p></td>
              <td class="py-3 px-4"><p class="font-semibold text-slate-900">${bk.title}</p><p class="text-[11px] font-mono text-slate-400">${bk.code}</p></td>
              <td class="py-3 px-4 text-slate-600">${b.borrowDate} → <strong class="text-rose-700">${b.dueDate}</strong></td>
              <td class="py-3 px-4 text-center font-bold text-rose-600">Trễ ${dueDays} ngày</td>
              <td class="py-3 px-4 font-semibold text-rose-700">Quá hạn trả</td>
              <td class="py-3 px-4 text-right space-x-1.5">
                <button onclick="markBorrowReturned(${b.id})" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px]">Thu hồi trả</button>
                <button onclick="sendOverdueEmail(${b.id})" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-semibold text-[11px]">Gửi Email</button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    function exportStatsReportExcel() {
      if (!window.XLSX) return;
      const currentYear = db.currentSchoolYear || '2026-2027';
      const wb = XLSX.utils.book_new();
      const totalCopies = db.books.reduce((s, b) => s + (Number(b.total) || 0), 0);
      const activeBorrow = db.borrows.filter(b => b.status === 'borrowing').length;
      const overdueList = db.borrows.filter(b => isOverdue(b));

      const overviewData = [
        { ChiTieu: 'BÁO CÁO THỐNG KÊ HOẠT ĐỘNG Thư viện trường THPT Phan Châu Trinh', GiaTri: '' },
        { ChiTieu: 'Năm học báo cáo', GiaTri: currentYear },
        { ChiTieu: 'Ngày xuất báo cáo', GiaTri: new Date().toLocaleDateString('vi-VN') },
        { ChiTieu: 'Tổng số đầu sách trong kho', GiaTri: db.books.length },
        { ChiTieu: 'Tổng số bản in tài liệu', GiaTri: totalCopies },
        { ChiTieu: 'Số bản in đang phục vụ bạn đọc', GiaTri: activeBorrow },
        { ChiTieu: 'Tỷ lệ sách đang lưu hành', GiaTri: ((activeBorrow / (totalCopies || 1)) * 100).toFixed(1) + '%' },
        { ChiTieu: 'Tổng số bạn đọc đã cấp thẻ', GiaTri: db.users.length },
        { ChiTieu: 'Tổng số lượt mượn sách', GiaTri: db.borrows.length },
        { ChiTieu: 'Số lượt mượn quá hạn', GiaTri: overdueList.length }
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewData), 'Tong_Quan');

      const bookBorrowMap = {};
      db.borrows.forEach(b => { bookBorrowMap[b.bookId] = (bookBorrowMap[b.bookId] || 0) + 1; });
      const topBooks = Object.keys(bookBorrowMap).map(id => {
        const bk = db.books.find(x => x.id == id);
        return { MaSach: bk ? bk.code : '---', TenSach: bk ? bk.title : '---', TheLoai: bk ? bk.category : '---', SoLuotMuon: bookBorrowMap[id] };
      }).sort((a,b)=>b.SoLuotMuon - a.SoLuotMuon);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topBooks), 'Top_Sach');

      const userBorrowMap = {};
      db.borrows.forEach(b => { userBorrowMap[b.userId] = (userBorrowMap[b.userId] || 0) + 1; });
      const topUsers = Object.keys(userBorrowMap).map(id => {
        const u = db.users.find(x => x.id == id);
        return { MaThe: u ? u.cardCode : '---', HoVaTen: u ? u.fullName : '---', Lop: u ? u.group : '---', SoCuonDaMuon: userBorrowMap[id] };
      }).sort((a,b)=>b.SoCuonDaMuon - a.SoCuonDaMuon);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topUsers), 'Top_Doc_Gia');

      XLSX.writeFile(wb, `SmartLib_Bao_Cao_${currentYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('Đã xuất báo cáo thống kê đầy đủ ra file Excel!');
    }

    function hasAdminPermission(permKey) {
      if (!db.currentUser || db.currentUser.role !== 'admin') return false;
      if (db.currentUser.isSuperAdmin !== false && !db.currentUser.isStaff) return true;
      const perms = db.currentUser.permissions || {};
      return Boolean(perms[permKey]);
    }

    function switchAdminTab(tab) {
      if (tab === 'staff') {
        const isSuperAdmin = db.currentUser && db.currentUser.role === 'admin' && (db.currentUser.isSuperAdmin !== false && !db.currentUser.isStaff);
        if (!isSuperAdmin) {
          showNoticeModal('Từ chối truy cập', 'Mục Phân quyền & Quản lý Thủ thư chỉ dành riêng cho Quản trị trưởng (Super Admin)!');
          return;
        }
      } else if (!hasAdminPermission(tab)) {
        showNoticeModal('Chưa được phân quyền', 'Tài khoản của bạn chưa được cấp quyền sử dụng mục này! Vui lòng liên hệ Quản trị trưởng.');
        return;
      }

      ['books', 'users', 'borrows', 'scanner', 'stats', 'staff'].forEach(t => {
        const panel = document.getElementById(`admin-tab-${t}`);
        if (panel) panel.classList.toggle('hidden', t !== tab);
        const btn = document.getElementById(`admin-tab-btn-${t}`);
        if (!btn) return;
        if (t === 'scanner') {
          btn.className = t === tab ? 'px-4 py-2.5 text-sm font-bold border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50 rounded-t-xl flex items-center gap-2' : 'px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-emerald-700 hover:text-emerald-900 bg-emerald-50/60 rounded-t-xl flex items-center gap-2';
        } else if (t === 'stats') {
          btn.className = t === tab ? 'px-4 py-2.5 text-sm font-bold border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50 rounded-t-xl flex items-center gap-2' : 'px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-indigo-700 hover:text-indigo-900 bg-indigo-50/60 rounded-t-xl flex items-center gap-2';
        } else if (t === 'staff') {
          btn.className = t === tab ? 'px-4 py-2.5 text-sm font-bold border-b-2 border-purple-600 text-purple-700 bg-purple-50 rounded-t-xl flex items-center gap-2' : 'px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-purple-700 hover:text-purple-900 bg-purple-50/60 rounded-t-xl flex items-center gap-2';
        } else {
          btn.className = t === tab ? 'px-4 py-2.5 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 flex items-center gap-2' : 'px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-slate-600 hover:text-slate-900 flex items-center gap-2';
        }
      });
      if (tab === 'scanner') {
        renderPosScannerStation();
        updateSecurityModalUI();
        setTimeout(focusScannerInput, 80);
      } else if (tab === 'stats') {
        renderAdminDeepStats();
      } else if (tab === 'staff') {
        renderAdminStaffList();
      }
    }

    function renderAdminStats() {
      const currentYear = db.currentSchoolYear || '2026-2027';

      const activeUsers = db.users.filter(u => currentYear === 'ALL' || (u.schoolYear || '2026-2027') === currentYear);
      const activeBorrowsList = db.borrows.filter(b => currentYear === 'ALL' || (b.schoolYear || '2026-2027') === currentYear);

      const totalTitles = db.books.length;
      const totalCopies = db.books.reduce((s, b) => s + Number(b.total || 0), 0);
      const availCopies = db.books.reduce((s, b) => s + Number(b.available || 0), 0);
      
      const activeBorrows = activeBorrowsList.filter(b => b.status === 'borrowing' || b.status === 'pending').length;
      const pendingBorrows = activeBorrowsList.filter(b => b.status === 'pending').length;
      const overdueBorrows = activeBorrowsList.filter(b => isOverdue(b)).length;
      const totalFine = activeBorrowsList.reduce((sum, b) => sum + calculateFine(b), 0);

      document.getElementById('statTotalBooks').textContent = `${totalTitles} / ${totalCopies}`;
      document.getElementById('statAvailableBooks').textContent = `Còn ${availCopies} bản sẵn sàng`;
      document.getElementById('statTotalUsers').textContent = `${activeUsers.length} độc giả`;
      document.getElementById('statTotalUsersSub').textContent = `Năm học: ${currentYear} (Tổng toàn trường: ${db.users.length})`;
      document.getElementById('statActiveBorrows').textContent = activeBorrows;
      document.getElementById('statPendingBorrows').textContent = `${pendingBorrows} phiếu chờ duyệt online`;
      document.getElementById('statOverdueCount').textContent = `${overdueBorrows} phiếu`;
      document.getElementById('statTotalFine').textContent = overdueBorrows > 0 ? 'Cần nhắc nhở hoàn trả' : 'Không có phiếu trễ hạn';
    }

    function renderAdminBooks() {
      let q = (document.getElementById('adminBookSearch')?.value || '').toLowerCase().trim();
      if (q === 'null' || q === 'undefined') q = '';
      const filtered = db.books.filter(b => b.title.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));

      const totalItems = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / booksPerPage));
      if (adminBookPage > totalPages) adminBookPage = totalPages;
      if (adminBookPage < 1) adminBookPage = 1;

      const startIdx = (adminBookPage - 1) * booksPerPage;
      const pageItems = filtered.slice(startIdx, startIdx + booksPerPage);

      const infoEl = document.getElementById('adminBookPaginationInfo');
      if (infoEl) {
        infoEl.innerHTML = totalItems > 0
          ? `Hiển thị <strong>${startIdx + 1} - ${Math.min(startIdx + booksPerPage, totalItems)}</strong> trên tổng <strong>${totalItems}</strong> đầu sách`
          : `Không có sách nào khớp bộ lọc`;
      }
      const pageIndicator = document.getElementById('adminBookPageIndicator');
      if (pageIndicator) pageIndicator.textContent = `Trang ${adminBookPage}/${totalPages}`;
      const prevBtn = document.getElementById('btnPrevBookPage');
      if (prevBtn) prevBtn.disabled = adminBookPage <= 1;
      const nextBtn = document.getElementById('btnNextBookPage');
      if (nextBtn) nextBtn.disabled = adminBookPage >= totalPages;

      // Đồng bộ trạng thái ô tích chọn tất cả trên trang hiện tại
      const allPageChecked = pageItems.length > 0 && pageItems.every(b => selectedAdminBookIds.has(Number(b.id)));
      const selectAllEl = document.getElementById('selectAllAdminBooks');
      if (selectAllEl) {
        selectAllEl.checked = allPageChecked;
        selectAllEl.indeterminate = !allPageChecked && pageItems.some(b => selectedAdminBookIds.has(Number(b.id)));
      }

      document.getElementById('adminBookTableBody').innerHTML = pageItems.map(b => {
        const isChecked = selectedAdminBookIds.has(Number(b.id));
        return `
          <tr class="hover:bg-slate-50 ${isChecked ? 'bg-blue-50/40' : ''}">
            <td class="py-3.5 px-3 text-center">
              <input type="checkbox" class="admin-book-chk w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer" value="${b.id}" onchange="toggleAdminBookSelect(${b.id}, this.checked)" ${isChecked ? 'checked' : ''} />
            </td>
            <td class="py-3.5 px-4 font-mono font-bold text-xs text-blue-700">${b.code}</td>
            <td class="py-3.5 px-4">
              <p class="font-semibold text-slate-800">${b.title}</p>
              <p class="text-xs text-slate-500">${b.author} ${b.publisher ? '• ' + b.publisher : ''}</p>
            </td>
            <td class="py-3.5 px-4 text-xs font-medium text-slate-600">${b.category}</td>
            <td class="py-3.5 px-4 text-xs text-slate-600">${b.shelf || '---'}</td>
            <td class="py-3.5 px-4 text-center font-bold text-xs ${b.available > 0 ? 'text-emerald-600' : 'text-rose-600'}">${b.available} / ${b.total}</td>
            <td class="py-3.5 px-4 text-right space-x-2">
              <button onclick="openBookModal(${b.id})" class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100">Sửa</button>
              <button onclick="deleteBook(${b.id})" class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100">Xóa</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function toggleAdminBookSelect(bookId, isChecked) {
      const idNum = Number(bookId);
      if (isChecked) {
        selectedAdminBookIds.add(idNum);
      } else {
        selectedAdminBookIds.delete(idNum);
      }
      renderAdminBooks();
      updateAdminBookSelectionUI();
    }

    function toggleSelectAllAdminBooks(chk) {
      let q = (document.getElementById('adminBookSearch')?.value || '').toLowerCase().trim();
      if (q === 'null' || q === 'undefined') q = '';
      const filtered = db.books.filter(b => b.title.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
      const startIdx = (adminBookPage - 1) * booksPerPage;
      const pageItems = filtered.slice(startIdx, startIdx + booksPerPage);

      if (chk.checked) {
        pageItems.forEach(b => selectedAdminBookIds.add(Number(b.id)));
      } else {
        pageItems.forEach(b => selectedAdminBookIds.delete(Number(b.id)));
      }
      renderAdminBooks();
      updateAdminBookSelectionUI();
    }

    function clearAdminBookSelection() {
      selectedAdminBookIds.clear();
      renderAdminBooks();
      updateAdminBookSelectionUI();
    }

    function updateAdminBookSelectionUI() {
      const count = selectedAdminBookIds.size;
      const bar = document.getElementById('adminBookSelectionBar');
      const countEl = document.getElementById('adminBookSelectedCount');
      if (bar) bar.classList.toggle('hidden', count === 0);
      if (countEl) countEl.textContent = count;
    }

    function exportSelectedAdminBooks() {
      if (selectedAdminBookIds.size === 0) {
        showNoticeModal('Chưa chọn sách', 'Vui lòng tích chọn ít nhất 1 đầu sách cần xuất Excel!');
        return;
      }
      const targetBooks = db.books.filter(b => selectedAdminBookIds.has(Number(b.id)));
      const rows = targetBooks.map((b, idx) => ({
        'STT': idx + 1,
        'Mã Sách': b.code,
        'Tên Sách': b.title,
        'Tác Giả': b.author,
        'Thể Loại': b.category,
        'Nhà Xuất Bản': b.publisher || '',
        'Năm XB': b.publishYear || '',
        'Số Trang': b.pages || '',
        'Vị Trí Kệ': b.shelf || '',
        'Tổng Số Bản': b.total,
        'Hiện Còn': b.available
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 }, { wch: 15 }, { wch: 35 }, { wch: 24 }, { wch: 20 },
        { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sach_Da_Chon');
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `SmartLib_DanhMucSach_DaChon_${targetBooks.length}_Cuon_${dateStr}.xlsx`);
      showToast(`Đã xuất ${targetBooks.length} đầu sách đã chọn ra file Excel!`);
    }

    function deleteSelectedAdminUsers() {
      const count = selectedAdminUserIds.size;
      if (count === 0) {
        showNoticeModal('Chưa chọn độc giả', 'Vui lòng tích chọn ít nhất 1 độc giả cần xóa!');
        return;
      }
      const busyUsers = db.users.filter(u => selectedAdminUserIds.has(Number(u.id)) && db.borrows.some(br => br.userId === u.id && (br.status === 'borrowing' || br.status === 'pending')));
      if (busyUsers.length > 0) {
        showNoticeModal('Độc giả đang giữ sách', `Có ${busyUsers.length} độc giả trong danh sách chọn hiện còn sách đang mượn chưa trả (VD: ${busyUsers[0].fullName}). Vui lòng thu hồi sách trước khi xóa!`);
        return;
      }
      openCustomConfirmDialog(
        'Xác nhận xóa hàng loạt',
        `Bạn có chắc chắn muốn xóa vĩnh viễn ${count} độc giả đã chọn khỏi hệ thống thư viện? Thao tác này không thể hoàn tác!`,
        async () => {
          const idsToDelete = Array.from(selectedAdminUserIds).map(Number);
          if (isCloudConnected && supabaseClient) {
            try {
              for (let i = 0; i < idsToDelete.length; i += 200) {
                const chunk = idsToDelete.slice(i, i + 200);
                const { error } = await supabaseClient.from('readers').delete().in('id', chunk);
                if (error) throw error;
              }
            } catch (err) {
              showNoticeModal('Lỗi xóa độc giả', err.message || 'Không thể xóa độc giả trên Cloud!');
              return;
            }
          }
          db.users = db.users.filter(u => !selectedAdminUserIds.has(Number(u.id)));
          selectedAdminUserIds.clear();
          await saveDB('users');
          updateAdminUserSelectionUI();
          showToast(`Đã xóa thành công ${count} độc giả khỏi hệ thống!`);
        }
      );
    }
    function changeAdminBookPage(delta) {
      adminBookPage += delta;
      renderAdminBooks();
    }

    function changeAdminBookPageSize(size) {
      booksPerPage = parseInt(size, 10) || 100;
      adminBookPage = 1;
      renderAdminBooks();
    }

    function changeAdminUserPageSize(size) {
      usersPerPage = parseInt(size, 10) || 100;
      adminUserPage = 1;
      renderAdminUsers();
    }

    // HIỂN THỊ BẢNG ĐỘC GIẢ CÓ PHÂN TRANG (MƯỢT MÀ VỚI 4.000+ HỌC SINH)
    function openPromoteStudentsModal() {
      const curr = db.currentSchoolYear && db.currentSchoolYear !== 'ALL' ? db.currentSchoolYear : '2026-2027';
      document.getElementById('promoteFromYear').value = curr;
      const match = curr.match(/^(\d{4})-(\d{4})$/);
      if (match) {
        const y1 = parseInt(match[1]) + 1;
        const y2 = parseInt(match[2]) + 1;
        document.getElementById('promoteToYear').value = y1 + '-' + y2;
      } else {
        document.getElementById('promoteToYear').value = '';
      }
      document.getElementById('promoteStudentsModal').classList.remove('hidden');
    }

    function closePromoteStudentsModal() {
      document.getElementById('promoteStudentsModal').classList.add('hidden');
    }

    function promoteGroupToNextYear(currentGroup) {
      const g = String(currentGroup || '').trim();
      if (!/^(10|11|12)/.test(g)) {
        return g;
      }
      if (/^10/.test(g)) {
        return g.replace(/^10/, '11');
      }
      if (/^11/.test(g)) {
        return g.replace(/^11/, '12');
      }
      if (/^12/.test(g)) {
        return 'Đã tốt nghiệp (' + g + ')';
      }
      return g;
    }

    async function handlePromoteStudentsSubmit(e) {
      e.preventDefault();
      const fromYear = document.getElementById('promoteFromYear').value.trim();
      const toYear = document.getElementById('promoteToYear').value.trim();

      if (!toYear || toYear === fromYear) {
        showNoticeModal('Năm học không hợp lệ', 'Vui lòng nhập năm học mới khác với năm học hiện tại!');
        return;
      }

      openCustomConfirmDialog(
        'Xác nhận chuyển lớp toàn trường',
        'Bạn có chắc chắn muốn chuyển toàn bộ học sinh từ năm học ' + fromYear + ' sang năm học mới ' + toYear + '? Khối 10 sẽ lên 11, khối 11 lên 12 và khối 12 chuyển trạng thái tốt nghiệp.',
        async () => {
          closePromoteStudentsModal();
          let p10to11 = 0, p11to12 = 0, grad = 0, teachers = 0;

          db.users.forEach(u => {
            const oldClass = u.group || '';
            if (!u.classesHistory) u.classesHistory = {};
            u.classesHistory[fromYear] = oldClass;

            const newClass = promoteGroupToNextYear(oldClass);
            u.classesHistory[toYear] = newClass;
            u.group = newClass;
            u.schoolYear = toYear;

            if (newClass.startsWith('Đã tốt nghiệp')) {
              grad++;
              u.status = 'locked';
            } else if (/^12/.test(newClass)) {
              p11to12++;
            } else if (/^11/.test(newClass)) {
              p10to11++;
            } else {
              teachers++;
            }
          });

          db.currentSchoolYear = toYear;
          const yearSelect = document.getElementById('globalSchoolYearSelect');
          if (yearSelect && !Array.from(yearSelect.options).some(opt => opt.value === toYear)) {
            const newOpt = document.createElement('option');
            newOpt.value = toYear;
            newOpt.textContent = toYear;
            yearSelect.insertBefore(newOpt, yearSelect.lastElementChild);
          }
          if (yearSelect) yearSelect.value = toYear;

          if (isCloudConnected && supabaseClient && db.users.length > 0) {
            try {
              showToast('Đang cập nhật lên lớp trên Supabase Cloud...');
              await upsertInChunks('readers', db.users.map(mapReaderToDB), 'card_code');
            } catch (err) {
              showNoticeModal('Lỗi đồng bộ Cloud', err.message || 'Không thể lưu chuyển lớp lên Supabase!');
              return;
            }
          }

          await saveDB('users');
          await saveDB('settings');
          renderAll();

          showNoticeModal(
            'Chuyển năm học thành công!',
            'Đã chuyển thành công sang năm học ' + toYear + '!\n- Khối 10 lên 11: ' + p10to11 + ' học sinh\n- Khối 11 lên 12: ' + p11to12 + ' học sinh\n- Khối 12 tốt nghiệp: ' + grad + ' học sinh\n- Thầy cô giữ nguyên: ' + teachers + ' người.'
          );
        }
      );
    }
    // Nhận diện đối tượng Giáo viên vs Học sinh
    function getUserType(u) {
      if (u.userType === 'teacher' || u.userType === 'student') return u.userType;
      const code = String(u.cardCode || '').toUpperCase();
      const grp = String(u.group || '').toLowerCase();
      const name = String(u.fullName || '').toLowerCase();
      if (code.startsWith('GV') || name.startsWith('thầy') || name.startsWith('cô') || grp.includes('tổ') || grp.includes('bộ môn') || /^(tin|toán|văn|anh|lý|hóa|sinh|sử|địa|gdcd|thể dục|công nghệ|giáo viên)/i.test(grp)) {
        return 'teacher';
      }
      return 'student';
    }
    // Tính niên khóa 3 năm học THPT cho học sinh (Khối 10: 2026-2029, Khối 11: 2025-2028, Khối 12: 2024-2027)
    function getUserCohort(u, fallbackYear = '2026-2027') {
      if (!u) return '2026-2029';
      if (getUserType(u) === 'teacher') return 'Cán bộ / GV';
      const sy = String(u.schoolYear || fallbackYear || db.currentSchoolYear || '2026-2027').trim();
      const matchYear = sy.match(/^(\d{4})/);
      const baseStartYear = matchYear ? parseInt(matchYear[1], 10) : 2026;

      const grp = String(u.group || '').trim();
      const gradeMatch = grp.match(/(?:^|[^\d])(10|11|12)(?:[^\d]|$)/);
      if (gradeMatch) {
        const grade = parseInt(gradeMatch[1], 10);
        const start = baseStartYear - (grade - 10);
        const end = start + 3;
        return `${start}-${end}`;
      }
      return `${baseStartYear}-${baseStartYear + 3}`;
    }

    function handleUserTypeChange(type) {
      const codeInput = document.getElementById('formUserCode');
      const groupLabel = document.getElementById('formUserGroupLabel');
      const groupInput = document.getElementById('formUserGroup');
      if (type === 'teacher') {
        if (groupLabel) groupLabel.textContent = 'Tổ chuyên môn / Bộ môn *';
        if (groupInput) groupInput.placeholder = 'VD: Tin học, Toán, Ngữ văn...';
        if (codeInput && !codeInput.value) codeInput.placeholder = 'VD: GV-TIN01';
      } else {
        if (groupLabel) groupLabel.textContent = 'Lớp học *';
        if (groupInput) groupInput.placeholder = 'VD: 12A1';
        if (codeInput && !codeInput.value) codeInput.placeholder = 'VD: HS12A1-05';
      }
    }
    function formatBirthDate(dStr) {
      if (!dStr) return '';
      const s = String(dStr).trim();
      const parts = s.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return s;
    }
    function renderAdminUsers() {
      let q = (document.getElementById('adminUserSearch')?.value || '').toLowerCase().trim();
      if (q === 'null' || q === 'undefined') q = '';
      const userTypeFilter = document.getElementById('adminUserTypeFilter')?.value || 'ALL';
      const currentYear = db.currentSchoolYear || '2026-2027';

      const filtered = db.users.filter(u => {
        const matchYear = currentYear === 'ALL' || (u.schoolYear || '2026-2027') === currentYear;
        if (!matchYear) return false;

        const isTeacher = getUserType(u) === 'teacher';
        if (userTypeFilter === 'student' && isTeacher) return false;
        if (userTypeFilter === 'teacher' && !isTeacher) return false;

        if (!q) return true;
        const bDateStr = u.birthDate ? formatBirthDate(u.birthDate) : '';
        return String(u.fullName || '').toLowerCase().includes(q) || 
               String(u.cardCode || '').toLowerCase().includes(q) || 
               String(u.group || '').toLowerCase().includes(q) ||
               (u.gender && String(u.gender).toLowerCase() === q) ||
               (u.birthDate && String(u.birthDate).includes(q)) ||
               (bDateStr && bDateStr.includes(q)) ||
               (u.phone && String(u.phone).includes(q)) ||
               (u.email && String(u.email).toLowerCase().includes(q));
      });

      const totalItems = filtered.length;
      const totalStudents = filtered.filter(u => getUserType(u) === 'student').length;
      const totalTeachers = filtered.filter(u => getUserType(u) === 'teacher').length;

      const totalPages = Math.max(1, Math.ceil(totalItems / usersPerPage));
      if (adminUserPage > totalPages) adminUserPage = totalPages;
      if (adminUserPage < 1) adminUserPage = 1;

      const startIdx = (adminUserPage - 1) * usersPerPage;
      const pageItems = filtered.slice(startIdx, startIdx + usersPerPage);

      const infoEl = document.getElementById('adminUserPaginationInfo');
      if (infoEl) {
        infoEl.innerHTML = totalItems > 0
          ? `Hiển thị <strong>${startIdx + 1} - ${Math.min(startIdx + usersPerPage, totalItems)}</strong> trên tổng <strong>${totalItems}</strong> bạn đọc (<strong>${totalStudents}</strong> Học sinh • <strong>${totalTeachers}</strong> Giáo viên)`
          : `Không có bạn đọc nào khớp bộ lọc`;
      }
      document.getElementById('adminUserPageIndicator').textContent = `Trang ${adminUserPage}/${totalPages}`;
      document.getElementById('btnPrevUserPage').disabled = adminUserPage <= 1;
      document.getElementById('btnNextUserPage').disabled = adminUserPage >= totalPages;

      const allPageChecked = pageItems.length > 0 && pageItems.every(u => selectedAdminUserIds.has(Number(u.id)));
      const selectAllEl = document.getElementById('selectAllAdminUsers');
      if (selectAllEl) {
        selectAllEl.checked = allPageChecked;
        selectAllEl.indeterminate = !allPageChecked && pageItems.some(u => selectedAdminUserIds.has(Number(u.id)));
      }

      document.getElementById('adminUserTableBody').innerHTML = pageItems.map(u => {
        const isTeacher = getUserType(u) === 'teacher';
        const isChecked = selectedAdminUserIds.has(Number(u.id));
        return `
          <tr class="hover:bg-slate-50 ${isChecked ? 'bg-blue-50/40' : ''}">
            <td class="py-3.5 px-3 text-center">
              <input type="checkbox" class="admin-user-chk w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer" value="${u.id}" onchange="toggleAdminUserSelect(${u.id}, this.checked)" ${isChecked ? 'checked' : ''} />
            </td>
            <td class="py-3.5 px-4 font-mono font-bold text-xs ${isTeacher ? 'text-purple-700' : 'text-blue-700'}">${u.cardCode}</td>
            <td class="py-3.5 px-4">
              <p class="font-bold text-slate-900">${u.fullName}</p>
              <div class="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                <span class="font-mono text-slate-400">${isTeacher ? 'Giáo viên' : 'Học sinh'}</span>
                ${(u.gender || u.birthDate) ? `
                  <span>• <strong class="${u.gender === 'Nữ' ? 'text-pink-600' : 'text-blue-600'}">${u.gender || 'Nam'}</strong></span>
                  ${u.birthDate ? `<span class="text-slate-500 font-mono">• NS: ${formatBirthDate(u.birthDate)}</span>` : ''}
                ` : ''}
              </div>
            </td>
            <td class="py-3.5 px-4 text-xs">
              ${isTeacher
                ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">👨‍🏫 Giáo viên</span>`
                : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">🎓 Học sinh</span>`
              }
              <span class="font-bold text-slate-800 block text-xs mt-1">
                ${isTeacher ? `Tổ ${u.group}` : `Lớp ${(currentYear !== 'ALL' && u.classesHistory && u.classesHistory[currentYear]) || u.group}`}
              </span>
              <span class="text-[10px] text-slate-400 block">${currentYear !== 'ALL' ? currentYear : (u.schoolYear || '2026-2027')}</span>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-600">
              <div class="flex items-center gap-1.5 text-blue-600 font-medium">
                <i class="ph ph-envelope-simple text-sm"></i> ${u.email || '<span class="text-slate-400">Chưa có email</span>'}
              </div>
              <div class="flex items-center gap-1.5 text-slate-500 mt-0.5">
                <i class="ph ph-phone text-sm"></i> ${u.phone || '<span class="text-slate-400">---</span>'}
              </div>
            </td>
            <td class="py-3.5 px-4">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <span class="font-mono text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                    <i class="ph-fill ph-shield-check text-emerald-600"></i> ${isDefaultReaderPassword(u.password) ? 'SHA-256 (123456)' : 'SHA-256 (Đã ẩn)'}
                  </span>
                  ${isDefaultReaderPassword(u.password)
                    ? `<span class="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 uppercase">MK Mặc định</span>`
                    : `<span class="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 uppercase border border-emerald-200"><i class="ph-fill ph-lock-key"></i> Đã đổi riêng</span>`
                  }
                </div>
                <button onclick="adminQuickChangePassword(${u.id})" class="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[10px] font-bold transition shadow-sm">Cấp lại</button>
              </div>
            </td>
            <td class="py-3.5 px-4">
              <span class="px-2 py-0.5 text-xs rounded-full font-semibold ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                ${u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
              </span>
            </td>
            <td class="py-3.5 px-4 text-right space-x-1.5">
              <button onclick="openUserModal(${u.id})" class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100">Sửa/MK</button>
              <button onclick="toggleUserLock(${u.id})" class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100">${u.status === 'active' ? 'Khóa' : 'Mở'}</button>
              <button onclick="deleteUser(${u.id})" class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100">Xóa</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function changeAdminUserPage(delta) {
      adminUserPage += delta;
      renderAdminUsers();
    }

    function onBorrowTargetFilterChange() {
      populateBorrowGroupFilter(true);
      renderAdminBorrows();
    }

    function populateBorrowGroupFilter(resetGroup = false) {
      const groupSel = document.getElementById('adminBorrowGroupFilter');
      const targetSel = document.getElementById('adminBorrowTargetFilter');
      if (!groupSel) return;

      const target = targetSel ? targetSel.value : 'ALL';
      const currentYear = db.currentSchoolYear || '2026-2027';
      const groupsSet = new Set();

      db.users.forEach(u => {
        const matchYear = currentYear === 'ALL' || (u.schoolYear || '2026-2027') === currentYear;
        if (!matchYear || !u.group) return;
        const isTeacher = getUserType(u) === 'teacher';
        if (target === 'teacher' && !isTeacher) return;
        if (target === 'student' && isTeacher) return;
        if (['10', '11', '12'].includes(target) && getUserGradeLevel(u) !== target) return;
        groupsSet.add(u.group.trim());
      });

      const sortedGroups = Array.from(groupsSet).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
      const prevVal = resetGroup ? 'ALL' : (groupSel.value || 'ALL');
      const defaultLabel = target === 'teacher'
        ? '-- Tất cả Tổ chuyên môn --'
        : (['10', '11', '12', 'student'].includes(target) ? '-- Tất cả các Lớp --' : '-- Tất cả Lớp / Tổ --');

      groupSel.innerHTML = `<option value="ALL">${defaultLabel}</option>` + sortedGroups.map(g => {
        const isTeacherOnly = target === 'teacher';
        const label = isTeacherOnly ? `Tổ ${g}` : g;
        return `<option value="${g}" ${g === prevVal ? 'selected' : ''}>${label}</option>`;
      }).join('');
    }

    function getFilteredAdminBorrows() {
      const filter = document.getElementById('adminBorrowFilter')?.value || 'ALL';
      const target = document.getElementById('adminBorrowTargetFilter')?.value || 'ALL';
      const groupVal = document.getElementById('adminBorrowGroupFilter')?.value || 'ALL';
      let q = (document.getElementById('adminBorrowSearch')?.value || '').toLowerCase().trim();
      if (q === 'null' || q === 'undefined') q = '';
      const currentYear = db.currentSchoolYear || '2026-2027';

      return db.borrows.filter(b => {
        const matchYear = currentYear === 'ALL' || (b.schoolYear || '2026-2027') === currentYear;
        if (!matchYear) return false;
        if (filter !== 'ALL') {
          if (filter === 'overdue' && !isOverdue(b)) return false;
          if (filter !== 'overdue' && b.status !== filter) return false;
        }

        const user = db.users.find(u => u.id === b.userId);
        if (target !== 'ALL' || groupVal !== 'ALL') {
          if (!user) return false;
          const isTeacher = getUserType(user) === 'teacher';
          if (target === 'teacher' && !isTeacher) return false;
          if (target === 'student' && isTeacher) return false;
          if (['10', '11', '12'].includes(target) && getUserGradeLevel(user) !== target) return false;
          if (groupVal !== 'ALL' && String(user.group || '').trim().toLowerCase() !== groupVal.toLowerCase()) return false;
        }

        if (!q) return true;
        const uObj = user || {};
        const book = db.books.find(x => x.id === b.bookId) || {};
        return String(b.ticketCode || '').toLowerCase().includes(q) ||
               String(uObj.fullName || '').toLowerCase().includes(q) ||
               String(uObj.cardCode || '').toLowerCase().includes(q) ||
               String(uObj.group || '').toLowerCase().includes(q) ||
               String(book.title || '').toLowerCase().includes(q) ||
               String(book.code || '').toLowerCase().includes(q);
      });
    }

    function renderAdminBorrows() {
      populateBorrowGroupFilter(false);
      const list = getFilteredAdminBorrows();
      document.getElementById('adminBorrowTableBody').innerHTML = list.map(b => {
        const user = db.users.find(u => u.id === b.userId) || { fullName: 'Độc giả đã xóa', cardCode: '---' };
        const book = db.books.find(x => x.id === b.bookId) || { title: 'Sách đã xóa', code: '---' };
        const overdueDays = getOverdueDays(b);
        const fine = calculateFine(b);

        let statusBadge = '';
        if (b.status === 'pending') statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Chờ duyệt Online</span>`;
        else if (b.status === 'returned') statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã trả (${b.returnDate})</span>`;
        else if (overdueDays > 0) statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">Quá hạn (${Math.max(1, Math.floor((new Date() - new Date(b.dueDate)) / (1000 * 60 * 60 * 24)))} ngày)</span>`;
        else statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Đang mượn</span>`;

        let actionBtns = `<div class="flex items-center justify-end gap-1.5 flex-wrap">`;
        
        // 1. Nút Xem chi tiết phiếu mượn
        actionBtns += `<button onclick="openBorrowDetailModal(${b.id})" class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition" title="Xem chi tiết phiếu mượn"><i class="ph-bold ph-eye"></i> Xem</button>`;

        // 2. Thao tác Xác nhận mượn & Nhận trả
        if (b.status === 'pending') {
          actionBtns += `<button onclick="approvePendingBorrow(${b.id})" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center gap-1 transition" title="Xác nhận duyệt mượn & Tự động gửi Email thông báo cho bạn đọc"><i class="ph-bold ph-check-circle"></i> Xác nhận mượn (Email)</button>`;
        } else if (b.status === 'borrowing') {
          actionBtns += `<button onclick="markBorrowReturned(${b.id})" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm flex items-center gap-1 transition" title="Thu hồi và nhận trả sách vào kho"><i class="ph-bold ph-arrow-counter-clockwise"></i> Thu hồi</button>`;
          
          // Nút Báo sách quá hạn qua Email (Đỏ) hoặc Nhắc nhở hạn trả qua Email (Xám)
          if (overdueDays > 0) {
            actionBtns += `<button onclick="sendOverdueEmail(${b.id})" class="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1 transition" title="Gửi email đòi sách"><i class="ph-bold ph-envelope-simple"></i> Báo quá hạn (Email)</button>`;
          } else {
            actionBtns += `<button onclick="sendOverdueEmail(${b.id})" class="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold shadow-xs inline-flex items-center gap-1 transition" title="Gửi email nhắc nhở hạn trả sách"><i class="ph-bold ph-envelope-simple"></i> Nhắc hạn (Email)</button>`;
          }
        }

        // 3. Nút Xóa phiếu mượn
        actionBtns += `<button onclick="deleteBorrowTicket(${b.id})" class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1 transition" title="Xóa phiếu mượn này khỏi hệ thống"><i class="ph-bold ph-trash"></i> Xóa</button>`;
        actionBtns += `</div>`;

        return `
          <tr class="hover:bg-slate-50">
            <td class="py-3.5 px-4">
              <button onclick="openBorrowDetailModal(${b.id})" class="font-mono font-bold text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1" title="Nhấp để xem chi tiết phiếu mượn">
                ${b.ticketCode} <i class="ph ph-arrow-square-out text-sm"></i>
              </button>
              <span class="block text-[10px] text-slate-400 font-normal">${b.schoolYear || '2026-2027'}</span>
            </td>
            <td class="py-3.5 px-4">
              <p class="font-semibold text-slate-800">${user.fullName}</p>
              <span class="text-xs font-mono text-indigo-600">${user.cardCode}</span>
            </td>
            <td class="py-3.5 px-4">
              <p class="font-medium text-slate-800">${book.title}</p>
              <span class="text-xs font-mono text-slate-400">${book.code}</span>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-600">${b.borrowDate} → <strong>${b.dueDate}</strong></td>
            <td class="py-3.5 px-4">${statusBadge}</td>
            <td class="py-3.5 px-4 font-bold ${fine > 0 ? 'text-rose-600' : 'text-slate-400'}">${fine > 0 ? fine.toLocaleString('vi-VN') + 'đ' : '0đ'}</td>
            <td class="py-3.5 px-4 text-right">${actionBtns}</td>
          </tr>
        `;
      }).join('');
    }
