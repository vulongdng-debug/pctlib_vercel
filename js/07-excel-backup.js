    // ==================== IMPORT / EXPORT EXCEL & BACKUP ====================
    function downloadBookTemplate() {
      const rows = [{ MaSach: 'TH12-010', TenSach: 'Cơ sở dữ liệu MySQL', TacGia: 'Nguyễn Vũ Long', TheLoai: 'Tin học & CNTT', NXB: 'NXB Giáo Dục', NamXB: 2024, SoTrang: 150, KeSach: 'Kệ A2', SoLuong: 10 }];
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Sach');
      XLSX.writeFile(wb, 'SmartLib_Mau_Nhap_Sach.xlsx');
    }

    function handleImportBooksExcel(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        let added = 0, updated = 0;
        const changedMap = new Map();
        rows.forEach((r, idx) => {
          const code = String(r.MaSach || r.Code || `BK-${Date.now()}-${idx}`).trim().toUpperCase();
          const title = String(r.TenSach || r.Title || '').trim();
          if (!title) return;
          const qty = Math.max(0, Number(r.SoLuong || r.Total || 1));
          const existing = db.books.find(b => b.code.toUpperCase() === code);
          if (existing) {
            existing.total += qty; existing.available += qty; updated++;
            changedMap.set(code, existing);
          } else {
            const newBook = {
              id: Date.now() + idx, code, title,
              author: String(r.TacGia || r.Author || 'Nhiều tác giả'),
              category: String(r.TheLoai || r.Category || 'Tin học & CNTT'),
              publisher: String(r.NXB || r.Publisher || ''),
              shelf: String(r.KeSach || r.Shelf || 'Kệ A1'),
              publishYear: String(r.NamXB || r.PublishYear || ''),
              pages: String(r.SoTrang || r.Pages || ''),
              total: qty, available: qty, featured: false, desc: ''
            };
            db.books.unshift(newBook);
            changedMap.set(code, newBook);
            added++;
          }
        });
        if (isCloudConnected && supabaseClient && changedMap.size > 0) {
          try {
            showToast('Đang đồng bộ danh mục sách lên Supabase Cloud...');
            await upsertInChunks('books', Array.from(changedMap.values()).map(mapBookToDB), 'code');
            await syncFromCloud(false);
          } catch (err) {
            showNoticeModal('Lỗi nhập Excel', err.message || 'Không thể lưu sách lên Supabase Cloud!');
            event.target.value = '';
            return;
          }
        } else {
          await saveDB('books');
        }
        event.target.value = '';
        showToast(`Đã thêm mới ${added} sách, cộng dồn ${updated} sách!`);
      };
      reader.readAsArrayBuffer(file);
    }
    // ==================== QUẢN LÝ TÍCH CHỌN & XUẤT DANH SÁCH ĐỘC GIẢ EXCEL ====================
    function toggleAdminUserSelect(userId, isChecked) {
      const idNum = Number(userId);
      if (isChecked) {
        selectedAdminUserIds.add(idNum);
      } else {
        selectedAdminUserIds.delete(idNum);
      }
      renderAdminUsers();
      updateAdminUserSelectionUI();
    }

    function toggleSelectAllAdminUsers(chk) {
      const q = (document.getElementById('adminUserSearch')?.value || '').toLowerCase().trim();
      const userTypeFilter = document.getElementById('adminUserTypeFilter')?.value || 'ALL';
      const currentYear = db.currentSchoolYear || '2026-2027';

      const filtered = db.users.filter(u => {
        const matchYear = currentYear === 'ALL' || (u.schoolYear || '2026-2027') === currentYear;
        if (!matchYear) return false;
        const isTeacher = getUserType(u) === 'teacher';
        if (userTypeFilter === 'student' && isTeacher) return false;
        if (userTypeFilter === 'teacher' && !isTeacher) return false;
        if (!q) return true;
        return String(u.fullName || '').toLowerCase().includes(q) || 
               String(u.cardCode || '').toLowerCase().includes(q) || 
               String(u.group || '').toLowerCase().includes(q) ||
               (u.phone && String(u.phone).includes(q)) ||
               (u.email && String(u.email).toLowerCase().includes(q));
      });

      const startIdx = (adminUserPage - 1) * usersPerPage;
      const pageItems = filtered.slice(startIdx, startIdx + usersPerPage);

      if (chk.checked) {
        pageItems.forEach(u => selectedAdminUserIds.add(Number(u.id)));
      } else {
        pageItems.forEach(u => selectedAdminUserIds.delete(Number(u.id)));
      }
      renderAdminUsers();
      updateAdminUserSelectionUI();
    }

    function clearAdminUserSelection() {
      selectedAdminUserIds.clear();
      renderAdminUsers();
      updateAdminUserSelectionUI();
    }
    
    function updateAdminUserSelectionUI() {
      const count = selectedAdminUserIds.size;
      const bar = document.getElementById('adminUserSelectionBar');
      const countEl = document.getElementById('adminUserSelectedCount');
      const badgeEl = document.getElementById('exportSelectedBadge');
      if (bar) bar.classList.toggle('hidden', count === 0);
      if (countEl) countEl.textContent = count;
      if (badgeEl) badgeEl.textContent = `${count} bạn đọc`;
      const emptyWarn = document.getElementById('exportSelectedEmptyWarning');
      if (emptyWarn) {
        const scope = document.querySelector('input[name="exportScope"]:checked')?.value;
        emptyWarn.classList.toggle('hidden', !(scope === 'selected' && count === 0));
      }
    }

    function openExportUsersModal(initialScope = null) {
      const modal = document.getElementById('exportUsersModal');
      if (!modal) return;

      updateAdminUserSelectionUI();

      if (initialScope) {
        const radio = document.querySelector(`input[name="exportScope"][value="${initialScope}"]`);
        if (radio) radio.checked = true;
      }

      // Quét danh sách các Lớp (Học sinh) & Tổ chuyên môn (Giáo viên)
      const classMap = new Map();
      const deptMap = new Map();

      db.users.forEach(u => {
        const isTeacher = getUserType(u) === 'teacher';
        if (isTeacher) {
          const dept = (u.group || 'Chưa phân tổ').trim();
          deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
        } else {
          const cls = (u.group || 'Chưa phân lớp').trim();
          classMap.set(cls, (classMap.get(cls) || 0) + 1);
        }
      });

      // Điền danh sách Lớp vào select
      const classSelect = document.getElementById('exportSelectClass');
      if (classSelect) {
        const sortedClasses = Array.from(classMap.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        const totalStudents = Array.from(classMap.values()).reduce((a, b) => a + b, 0);
        let html = `<option value="ALL">-- Tất cả các Lớp học (${totalStudents} học sinh) --</option>`;
        sortedClasses.forEach(cls => {
          html += `<option value="${cls}">Lớp ${cls} (${classMap.get(cls)} học sinh)</option>`;
        });
        classSelect.innerHTML = html;
      }

      // Điền danh sách Tổ vào select
      const deptSelect = document.getElementById('exportSelectDept');
      if (deptSelect) {
        const sortedDepts = Array.from(deptMap.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        const totalTeachers = Array.from(deptMap.values()).reduce((a, b) => a + b, 0);
        let html = `<option value="ALL">-- Tất cả các Tổ chuyên môn (${totalTeachers} cán bộ/GV) --</option>`;
        sortedDepts.forEach(d => {
          html += `<option value="${d}">Tổ ${d} (${deptMap.get(d)} giáo viên)</option>`;
        });
        deptSelect.innerHTML = html;
      }

      updateExportScopeUI();
      modal.classList.remove('hidden');
    }

    function closeExportUsersModal() {
      const modal = document.getElementById('exportUsersModal');
      if (modal) modal.classList.add('hidden');
    }

    function updateExportScopeUI() {
      const scope = document.querySelector('input[name="exportScope"]:checked')?.value || 'class';
      const classBox = document.getElementById('exportClassSelectContainer');
      const deptBox = document.getElementById('exportDeptSelectContainer');
      const emptyWarn = document.getElementById('exportSelectedEmptyWarning');

      if (classBox) classBox.classList.toggle('hidden', scope !== 'class');
      if (deptBox) deptBox.classList.toggle('hidden', scope !== 'department');
      if (emptyWarn) emptyWarn.classList.toggle('hidden', !(scope === 'selected' && selectedAdminUserIds.size === 0));
    }

    function handleExportUsersSubmit(e) {
      e.preventDefault();
      const scope = document.querySelector('input[name="exportScope"]:checked')?.value || 'class';
      const selectedYearMode = document.getElementById('exportSelectYear')?.value || 'CURRENT';
      const selectedStatus = document.getElementById('exportSelectStatus')?.value || 'ALL';
      const currentYear = db.currentSchoolYear && db.currentSchoolYear !== 'ALL' ? db.currentSchoolYear : '2026-2027';

      let targetUsers = [];
      let exportCategoryName = '';

      if (scope === 'class') {
        const selectedClass = document.getElementById('exportSelectClass')?.value || 'ALL';
        targetUsers = db.users.filter(u => getUserType(u) === 'student');
        if (selectedClass !== 'ALL') {
          targetUsers = targetUsers.filter(u => String(u.group || '').trim() === selectedClass);
          exportCategoryName = `Lop_${selectedClass.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        } else {
          exportCategoryName = 'HocSinh_TatCaLop';
        }
      } else if (scope === 'department') {
        const selectedDept = document.getElementById('exportSelectDept')?.value || 'ALL';
        targetUsers = db.users.filter(u => getUserType(u) === 'teacher');
        if (selectedDept !== 'ALL') {
          targetUsers = targetUsers.filter(u => String(u.group || '').trim() === selectedDept);
          exportCategoryName = `To_${selectedDept.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        } else {
          exportCategoryName = 'GiaoVien_TatCaTo';
        }
      } else if (scope === 'selected') {
        if (selectedAdminUserIds.size === 0) {
          showNoticeModal('Chưa chọn độc giả', 'Bạn chưa tích chọn bạn đọc nào trên bảng! Vui lòng tích chọn ít nhất 1 độc giả trước khi xuất.');
          return;
        }
        targetUsers = db.users.filter(u => selectedAdminUserIds.has(Number(u.id)));
        exportCategoryName = `ChonRiengLe_${targetUsers.length}_DocGia`;
      } else {
        targetUsers = [...db.users];
        exportCategoryName = 'ToanBoDocGia';
      }

      // Áp dụng bộ lọc Năm học
      if (selectedYearMode === 'CURRENT') {
        targetUsers = targetUsers.filter(u => (u.schoolYear || '2026-2027') === currentYear);
      }

      // Áp dụng bộ lọc Trạng thái
      if (selectedStatus !== 'ALL') {
        targetUsers = targetUsers.filter(u => u.status === selectedStatus);
      }

      if (targetUsers.length === 0) {
        showNoticeModal('Không có dữ liệu', 'Không tìm thấy độc giả nào phù hợp với tiêu chí lọc đã chọn!');
        return;
      }

      // Chuẩn bị dữ liệu xuất Excel
      const rows = targetUsers.map((u, index) => {
        const isTeacher = getUserType(u) === 'teacher';
        const groupLabel = isTeacher ? `Tổ ${u.group}` : `Lớp ${u.group}`;
        return {
          'STT': index + 1,
          'Mã Thẻ (Username)': u.cardCode,
          'Họ và Tên': u.fullName,
          'Đối Tượng': isTeacher ? 'Giáo viên' : 'Học sinh',
          'Giới Tính': u.gender || '---',
          'Ngày Sinh': formatBirthDate(u.birthDate) || '---',
          'Lớp / Tổ Đơn Vị': groupLabel,
          'Năm Học': u.schoolYear || currentYear,
          'Email': u.email || '',
          'Số Điện Thoại': u.phone || '',
          'Trạng Thái Thẻ': u.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 16 }, // Mã thẻ
        { wch: 25 }, // Họ tên
        { wch: 14 }, // Đối tượng
        { wch: 12 }, // Giới tính
        { wch: 14 }, // Ngày sinh
        { wch: 20 }, // Lớp / Tổ
        { wch: 14 }, // Năm học
        { wch: 24 }, // Email
        { wch: 15 }, // SĐT
        { wch: 16 }  // Trạng thái
      ];

      const wb = XLSX.utils.book_new();
      const safeSheetName = exportCategoryName.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `SmartLib_DanhSach_${exportCategoryName}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

      closeExportUsersModal();
      showToast(`Đã xuất thành công ${targetUsers.length} độc giả ra tệp ${fileName}!`);
    }
    function exportBorrowsExcel() {
       if (!window.XLSX) return;
       const filter = document.getElementById('adminBorrowFilter')?.value || 'ALL';
       const list = getFilteredAdminBorrows();
       if (list.length === 0) {
         showNoticeModal('Không có dữ liệu', 'Không có phiếu mượn nào khớp với bộ lọc hiện tại để xuất Excel!');
         return;
     }

   const rows = list.map((b, idx) => {
     const user = db.users.find(u => u.id === b.userId) || {};
     const book = db.books.find(x => x.id === b.bookId) || {};
     const statusLabel = b.status === 'pending' ? 'Chờ duyệt Online' : (b.status === 'returned' ? `Đã trả (${b.returnDate || ''})` : (isOverdue(b) ? 'Quá hạn' : 'Đang mượn'));
     return {
       'STT': idx + 1,
       'Mã Phiếu': b.ticketCode,
       'Mã Thẻ': user.cardCode || '---',
       'Họ và Tên Bạn Đọc': user.fullName || 'Độc giả đã xóa',
       'Đối Tượng': getUserType(user) === 'teacher' ? 'Giáo viên' : 'Học sinh',
       'Lớp / Tổ': user.group || '---',
       'Mã Sách': book.code || '---',
       'Tên Sách Mượn': book.title || 'Sách đã xóa',
       'Ngày Mượn': b.borrowDate || '---',
       'Hạn Trả': b.dueDate || '---',
       'Ngày Trả Thực Tế': b.returnDate || 'Chưa trả',
       'Trạng Thái': statusLabel,
       'Thủ Thư Xử Lý': b.returnedBy || b.processedBy || '---'
     };
   });

   const ws = XLSX.utils.json_to_sheet(rows);
   ws['!cols'] = [
     { wch: 6 }, { wch: 14 }, { wch: 15 }, { wch: 24 }, { wch: 12 },
     { wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 14 },
     { wch: 16 }, { wch: 18 }, { wch: 15 }, { wch: 22 }
   ];
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, 'DanhSach_PhieuMuon');
   const dateStr = new Date().toISOString().slice(0, 10);
   XLSX.writeFile(wb, `SmartLib_PhieuMuon_${filter}_${dateStr}.xlsx`);
   showToast(`Đã xuất ${rows.length} phiếu mượn ra file Excel!`);
 }
    function exportBooksExcel() {
      const rows = db.books.map(b => ({ MaSach: b.code, TenSach: b.title, TacGia: b.author, TheLoai: b.category, NXB: b.publisher, NamXB: b.publishYear, SoTrang: b.pages, KeSach: b.shelf, TongSoBan: b.total, HienCon: b.available }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DanhMucSach');
      XLSX.writeFile(wb, 'SmartLib_Danh_Muc_Sach.xlsx');
    }

    function downloadUserTemplate() {
      const rows = [
        {
          MaThe: 'HS12A3-01',
          HoTen: 'Phạm Hoàng Nam',
          DoiTuong: 'Học sinh',
          GioiTinh: 'Nam',
          NgaySinh: '2008-05-15',
          LopDonVi: '12A3',
          Email: 'namph@pct.edu.vn',
          SoDienThoai: '0905123456',
          MatKhau: '123456',
          NamHoc: '2026-2027'
        },
        {
          MaThe: 'GV-TIN01',
          HoTen: 'Thầy Nguyễn Vũ Long',
          DoiTuong: 'Giáo viên',
          GioiTinh: 'Nam',
          NgaySinh: '1985-11-20',
          LopDonVi: 'Tin học',
          Email: 'longnv@pct.edu.vn',
          SoDienThoai: '0905987654',
          MatKhau: '123456',
          NamHoc: '2026-2027'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 15 }, // MaThe
        { wch: 24 }, // HoTen
        { wch: 14 }, // DoiTuong
        { wch: 12 }, // GioiTinh
        { wch: 14 }, // NgaySinh
        { wch: 16 }, // LopDonVi
        { wch: 24 }, // Email
        { wch: 15 }, // SoDienThoai
        { wch: 12 }, // MatKhau
        { wch: 14 }  // NamHoc
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mau_DocGia");
      XLSX.writeFile(wb, "Mau_DanhSach_DocGia_SmartLib.xlsx");
    }
    function parseBirthDate(val) {
      if (!val) return '';
      if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
      }
      const s = String(val).trim();
      if (!s) return '';
      const slashParts = s.split(/[\/\.]/);
      if (slashParts.length === 3 && slashParts[0].length <= 2 && slashParts[2].length === 4) {
        const d = slashParts[0].padStart(2, '0');
        const m = slashParts[1].padStart(2, '0');
        const y = slashParts[2];
        return `${y}-${m}-${d}`;
      }
      return s;
    }

    function handleImportUsersExcel(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        const defaultYear = db.currentSchoolYear && db.currentSchoolYear !== 'ALL' ? db.currentSchoolYear : '2026-2027';
        let count = 0;
        let updated = 0;
        const changedMap = new Map();

        rows.forEach((r, idx) => {
          const cardCode = String(r.MaThe || r.CardCode || r['Mã thẻ'] || r['Mã Thẻ'] || r['Mã thẻ / Username'] || r['Mã học sinh'] || '').trim().toUpperCase();
          const fullName = String(r.HoTen || r.FullName || r['Họ và tên'] || r['Họ và Tên'] || r['Họ tên'] || '').trim();
          if (!cardCode || !fullName) return;

          const rawPass = r.MatKhau ?? r['Mật khẩu'] ?? r['Mật Khẩu'] ?? r.Password ?? r['MK'] ?? r.mat_khau;
          let cleanPass = String(rawPass ?? '').trim();
          if (!cleanPass || cleanPass === 'null' || cleanPass === 'undefined' || cleanPass === '********' || cleanPass.startsWith('SHA-256') || cleanPass === 'Đã đổi riêng') {
            cleanPass = '123456';
          }

          // Nhận diện cột Đối tượng độc giả (Học sinh vs Giáo viên)
          const rawType = String(r.DoiTuong || r['Đối tượng'] || r['Đối Tượng'] || r.UserType || r.Target || '').toLowerCase().trim();
          let parsedType = '';
          if (rawType.includes('giáo viên') || rawType.includes('gv') || rawType.includes('cán bộ') || rawType === 'teacher') {
            parsedType = 'teacher';
          } else if (rawType.includes('học sinh') || rawType.includes('hs') || rawType === 'student') {
            parsedType = 'student';
          } else {
            const grp = String(r.LopDonVi || r.Group || r['Lớp'] || r['Lớp/Tổ'] || r['Lớp / Tổ'] || '').toLowerCase();
            const nm = fullName.toLowerCase();
            if (cardCode.startsWith('GV') || nm.startsWith('thầy') || nm.startsWith('cô') || grp.includes('tổ') || grp.includes('bộ môn') || /^(tin|toán|văn|anh|lý|hóa|sinh|sử|địa|gdcd|thể dục|công nghệ|giáo viên)/i.test(grp)) {
              parsedType = 'teacher';
            } else {
              parsedType = 'student';
            }
          }

          const existingIdx = db.users.findIndex(u => String(u.cardCode).toUpperCase() === cardCode);
          if (existingIdx > -1) {
            const u = db.users[existingIdx];
            const shouldResetPass = cleanPass !== '123456' || isDefaultReaderPassword(u.password);
            const updatedObj = {
              ...u,
              userType: parsedType || u.userType || getUserType(u),
              fullName,
              gender: String(r.GioiTinh || r.Gender || r['Giới tính'] || r['Giới Tính'] || u.gender || '').trim(),
              birthDate: parseBirthDate(r.NgaySinh || r.BirthDate || r['Ngày sinh'] || r['Ngày Sinh'] || u.birthDate || ''),
              group: String(r.LopDonVi || r.Group || r['Lớp'] || r['Lớp/Tổ'] || r['Lớp / Tổ'] || u.group || '').trim(),
              email: String(r.Email || u.email || '').trim(),
              phone: String(r.SoDienThoai || r.Phone || r['Số điện thoại'] || r['Số ĐT'] || u.phone || '').trim(),
              password: shouldResetPass ? hashPassword(cleanPass) : u.password,
              schoolYear: String(r.NamHoc || r.SchoolYear || r['Năm học'] || u.schoolYear || defaultYear).trim()
            };
            db.users[existingIdx] = updatedObj;
            changedMap.set(cardCode, updatedObj);
            updated++;
          } else {
            const newObj = {
              id: Date.now() + idx,
              cardCode,
              fullName,
              userType: parsedType,
              gender: String(r.GioiTinh || r.Gender || r['Giới tính'] || r['Giới Tính'] || '').trim(),
              birthDate: parseBirthDate(r.NgaySinh || r.BirthDate || r['Ngày sinh'] || r['Ngày Sinh'] || ''),
              group: String(r.LopDonVi || r.Group || r['Lớp'] || r['Lớp/Tổ'] || r['Lớp / Tổ'] || 'Chưa xếp lớp').trim(),
              email: String(r.Email || '').trim(),
              phone: String(r.SoDienThoai || r.Phone || r['Số điện thoại'] || r['Số ĐT'] || '').trim(),
              password: hashPassword(cleanPass),
              schoolYear: String(r.NamHoc || r.SchoolYear || r['Năm học'] || defaultYear).trim(),
              status: 'active'
            };
            db.users.push(newObj);
            changedMap.set(cardCode, newObj);
            count++;
          }
        });

        if (isCloudConnected && supabaseClient && changedMap.size > 0) {
          try {
            showToast('Đang đồng bộ danh sách độc giả lên Supabase Cloud...');
            await upsertInChunks('readers', Array.from(changedMap.values()).map(mapReaderToDB), 'card_code');
            await syncFromCloud(false);
          } catch (err) {
            showNoticeModal('Lỗi nhập Excel', err.message || 'Không thể lưu độc giả lên Supabase Cloud!');
            event.target.value = '';
            return;
          }
        } else {
          await saveDB('users');
        }
        renderAdminUsers();
        renderAdminStats();
        showNoticeModal('Nhập thành công', `Đã cập nhật dữ liệu từ file Excel:\n- Độc giả thêm mới: ${count}\n- Độc giả cập nhật thông tin: ${updated}`);
        event.target.value = '';
      };
      reader.readAsArrayBuffer(file);
    }
    
    function exportFullBackupJSON() {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `SmartLib_Backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
    }

    function importFullBackupJSON(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed.books && parsed.users) {
            db.books = parsed.books;
            db.users = parsed.users.map(u => ({ ...u, schoolYear: u.schoolYear || '2026-2027' }));
            db.borrows = parsed.borrows || [];
            if (isCloudConnected && supabaseClient) {
              showToast('Đang khôi phục Sách & Độc giả lên Supabase Cloud...');
              if (db.books.length > 0) await upsertInChunks('books', db.books.map(mapBookToDB), 'code');
              if (db.users.length > 0) await upsertInChunks('readers', db.users.map(mapReaderToDB), 'card_code');
              await syncFromCloud(false);
            } else {
              await saveDB('ALL');
            }
            showToast('Đã khôi phục và đồng bộ dữ liệu thành công!');
          }
        } catch (err) { showNoticeModal('Lỗi tập tin', err?.message || 'File JSON sao lưu không hợp lệ!'); }
      };
      reader.readAsText(file);
    }

