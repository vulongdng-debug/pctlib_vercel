    // ==================== QUẢN LÝ XEM CHI TIẾT & XÓA PHIẾU MƯỢN ====================
    let currentDetailBorrowId = null;

    function openBorrowDetailModal(borrowId) {
      const b = db.borrows.find(x => x.id === borrowId);
      if (!b) return;
      currentDetailBorrowId = b.id;

      const user = db.users.find(u => u.id === b.userId) || { fullName: 'Độc giả đã xóa', cardCode: '---', group: '---', email: '', phone: '' };
      const book = db.books.find(x => x.id === b.bookId) || { title: 'Sách đã xóa', code: '---', category: '---', shelf: '---' };
      const fine = calculateFine(b);
      const isTeacher = getUserType(user) === 'teacher';

      document.getElementById('detailBorrowTicketCode').textContent = b.ticketCode;
      renderBarcodeSvg('#detailBorrowBarcodeSvg', b.ticketCode, { height: 36, fontSize: 11, margin: 2 });

      // Cập nhật badge trạng thái
      const badge = document.getElementById('detailBorrowStatusBadge');
      if (b.status === 'pending') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30';
        badge.textContent = 'Chờ duyệt Online';
      } else if (b.status === 'returned') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
        badge.textContent = `Đã hoàn trả (${b.returnDate || ''})`;
      } else if (fine > 0) {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30';
        badge.textContent = 'Quá hạn';
      } else {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30';
        badge.textContent = 'Đang mượn';
      }

      // Thông tin bạn đọc
      document.getElementById('detailBorrowUserName').textContent = user.fullName + (isTeacher ? ' (Giáo viên)' : ' (Học sinh)');
      document.getElementById('detailBorrowUserGroup').innerHTML = `${isTeacher ? 'Tổ bộ môn:' : 'Lớp:'} <strong>${user.group || '---'}</strong>`;
      document.getElementById('detailBorrowUserCard').innerHTML = `Mã số thẻ: <strong class="text-indigo-700 font-mono">${user.cardCode}</strong>`;
      document.getElementById('detailBorrowUserContact').textContent = `${user.email || 'Chưa có email'} ${user.phone ? '• ' + user.phone : ''}`;

      // Thông tin sách
      document.getElementById('detailBorrowBookTitle').textContent = book.title;
      document.getElementById('detailBorrowBookCode').innerHTML = `Mã sách: <strong class="text-blue-700 font-mono">${book.code}</strong>`;
      document.getElementById('detailBorrowBookCategory').textContent = `Thể loại: ${book.category || '---'}`;
      document.getElementById('detailBorrowBookShelf').innerHTML = `Vị trí kệ: <strong>${book.shelf || 'Chưa xếp kệ'}</strong>`;

      // Thời gian
      document.getElementById('detailBorrowDate').textContent = b.borrowDate || '---';
      document.getElementById('detailBorrowDueDate').textContent = b.dueDate || '---';
      document.getElementById('detailBorrowSchoolYear').textContent = b.schoolYear || db.currentSchoolYear || '2026-2027';
      const staffNote = b.returnedBy ? ` (Thu hồi: ${b.returnedBy})` : (b.processedBy ? ` (Duyệt/Lập: ${b.processedBy})` : '');
      document.getElementById('detailBorrowReturnDate').textContent = (b.status === 'returned' ? (b.returnDate || 'Đã hoàn trả') : 'Chưa hoàn trả') + staffNote;

      // Thao tác nhanh bên trong popup chi tiết (kèm nút gửi Email)
      const actionArea = document.getElementById('detailBorrowActionArea');
      if (b.status === 'pending') {
        actionArea.innerHTML = `
          <button type="button" onclick="approvePendingBorrow(${b.id}); closeBorrowDetailModal();" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm">
            <i class="ph-bold ph-check-circle"></i> Xác nhận mượn (Gửi Email)
          </button>
        `;
      } else if (b.status === 'borrowing') {
        actionArea.innerHTML = `
          <button type="button" onclick="markBorrowReturned(${b.id}); closeBorrowDetailModal();" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm">
            <i class="ph-bold ph-arrow-counter-clockwise"></i> Thu hồi / Trả sách
          </button>
          <button type="button" onclick="sendOverdueEmail(${b.id})" class="px-3.5 py-2 rounded-xl ${isOverdue(b) ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} font-bold transition flex items-center gap-1.5 shadow-sm">
            <i class="ph-bold ph-envelope-simple"></i> ${isOverdue(b) ? 'Gửi Email báo quá hạn' : 'Gửi Email nhắc hạn'}
          </button>
        `;
      } else {
        actionArea.innerHTML = '';
      }

      document.getElementById('borrowDetailModal').classList.remove('hidden');
    }

    function closeBorrowDetailModal() {
      const modal = document.getElementById('borrowDetailModal');
      if (modal) modal.classList.add('hidden');
      currentDetailBorrowId = null;
    }

    function deleteBorrowFromModal() {
      if (currentDetailBorrowId) {
        deleteBorrowTicket(currentDetailBorrowId);
      }
    }

    function deleteBorrowTicket(borrowId) {
      const b = db.borrows.find(x => x.id === borrowId);
      if (!b) return;
      const user = db.users.find(u => u.id === b.userId) || { fullName: 'Độc giả đã xóa' };
      const book = db.books.find(x => x.id === b.bookId) || { title: 'Sách đã xóa' };

      openCustomConfirmDialog(
        'Xóa phiếu mượn',
        `Bạn có chắc chắn muốn xóa vĩnh viễn phiếu mượn "${b.ticketCode}" (${book.title} - ${user.fullName})? Thao tác này không thể hoàn tác!`,
        async () => {
          const actorName = db.currentUser ? `${db.currentUser.fullName} (${db.currentUser.username || 'Admin'})` : 'Thủ thư';
          if (isCloudConnected && supabaseClient) {
            const { data: res, error } = await supabaseClient.rpc('staff_delete_borrow_atomic', {
              p_borrow_id: borrowId,
              p_actor_name: actorName
            });
            if (error || !res || !res.success) {
              showNoticeModal('Lỗi xóa phiếu', res?.error || error?.message || 'Không thể xóa phiếu trên Cloud!');
              return;
            }
          }
          if (b.status === 'borrowing' || b.status === 'pending') {
            const bk = db.books.find(x => x.id === b.bookId);
            if (bk) {
              bk.available = Math.min(bk.total, bk.available + 1);
            }
          }
          db.borrows = db.borrows.filter(x => x.id !== borrowId);
          await saveDB('ALL');
          closeBorrowDetailModal();
          showToast(`Đã xóa vĩnh viễn phiếu mượn ${b.ticketCode}!`);
        }
      );
    }
    
    // ==================== CRUD & DIALOGS ====================
    function openBookModal(id = null) {
      document.getElementById('bookFormModal').classList.remove('hidden');
      if (!id) {
        document.getElementById('editBookId').value = '';
        document.getElementById('formBookCode').value = '';
        document.getElementById('formBookTitle').value = '';
        document.getElementById('formBookAuthor').value = '';
        document.getElementById('formBookPublisher').value = '';
        document.getElementById('formBookShelf').value = '';
        document.getElementById('formBookTotal').value = 5;
        document.getElementById('formBookAvailable').value = 5;
        document.getElementById('formBookYear').value = '';
        document.getElementById('formBookPages').value = '';
        document.getElementById('formBookDesc').value = '';
        document.getElementById('formBookFeatured').checked = false;
      } else {
        const b = db.books.find(x => x.id === id);
        if (!b) return;
        document.getElementById('editBookId').value = b.id;
        document.getElementById('formBookCode').value = b.code;
        document.getElementById('formBookCategory').value = b.category;
        document.getElementById('formBookTitle').value = b.title;
        document.getElementById('formBookAuthor').value = b.author;
        document.getElementById('formBookPublisher').value = b.publisher || '';
        document.getElementById('formBookShelf').value = b.shelf || '';
        document.getElementById('formBookTotal').value = b.total;
        document.getElementById('formBookAvailable').value = b.available;
        document.getElementById('formBookDesc').value = b.desc || '';
        document.getElementById('formBookFeatured').checked = !!b.featured;
        document.getElementById('formBookYear').value = b.publishYear || '';
        document.getElementById('formBookPages').value = b.pages || '';
      }
    }

    function closeBookModal() {
      document.getElementById('bookFormModal').classList.add('hidden');
    }

    async function saveBookForm(e) {
      e.preventDefault();
      const id = document.getElementById('editBookId').value;
      const payload = {
        code: document.getElementById('formBookCode').value.trim().toUpperCase(),
        category: document.getElementById('formBookCategory').value,
        title: document.getElementById('formBookTitle').value.trim(),
        author: document.getElementById('formBookAuthor').value.trim(),
        publisher: document.getElementById('formBookPublisher').value.trim(),
        shelf: document.getElementById('formBookShelf').value.trim(),
        total: Number(document.getElementById('formBookTotal').value),
        available: Number(document.getElementById('formBookAvailable').value),
        desc: document.getElementById('formBookDesc').value.trim(),
        featured: document.getElementById('formBookFeatured').checked,
        publishYear: document.getElementById('formBookYear').value.trim(),
        pages: document.getElementById('formBookPages').value.trim(),
      };

      if (isCloudConnected && supabaseClient) {
        try {
          const rowPayload = mapBookToDB(payload);
          if (id) {
            const { data, error } = await supabaseClient.from('books').update(rowPayload).eq('id', Number(id)).select().single();
            if (error) throw error;
            const idx = db.books.findIndex(x => x.id == id);
            if (idx > -1) db.books[idx] = mapBookFromDB(data);
          } else {
            const { data, error } = await supabaseClient.from('books').insert(rowPayload).select().single();
            if (error) throw error;
            db.books.unshift(mapBookFromDB(data));
          }
          await saveDB('books');
          closeBookModal();
          showToast('Đã lưu thông tin sách lên Supabase Cloud thành công!');
          return;
        } catch (err) {
          showNoticeModal('Lỗi lưu sách', err.message || 'Mã sách có thể bị trùng hoặc bạn chưa có quyền ghi!');
          return;
        }
      }

      if (id) {
        const idx = db.books.findIndex(x => x.id == id);
        if (idx > -1) db.books[idx] = { ...db.books[idx], ...payload };
      } else {
        db.books.unshift({ id: Date.now(), ...payload });
      }
      await saveDB('books');
      closeBookModal();
      showToast('Đã lưu thông tin sách thành công!');
    }

function deleteBook(id) {
      const b = db.books.find(x => x.id === id);
      const activeCount = db.borrows.filter(br => br.bookId === id && (br.status === 'borrowing' || br.status === 'pending')).length;
      if (activeCount > 0) {
        showNoticeModal('Không thể xóa sách', `Đầu sách "${b ? b.title : ''}" hiện đang có ${activeCount} phiếu đang mượn hoặc chờ duyệt. Vui lòng thu hồi sách trước khi xóa!`);
        return;
      }
      openCustomConfirmDialog(
        'Xóa đầu sách',
        `Bạn có chắc chắn muốn xóa sách "${b ? b.title : ''}" khỏi danh mục?`,
        async () => {
          if (isCloudConnected && supabaseClient) {
            const { error } = await supabaseClient.from('books').delete().eq('id', id);
            if (error) {
              showNoticeModal('Không thể xóa sách', error.message || 'Sách đang có lịch sử phiếu mượn liên kết trên CSDL!');
              return;
            }
          }
          db.books = db.books.filter(x => x.id !== id);
          await saveDB('books');
          showToast('Đã xóa đầu sách.');
        }
      );
    }
    function openUserModal(id = null) {
      document.getElementById('userFormModal').classList.remove('hidden');
      const defaultYear = db.currentSchoolYear && db.currentSchoolYear !== 'ALL' ? db.currentSchoolYear : '2026-2027';
      if (!id) {
        document.getElementById('editUserId').value = '';
        document.getElementById('formUserCode').value = '';
        document.getElementById('formUserGroup').value = '';
        document.getElementById('formUserName').value = '';
        document.getElementById('formUserGender').value = 'Nam';
        document.getElementById('formUserBirthDate').value = '';
        document.getElementById('formUserEmail').value = '';
        document.getElementById('formUserPhone').value = '';
        document.getElementById('formUserPassword').value = '123456';
        document.getElementById('formUserSchoolYear').value = defaultYear;
        const radStudent = document.getElementById('formUserTypeStudent');
        if (radStudent) radStudent.checked = true;
        handleUserTypeChange('student');
      } else {
        const u = db.users.find(x => x.id === id);
        if (!u) return;
        const uType = getUserType(u);
        const rad = document.getElementById(uType === 'teacher' ? 'formUserTypeTeacher' : 'formUserTypeStudent');
        if (rad) rad.checked = true;
        handleUserTypeChange(uType);

        document.getElementById('editUserId').value = u.id;
        document.getElementById('formUserCode').value = u.cardCode;
        document.getElementById('formUserGroup').value = u.group;
        document.getElementById('formUserName').value = u.fullName;
        document.getElementById('formUserGender').value = u.gender || 'Nam';
        document.getElementById('formUserBirthDate').value = u.birthDate || '';
        document.getElementById('formUserEmail').value = u.email || '';
        document.getElementById('formUserPhone').value = u.phone || '';
        document.getElementById('formUserPassword').value = isDefaultReaderPassword(u.password) ? '123456' : '********';
        document.getElementById('formUserSchoolYear').value = u.schoolYear || defaultYear;
      }
    }

    function closeUserModal() {
      document.getElementById('userFormModal').classList.add('hidden');
    }

    async function saveUserForm(e) {
      e.preventDefault();
      const id = document.getElementById('editUserId').value;
      const selectedType = document.querySelector('input[name="formUserType"]:checked')?.value || 'student';
      const rawGroup = document.getElementById('formUserGroup').value.trim();
      const cleanGroup = selectedType === 'student' ? rawGroup.replace(/^lớp\s+/i, '') : rawGroup.replace(/^tổ\s+/i, '');
      const rawPassword = document.getElementById('formUserPassword').value.trim() || '123456';
      if (rawPassword !== '********' && rawPassword.length < 6) {
        showNoticeModal('Mật khẩu quá ngắn', 'Mật khẩu độc giả phải có tối thiểu 6 ký tự!');
        return;
      }
      const payload = {
        userType: selectedType,
        cardCode: document.getElementById('formUserCode').value.trim().toUpperCase(),
        group: cleanGroup,
        fullName: document.getElementById('formUserName').value.trim(),
        gender: document.getElementById('formUserGender').value || 'Nam',
        birthDate: document.getElementById('formUserBirthDate').value || '',
        email: document.getElementById('formUserEmail').value.trim(),
        phone: document.getElementById('formUserPhone').value.trim() || '',
        password: rawPassword,
        schoolYear: document.getElementById('formUserSchoolYear').value || '2026-2027'
      };

      if (isCloudConnected && supabaseClient) {
        try {
          if (id) {
            const idx = db.users.findIndex(x => x.id == id);
            const oldUser = idx > -1 ? db.users[idx] : {};
            const keepOldPass = payload.password === '********';
            const merged = {
              ...oldUser,
              ...payload,
              password: keepOldPass ? oldUser.password : hashPassword(payload.password)
            };
            const { data, error } = await supabaseClient.from('readers').update(mapReaderToDB(merged)).eq('id', Number(id)).select().single();
            if (error) throw error;
            if (idx > -1) db.users[idx] = mapReaderFromDB(data);
          } else {
            payload.password = hashPassword(payload.password);
            const { data, error } = await supabaseClient.from('readers').insert(mapReaderToDB({ status: 'active', ...payload })).select().single();
            if (error) throw error;
            db.users.push(mapReaderFromDB(data));
          }
          await saveDB('users');
          closeUserModal();
          showToast('Đã lưu thông tin bạn đọc lên Supabase Cloud!');
          return;
        } catch (err) {
          showNoticeModal('Lỗi lưu bạn đọc', err.message || 'Mã thẻ có thể bị trùng hoặc bạn chưa có quyền ghi!');
          return;
        }
      }

      if (id) {
        const idx = db.users.findIndex(x => x.id == id);
        if (idx > -1) {
          const keepOldPass = payload.password === '********';
          db.users[idx] = {
            ...db.users[idx],
            ...payload,
            password: keepOldPass ? db.users[idx].password : hashPassword(payload.password)
          };
        }
      } else {
        payload.password = hashPassword(payload.password);
        db.users.push({ id: Date.now(), status: 'active', ...payload });
      }
      await saveDB('users');
      closeUserModal();
      showToast('Đã lưu thông tin bạn đọc thành công!');
    }

    async function toggleUserLock(id) {
      const u = db.users.find(x => x.id === id);
      if (!u) return;
      const nextStatus = u.status === 'active' ? 'locked' : 'active';
      if (isCloudConnected && supabaseClient) {
        const { error } = await supabaseClient.from('readers').update({ status: nextStatus }).eq('id', id);
        if (error) {
          showNoticeModal('Lỗi cập nhật', error.message || 'Không thể đổi trạng thái thẻ!');
          return;
        }
      }
      u.status = nextStatus;
      await saveDB('users');
      showToast(`Đã đổi trạng thái thẻ ${u.cardCode}`);
    }

   function deleteUser(id) {
      const u = db.users.find(x => x.id === id);
      const activeCount = db.borrows.filter(br => br.userId === id && (br.status === 'borrowing' || br.status === 'pending')).length;
      if (activeCount > 0) {
        showNoticeModal('Độc giả đang giữ sách', `Độc giả "${u ? u.fullName : ''}" hiện còn ${activeCount} cuốn sách đang mượn/chờ duyệt chưa hoàn trả. Vui lòng thu hồi sách trước khi xóa thẻ!`);
        return;
      }
      openCustomConfirmDialog(
        'Xóa thẻ độc giả',
        `Xóa độc giả "${u ? u.fullName : ''}" (${u ? u.cardCode : ''}) khỏi hệ thống?`,
        async () => {
          if (isCloudConnected && supabaseClient) {
            const { error } = await supabaseClient.from('readers').delete().eq('id', id);
            if (error) {
              showNoticeModal('Lỗi xóa độc giả', error.message || 'Không thể xóa độc giả trên Cloud!');
              return;
            }
          }
          db.users = db.users.filter(x => x.id !== id);
          await saveDB('users');
          showToast('Đã xóa độc giả.');
        }
      );
    }

