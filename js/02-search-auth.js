    function showToast(msg) {
      const box = document.getElementById('toastBox');
      document.getElementById('toastMessage').textContent = msg;
      box.classList.remove('hidden');
      setTimeout(() => box.classList.add('hidden'), 3200);
    }

    function getOverdueDays(borrow) {
      if (!borrow || borrow.status === 'returned' || borrow.status === 'pending') return 0;
      const user = db.users.find(u => u.id === borrow.userId);
      if (user && getUserType(user) === 'teacher') return 0;

      const today = new Date();
      today.setHours(0,0,0,0);
      const due = new Date(borrow.dueDate);
      due.setHours(0,0,0,0);
      const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }

    function calculateFine(borrow) {
      return 0;
    }

    function isOverdue(borrow) {
      return getOverdueDays(borrow) > 0;
    }

    function removeVietnameseTones(str) {
      if (str === null || str === undefined) return '';
      const s = String(str).trim();
      if (s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
      return s.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                .toLowerCase();
    }

    function highlightKeyword(text, keyword) {
      const cleanT = escapeHtml(cleanNullText(text));
      if (!keyword || !cleanT) return cleanT;
      const kw = escapeHtml(String(keyword).trim());
      if (kw.toLowerCase() === 'null' || kw.toLowerCase() === 'undefined') return cleanT;
      try {
        const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return cleanT.replace(regex, '<mark class="search-highlight">$1</mark>');
      } catch (e) {
        return cleanT;
      }
    }

    let publicSearchDebounceTimer = null;
    function handleSearchInput(rawVal) {
      const inputVal = (rawVal || '').trim();
      const clearBtn = document.getElementById('clearSearchBtn');
      const dropdown = document.getElementById('searchSuggestionsDropdown');

      clearBtn.classList.toggle('hidden', inputVal.length === 0);

      clearTimeout(publicSearchDebounceTimer);
      publicSearchDebounceTimer = setTimeout(() => {
        executePublicSearch(inputVal);
      }, 220);
    }

    function executePublicSearch(inputVal) {
      const dropdown = document.getElementById('searchSuggestionsDropdown');
      const content = document.getElementById('suggestionsContent');

      renderPublicBooks();

      // Tuyệt đối không gợi ý nếu từ khóa rỗng HOẶC là từ "null" / "undefined"
      if (inputVal.length < 1 || inputVal.toLowerCase() === 'null' || inputVal.toLowerCase() === 'undefined') {
        dropdown.classList.add('hidden');
        activeSuggestionsList = [];
        currentFocusSuggestionIndex = -1;
        return;
      }

      const cleanQuery = removeVietnameseTones(inputVal);
      const matchedBooks = db.books.filter(b => {
        const normTitle = removeVietnameseTones(b.title);
        const normAuthor = removeVietnameseTones(b.author);
        const normCode = removeVietnameseTones(b.code);
        return normTitle.includes(cleanQuery) || normAuthor.includes(cleanQuery) || normCode.includes(cleanQuery);
      });

      activeSuggestionsList = matchedBooks;
      currentFocusSuggestionIndex = -1;

      if (matchedBooks.length === 0) {
        content.innerHTML = `
          <div class="p-5 text-center text-slate-400">
            <i class="ph ph-magnifying-glass text-2xl mb-1 block"></i>
            Không tìm thấy tên sách hay tác giả nào phù hợp với từ khóa "<strong>${escapeHtml(inputVal)}</strong>".
          </div>
        `;
        dropdown.classList.remove('hidden');
        return;
      }

      content.innerHTML = matchedBooks.slice(0, 7).map((b, idx) => {
        const titleHighlighted = highlightKeyword(b.title, inputVal);
        const authorHighlighted = highlightKeyword(b.author, inputVal);
        const isMatchedAuthor = removeVietnameseTones(b.author).includes(cleanQuery);

        const stockTag = b.available > 0
          ? `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Còn ${b.available} cuốn</span>`
          : `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">Tạm hết</span>`;

        return `
          <div 
            id="suggestion-item-${idx}" 
            onclick="selectSuggestionBook(${b.id})" 
            class="autocomplete-item p-3.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 transition">
            <div class="flex items-start gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg ${isMatchedAuthor ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center shrink-0 mt-0.5 text-base">
                <i class="ph-bold ${isMatchedAuthor ? 'ph-user' : 'ph-book-bookmark'}"></i>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">${b.code}</span>
                  ${isMatchedAuthor ? '<span class="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">Khớp Tác Giả</span>' : ''}
                </div>
                <h4 class="font-bold text-slate-900 text-sm truncate mt-0.5">${titleHighlighted}</h4>
                <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span>Tác giả: <strong>${authorHighlighted}</strong></span>
                  <span>•</span>
                  <span>${b.category}</span>
                  <span>•</span>
                  <span class="text-slate-600 font-medium">${b.shelf || 'Kệ A1'}</span>
                </p>
              </div>
            </div>
            <div class="shrink-0 text-right">${stockTag}</div>
          </div>
        `;
      }).join('');

      dropdown.classList.remove('hidden');
    }

    function clearSearchInput() {
      const input = document.getElementById('publicSearchInput');
      input.value = '';
      handleSearchInput('');
      input.focus();
    }

    function selectSuggestionBook(bookId) {
      const book = db.books.find(b => b.id === bookId);
      if (book) {
        document.getElementById('publicSearchInput').value = book.title;
        document.getElementById('searchSuggestionsDropdown').classList.add('hidden');
        renderPublicBooks();
        openBookDetailModal(book.id);
      }
    }

    function handleSearchKeyDown(e) {
      const dropdown = document.getElementById('searchSuggestionsDropdown');
      if (dropdown.classList.contains('hidden') || activeSuggestionsList.length === 0) return;

      const items = activeSuggestionsList.slice(0, 7);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentFocusSuggestionIndex = (currentFocusSuggestionIndex + 1) % items.length;
        updateSuggestionFocus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentFocusSuggestionIndex = (currentFocusSuggestionIndex - 1 + items.length) % items.length;
        updateSuggestionFocus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentFocusSuggestionIndex >= 0 && currentFocusSuggestionIndex < items.length) {
          selectSuggestionBook(items[currentFocusSuggestionIndex].id);
        } else if (items.length > 0) {
          selectSuggestionBook(items[0].id);
        }
      } else if (e.key === 'Escape') {
        dropdown.classList.add('hidden');
      }
    }

    function updateSuggestionFocus() {
      const items = document.querySelectorAll('.autocomplete-item');
      items.forEach((item, idx) => {
        if (idx === currentFocusSuggestionIndex) {
          item.classList.add('active', 'bg-blue-50/70');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('active', 'bg-blue-50/70');
        }
      });
    }

    document.addEventListener('click', function(e) {
      const container = document.getElementById('searchBoxContainer');
      if (container && !container.contains(e.target)) {
        document.getElementById('searchSuggestionsDropdown')?.classList.add('hidden');
      }
    });

    function renderAuthHeader() {
      const container = document.getElementById('authHeaderArea');
      const adminNavBtn = document.getElementById('nav-admin-dashboard');
      const mobileAdminNavBtn = document.getElementById('mobile-nav-admin-dashboard');
      const mobileNavContainer = document.getElementById('mobileNavLinks');
      const visualToolbar = document.getElementById('visualEditorToolbar');
      const adminBadges = document.getElementById('adminHeaderBadges');
      const user = db.currentUser;
      const isAdmin = user && user.role === 'admin';

      if (adminBadges) {
        adminBadges.classList.toggle('hidden', !isAdmin);
      }

      if (!user) {
        if (adminNavBtn) adminNavBtn.classList.add('hidden');
        if (mobileAdminNavBtn) mobileAdminNavBtn.classList.add('hidden');
        if (mobileNavContainer) mobileNavContainer.className = 'grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-xl';
        if (visualToolbar) visualToolbar.style.display = 'none';
        container.innerHTML = `
          <button onclick="openAuthModal('login')" class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5">
            <i class="ph-bold ph-sign-in text-sm sm:text-base"></i> <span class="inline">Đăng nhập</span>
          </button>
        `;
        return;
      }

      if (user.role === 'admin') {
        const isSuperAdmin = user.isSuperAdmin !== false && !user.isStaff;
        if (adminNavBtn) { adminNavBtn.classList.remove('hidden'); adminNavBtn.classList.add('flex'); }
        if (mobileAdminNavBtn) { mobileAdminNavBtn.classList.remove('hidden'); mobileAdminNavBtn.classList.add('flex'); }
        if (mobileNavContainer) { mobileNavContainer.className = 'grid grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-xl'; }
        // Chỉ hiện thanh công cụ Bật sửa chữ & Đổi màu cho Quản trị trưởng (Super Admin), ẩn với Thủ thư
        if (visualToolbar) visualToolbar.style.display = isSuperAdmin ? 'flex' : 'none';
        container.innerHTML = `
          <div class="flex items-center gap-1.5 sm:gap-2">
            <div class="text-right hidden sm:block">
              <span class="text-xs font-bold ${user.isStaff ? 'text-purple-700 bg-purple-50 border-purple-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200'} border px-2 py-0.5 rounded-full">
                ${user.isStaff ? (user.roleTitle || 'Thủ thư') : 'Quản trị trưởng (Admin)'}
              </span>
              <p class="text-xs font-semibold text-slate-800 mt-0.5 truncate max-w-[140px]">${user.fullName}</p>
            </div>
            ${user.isStaff ? `
              <button onclick="openStaffChangePasswordModal()" title="Đổi mật khẩu tài khoản thủ thư" class="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1 transition">
                <i class="ph-bold ph-key text-sm sm:text-base"></i> <span class="hidden sm:inline">Đổi MK</span>
              </button>
            ` : ''}
            <button onclick="handleLogout()" title="Đăng xuất" class="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1 transition">
              <i class="ph-bold ph-sign-out text-sm sm:text-base"></i> <span class="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        `;
      } else {
        if (adminNavBtn) adminNavBtn.classList.add('hidden');
        if (mobileAdminNavBtn) mobileAdminNavBtn.classList.add('hidden');
        if (mobileNavContainer) mobileNavContainer.className = 'grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-xl';
        if (visualToolbar) visualToolbar.style.display = 'none';
        container.innerHTML = `
          <div class="flex items-center gap-1.5 sm:gap-2">
            <div onclick="switchView('reader-profile')" class="text-right cursor-pointer">
              <span class="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">${user.cardCode}</span>
              <p class="text-xs font-semibold text-slate-800 mt-0.5 truncate max-w-[110px]">${user.fullName}</p>
            </div>
            <button onclick="handleLogout()" title="Đăng xuất" class="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-semibold flex items-center gap-1 transition">
              <i class="ph-bold ph-sign-out text-sm sm:text-base"></i>
            </button>
          </div>
        `;
      }
    }

    function openAuthModal(mode = 'login') {
      document.getElementById('authModal').classList.remove('hidden');
      switchAuthTab(mode);
    }

    function closeAuthModal() {
      document.getElementById('authModal').classList.add('hidden');
      pendingTargetView = null;
    }

    function switchAuthTab(mode) {
      const loginForm = document.getElementById('loginForm');
      const regForm = document.getElementById('registerForm');
      const twoFaForm = document.getElementById('admin2faForm');
      const loginBtn = document.getElementById('authTabLoginBtn');
      const regBtn = document.getElementById('authTabRegisterBtn');

      if (twoFaForm) twoFaForm.classList.add('hidden');
      stopAdmin2FATimer();

      if (loginForm) loginForm.classList.remove('hidden');
      if (regForm) regForm.classList.add('hidden');
      if (loginBtn) loginBtn.className = 'py-3 text-blue-600 border-b-2 border-blue-600 bg-white font-semibold';
      if (regBtn) regBtn.className = 'py-3 text-slate-500 hover:text-slate-800 font-semibold';
    }

    function quickFillLogin(user, pass) {
      document.getElementById('loginUsername').value = user;
      document.getElementById('loginPassword').value = pass;
    }

    async function finalizeSupaAdminLogin(authUser, staffRow) {
      const isSuper = staffRow.role === 'super_admin';
      saveSessionUser({
        role: 'admin',
        isSuperAdmin: isSuper,
        isStaff: !isSuper,
        authUserId: authUser.id,
        staffId: staffRow.id,
        username: staffRow.username,
        fullName: staffRow.full_name,
        roleTitle: staffRow.role_title || (isSuper ? 'Quản Trị Trưởng' : 'Thủ thư'),
        permissions: staffRow.permissions || {},
        twoFactorVerified: true
      });
      await syncFromCloud(false);
      closeAuthModal();
      switchView('admin-dashboard');
      showToast(isSuper
        ? 'Đăng nhập quyền Quản trị trưởng (Admin) thành công!'
        : `Xin chào ${staffRow.full_name}! Đăng nhập quyền ${staffRow.role_title || 'Thủ thư'} thành công.`);
    }

    async function handleLoginSubmit(e) {
      e.preventDefault();
      const inputUser = document.getElementById('loginUsername').value.trim();
      const inputPass = document.getElementById('loginPassword').value.trim();

      if (!inputUser || !inputPass) {
        showNoticeModal('Thiếu thông tin', 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
        return;
      }

      // ===== CHẾ ĐỘ CLOUD SUPABASE (RLS + SUPABASE AUTH + ATOMIC RPC) =====
      if (!isCloudConnected && supabaseClient) {
        await syncFromCloud(false);
      }
      if (isCloudConnected && supabaseClient) {
        try {
          // 1. Kiểm tra xem có phải tài khoản Quản trị / Thủ thư không
          const { data: staffEmail, error: resolveErr } = await supabaseClient.rpc('resolve_staff_login_email', { p_identifier: inputUser });
          if (resolveErr) {
            showNoticeModal('Thiếu hàm RPC trên Supabase', `Lỗi: ${resolveErr.message}. Vui lòng chạy file 04_rpc_reader_and_extras.sql trong Supabase SQL Editor!`);
            return;
          }

          if (staffEmail) {
            const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({
              email: staffEmail,
              password: inputPass
            });

            if (authErr || !authData?.user) {
              const errMsg = authErr?.message || '';
              if (/not confirmed/i.test(errMsg)) {
                showNoticeModal('Tài khoản chưa xác nhận Email', 'Tài khoản trên Supabase Auth chưa được kích hoạt (Email not confirmed). Hãy vào Supabase -> Authentication -> Users để Confirm hoặc chạy lệnh SQL xác nhận email!');
              } else {
                showNoticeModal('Đăng nhập không thành công', `Sai mật khẩu tài khoản Quản trị / Thủ thư (${staffEmail})! Chi tiết: ${errMsg || 'Invalid credentials'}`);
              }
              return;
            }

            const { data: staffRow, error: staffErr } = await supabaseClient
              .from('staff_accounts')
              .select('*')
              .eq('auth_user_id', authData.user.id)
              .maybeSingle();

            if (staffErr || !staffRow) {
              await supabaseClient.auth.signOut();
              showNoticeModal('Lỗi phân quyền', 'Tài khoản Auth này chưa được liên kết trong bảng staff_accounts.');
              return;
            }
            if (staffRow.status === 'locked') {
              await supabaseClient.auth.signOut();
              showNoticeModal('Tài khoản đã bị khóa', 'Tài khoản thủ thư của bạn hiện đang bị tạm khóa. Vui lòng liên hệ Quản trị trưởng!');
              return;
            }

            setSavedReaderCred(null);
            if (staffRow.role === 'super_admin' && db.adminAccount.twoFactorEnabled !== false) {
              const trustStatus = await checkTrustedAdminDeviceAndIP();
              if (!trustStatus.trusted) {
                pendingSupaStaffAuth = { authUser: authData.user, staffRow };
                showToast(`⚠️ Phát hiện ${trustStatus.reason} — Yêu cầu xác thực OTP!`);
                await initiateAdmin2FAStep(db.adminAccount.email || staffRow.email);
                return;
              }
            }

            await finalizeSupaAdminLogin(authData.user, staffRow);
            return;
          }

          // 2. Đăng nhập Độc giả qua RPC bảo mật (Không tải 4.000 học sinh xuống trình duyệt)
          const passHash = hashPassword(inputPass);
          const isDefInput = inputPass === '123456';
          const { data: res, error: rpcErr } = await supabaseClient.rpc('reader_login_and_fetch', {
            p_card_code: inputUser,
            p_password_hash: passHash,
            p_plain_is_default: isDefInput,
            p_plain_password: inputPass
          });

          if (rpcErr) {
            showNoticeModal('Lỗi hàm đăng nhập Độc giả', `Lỗi Supabase RPC: ${rpcErr.message}. Hãy kiểm tra lại bước chạy file 04_rpc_reader_and_extras.sql!`);
            return;
          }
          if (!res || !res.success) {
            showNoticeModal('Đăng nhập không thành công', res?.error || 'Sai Mã thẻ/Email hoặc Mật khẩu!');
            return;
          }

          setSavedReaderCred({ cardCode: res.reader.cardCode, passHash, isDefaultInput: isDefInput });
          db.users = [res.reader];
          db.borrows = res.borrows || [];

          if (res.isDefaultPassword) {
            closeAuthModal();
            openFirstLoginModal(res.reader);
            return;
          }

          saveSessionUser({ role: 'reader', id: res.reader.id, cardCode: res.reader.cardCode, fullName: res.reader.fullName });
          const destination = pendingTargetView || 'reader-home';
          closeAuthModal();
          renderAll();
          switchView(destination);
          showToast(`Xin chào độc giả ${res.reader.fullName}!`);
          return;
        } catch (err) {
          console.error('Lỗi đăng nhập Cloud:', err);
          showNoticeModal('Lỗi kết nối', 'Không thể kết nối máy chủ xác thực lúc này. Vui lòng thử lại!');
          return;
        }
      }

      // ===== CHẾ ĐỘ OFFLINE (LOCAL FALLBACK) =====
      if (inputUser.toUpperCase() === String(db.adminAccount.username || 'ADMIN').toUpperCase() && verifyPassword(inputPass, db.adminAccount.password)) {
        saveSessionUser({ role: 'admin', isSuperAdmin: true, isStaff: false, username: db.adminAccount.username, fullName: db.adminAccount.fullName, twoFactorVerified: true });
        closeAuthModal();
        switchView('admin-dashboard');
        showToast('Đăng nhập quyền Quản trị trưởng (Offline) thành công!');
        return;
      }

      const foundReader = db.users.find(u =>
        (String(u.cardCode).toLowerCase() === inputUser.toLowerCase() || (u.email && u.email.toLowerCase() === inputUser.toLowerCase())) &&
        verifyPassword(inputPass, u.password || '123456')
      );
      if (!foundReader) {
        showNoticeModal('Đăng nhập không thành công', 'Sai Mã thẻ/Tài khoản hoặc Mật khẩu! Vui lòng kiểm tra lại.');
        return;
      }
      if (foundReader.status === 'locked') {
        showNoticeModal('Thẻ đang bị khóa', 'Thẻ thư viện của bạn hiện đang bị khóa. Vui lòng liên hệ Thủ thư!');
        return;
      }
      if (isDefaultReaderPassword(foundReader.password)) {
        closeAuthModal();
        openFirstLoginModal(foundReader);
        return;
      }
      saveSessionUser({ role: 'reader', id: foundReader.id, cardCode: foundReader.cardCode, fullName: foundReader.fullName });
      const destination = pendingTargetView || 'reader-home';
      closeAuthModal();
      switchView(destination);
      showToast(`Xin chào độc giả ${foundReader.fullName}!`);
    }

    async function handleRegisterSubmit(e) {
      e.preventDefault();
      const cardCode = document.getElementById('regCardCode').value.trim().toUpperCase();
      const group = document.getElementById('regGroup').value.trim().replace(/^lớp\s+/i, '');
      const fullName = document.getElementById('regFullName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value.trim();
      const activeYear = db.currentSchoolYear && db.currentSchoolYear !== 'ALL' ? db.currentSchoolYear : '2026-2027';

      if (password.length < 6) {
        showNoticeModal('Mật khẩu quá ngắn', 'Mật khẩu phải có tối thiểu 6 ký tự!');
        return;
      }

      if (isCloudConnected && supabaseClient) {
        try {
          const passHash = hashPassword(password);
          const { data: res, error } = await supabaseClient.rpc('reader_register_card', {
            p_card_code: cardCode,
            p_full_name: fullName,
            p_group_name: group,
            p_email: email,
            p_password_hash: passHash,
            p_school_year: activeYear
          });
          if (error || !res || !res.success) {
            showNoticeModal('Không thể đăng ký', res?.error || error?.message || 'Mã thẻ đã tồn tại hoặc dữ liệu không hợp lệ!');
            return;
          }
          setSavedReaderCred({ cardCode: res.reader.cardCode, passHash, isDefaultInput: false });
          db.users = [res.reader];
          db.borrows = [];
          saveSessionUser({ role: 'reader', id: res.reader.id, cardCode: res.reader.cardCode, fullName: res.reader.fullName });
          closeAuthModal();
          renderAll();
          switchView('reader-profile');
          showToast(`Đăng ký thẻ ${cardCode} thành công!`);
          return;
        } catch (err) {
          showNoticeModal('Lỗi đăng ký', err.message || 'Không thể kết nối máy chủ!');
          return;
        }
      }

      if (db.users.some(u => String(u.cardCode).toUpperCase() === cardCode)) {
        showNoticeModal('Trùng mã thẻ', 'Mã thẻ này đã tồn tại trên hệ thống! Vui lòng chọn mã thẻ khác.');
        return;
      }

      const newUser = {
        id: Date.now(),
        cardCode,
        fullName,
        group,
        email,
        phone: '',
        password,
        status: 'active',
        schoolYear: activeYear
      };
      db.users.push(newUser);
      saveSessionUser({ role: 'reader', id: newUser.id, cardCode: newUser.cardCode, fullName: newUser.fullName });
      await saveDB('users');
      closeAuthModal();
      switchView('reader-profile');
      showToast(`Đăng ký thẻ ${cardCode} thành công!`);
    }

    async function handleLogout() {
      if (typeof isVisualEditMode !== 'undefined' && isVisualEditMode) toggleVisualEditText();
      const visualToolbar = document.getElementById('visualEditorToolbar');
      if (visualToolbar) visualToolbar.style.display = 'none';

      pendingTargetView = null;
      pendingSupaStaffAuth = null;
      if (typeof posActiveReaderId !== 'undefined') posActiveReaderId = null;
      setSavedReaderCred(null);
      saveSessionUser(null);

      // Đóng toàn bộ modal đang mở (nếu có) và ẩn badge đếm của độc giả
      [
        'authModal', 'bookDetailModal', 'updateProfileModal', 'firstLoginModal',
        'securityCenterModal', 'staffFormModal', 'staffChangePasswordModal',
        'borrowDetailModal', 'bookFormModal', 'userFormModal', 'adminBorrowModal',
        'cloudConfigModal', 'promoteStudentsModal'
      ].forEach(modalId => {
        const el = document.getElementById(modalId);
        if (el) el.classList.add('hidden');
      });
      ['readerBadgeCount', 'mobileReaderBadgeCount'].forEach(bId => {
        const bEl = document.getElementById(bId);
        if (bEl) { bEl.textContent = '0'; bEl.classList.add('hidden'); }
      });

      if (isCloudConnected) {
        db.users = [];
        db.borrows = [];
        db.staffAccounts = [];
      }

      // Chuyển ngay về Trang chủ & cuộn lên đầu trang
      switchView('reader-home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      if (isCloudConnected && supabaseClient) {
        try { await supabaseClient.auth.signOut(); } catch (e) {}
        try { await syncFromCloud(false); } catch (e) {}
      }
    }
let pendingFirstLoginUser = null;

    function openFirstLoginModal(user) {
      pendingFirstLoginUser = user;
      document.getElementById('firstLoginUserId').value = user.id;
      document.getElementById('firstLoginUserName').textContent = user.fullName + ' (' + user.cardCode + ')';
      document.getElementById('firstLoginNewPass').value = '';
      document.getElementById('firstLoginConfirmPass').value = '';
      document.getElementById('firstLoginEmail').value = user.email || '';
      document.getElementById('firstLoginPhone').value = user.phone || '';
      document.getElementById('firstLoginModal').classList.remove('hidden');
    }

    async function handleFirstLoginSubmit(e) {
      e.preventDefault();
      if (!pendingFirstLoginUser) return;

      const newPass = document.getElementById('firstLoginNewPass').value.trim();
      const confirmPass = document.getElementById('firstLoginConfirmPass').value.trim();
      const email = document.getElementById('firstLoginEmail').value.trim();
      const phone = document.getElementById('firstLoginPhone').value.trim();

      if (newPass.length < 6) {
        showNoticeModal('Mật khẩu quá ngắn', 'Mật khẩu mới phải có tối thiểu 6 ký tự!');
        return;
      }
      if (newPass === '123456') {
        showNoticeModal('Mật khẩu không an toàn', 'Vui lòng không đặt lại mật khẩu mặc định 123456!');
        return;
      }
      if (newPass !== confirmPass) {
        showNoticeModal('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới!');
        return;
      }

      const newHash = hashPassword(newPass);
      if (isCloudConnected && supabaseClient) {
        const cred = getSavedReaderCred() || { passHash: hashPassword('123456'), isDefaultInput: true };
        const { data: res, error } = await supabaseClient.rpc('reader_update_profile', {
          p_reader_id: pendingFirstLoginUser.id,
          p_current_password_hash: cred.passHash,
          p_plain_is_default: Boolean(cred.isDefaultInput),
          p_new_password_hash: newHash,
          p_email: email ? sanitizeText(email) : null,
          p_phone: phone ? sanitizeText(phone) : null
        });
        if (error || !res || !res.success) {
          showNoticeModal('Lỗi cập nhật', res?.error || 'Không thể lưu mật khẩu mới lên Cloud!');
          return;
        }
        setSavedReaderCred({ cardCode: res.reader.cardCode, passHash: newHash, isDefaultInput: false });
        db.users = [res.reader];
        saveSessionUser({ role: 'reader', id: res.reader.id, cardCode: res.reader.cardCode, fullName: res.reader.fullName });
      } else {
        const userObj = db.users.find(u => u.id === pendingFirstLoginUser.id);
        if (userObj) {
          userObj.password = newHash;
          if (email) userObj.email = sanitizeText(email);
          if (phone) userObj.phone = sanitizeText(phone);
          userObj.firstLogin = false;
          saveSessionUser({ role: 'reader', id: userObj.id, cardCode: userObj.cardCode, fullName: userObj.fullName });
          await saveDB('users');
        }
      }

      document.getElementById('firstLoginModal').classList.add('hidden');
      pendingFirstLoginUser = null;
      renderAll();
      switchView('reader-profile');
      showToast('Kích hoạt tài khoản và đổi mật khẩu thành công!');
    }
    function openChangePasswordModal() {
      if (!db.currentUser || db.currentUser.role !== 'reader') return;
      const userObj = db.users.find(u => u.id === db.currentUser.id);
      openCustomPromptDialog(
        'Đổi mật khẩu thẻ thư viện (Mã hóa SHA-256)',
        'Nhập mật khẩu mới cho thẻ thư viện của bạn (tối thiểu 6 ký tự):',
        '',
        async (newPass) => {
          if (!newPass || newPass.trim().length < 6) {
            showNoticeModal('Mật khẩu quá ngắn', 'Mật khẩu phải có ít nhất 6 ký tự!');
            return;
          }
          const newHash = hashPassword(newPass.trim());
          if (isCloudConnected && supabaseClient && userObj) {
            const cred = getSavedReaderCred();
            const { data: res, error } = await supabaseClient.rpc('reader_update_profile', {
              p_reader_id: userObj.id,
              p_current_password_hash: cred?.passHash || '',
              p_plain_is_default: Boolean(cred?.isDefaultInput),
              p_new_password_hash: newHash,
              p_email: null,
              p_phone: null
            });
            if (error || !res || !res.success) {
              showNoticeModal('Lỗi đổi mật khẩu', res?.error || 'Không thể cập nhật mật khẩu trên Cloud!');
              return;
            }
            setSavedReaderCred({ cardCode: userObj.cardCode, passHash: newHash, isDefaultInput: false });
            saveSessionUser({ role: 'reader', id: userObj.id, cardCode: userObj.cardCode, fullName: userObj.fullName });
            showToast('Đã mã hóa SHA-256 và cập nhật mật khẩu mới!');
          } else if (userObj) {
            userObj.password = newHash;
            saveSessionUser({ role: 'reader', id: userObj.id, cardCode: userObj.cardCode, fullName: userObj.fullName });
            await saveDB('users');
            showToast('Đã mã hóa SHA-256 và cập nhật mật khẩu mới!');
          }
        }
      );
    }

    // ==================== CẬP NHẬT LIÊN HỆ (ĐỘC GIẢ) ====================
    function openUpdateProfileModal() {
      if (!db.currentUser) return;
      const userObj = db.users.find(u => u.id === db.currentUser.id || u.cardCode === db.currentUser.cardCode);
      if (!userObj) return;
      
      document.getElementById('profileEditEmail').value = userObj.email || '';
      document.getElementById('profileEditPhone').value = userObj.phone || '';
      document.getElementById('updateProfileModal').classList.remove('hidden');
    }

    function closeUpdateProfileModal() {
      document.getElementById('updateProfileModal').classList.add('hidden');
    }

    async function saveUpdateProfile(e) {
      e.preventDefault();
      if (!db.currentUser) return;
      const userObj = db.users.find(u => u.id === db.currentUser.id || u.cardCode === db.currentUser.cardCode);
      if (!userObj) return;

      const newEmail = sanitizeText(document.getElementById('profileEditEmail').value.trim());
      const newPhone = sanitizeText(document.getElementById('profileEditPhone').value.trim());

      if (isCloudConnected && supabaseClient) {
        const cred = getSavedReaderCred();
        const { data: res, error } = await supabaseClient.rpc('reader_update_profile', {
          p_reader_id: userObj.id,
          p_current_password_hash: cred?.passHash || '',
          p_plain_is_default: Boolean(cred?.isDefaultInput),
          p_new_password_hash: null,
          p_email: newEmail,
          p_phone: newPhone
        });
        if (error || !res || !res.success) {
          showNoticeModal('Lỗi cập nhật', res?.error || 'Không thể lưu thông tin liên hệ!');
          return;
        }
      }

      userObj.email = newEmail;
      userObj.phone = newPhone;
      if (!isCloudConnected) await saveDB('users');
      closeUpdateProfileModal();
      renderReaderProfile();
      showToast('Đã cập nhật thông tin liên hệ thành công!');
    }

    // ==================== ĐỔI MẬT KHẨU NHANH (ADMIN) ====================
    function adminQuickChangePassword(id) {
      const u = db.users.find(x => x.id === id);
      if (!u) return;
      openCustomPromptDialog(
        `Cấp lại mật khẩu (${u.cardCode})`,
        `Nhập mật khẩu mới cho độc giả ${u.fullName} (mặc định: 123456):`,
        '123456',
        async (newPass) => {
          if (!newPass || newPass.trim().length < 6) {
            showNoticeModal('Mật khẩu không hợp lệ', 'Mật khẩu phải có ít nhất 6 ký tự!');
            return;
          }
          const newHash = hashPassword(newPass.trim());
          if (isCloudConnected && supabaseClient) {
            const { error } = await supabaseClient.from('readers').update({ password_hash: newHash }).eq('id', u.id);
            if (error) {
              showNoticeModal('Lỗi cập nhật', error.message || 'Không thể cấp lại mật khẩu trên Cloud!');
              return;
            }
          }
          u.password = newHash;
          if (!isCloudConnected) await saveDB('users');
          showToast(`Đã mã hóa SHA-256 mật khẩu mới cho thẻ ${u.cardCode}!`);
        }
      );
    }

    function handleProtectedNav(targetView) {
      if (!db.currentUser) {
        pendingTargetView = targetView;
        openAuthModal('login');
        showToast('Vui lòng đăng nhập để truy cập mục này!');
        return;
      }
      if (targetView === 'admin-dashboard' && db.currentUser.role !== 'admin') {
        showNoticeModal('Từ chối truy cập', 'Khu vực này chỉ dành riêng cho Admin!');
        return;
      }
      switchView(targetView);
    }

    function switchView(viewName) {
      if (db.currentUser && !verifySessionIntegrity(db.currentUser, db)) {
        saveSessionUser(null);
        showNoticeModal('Cảnh báo bảo mật', 'Phát hiện phiên đăng nhập không hợp lệ hoặc đã bị can thiệp. Vui lòng đăng nhập lại!');
        openAuthModal('login');
        return;
      }
      if (viewName === 'admin-dashboard' && (!db.currentUser || db.currentUser.role !== 'admin')) {
        openAuthModal('login');
        return;
      }
      if (viewName === 'reader-profile' && !db.currentUser) {
        pendingTargetView = 'reader-profile';
        openAuthModal('login');
        return;
      }

      ['reader-home', 'reader-profile', 'admin-dashboard'].forEach(v => {
        document.getElementById(`view-${v}`).classList.toggle('hidden', v !== viewName);
        const btn = document.getElementById(`nav-${v}`);
        if (btn) {
          if (v === viewName) {
            btn.className = 'px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5 bg-blue-50 text-blue-700';
          } else {
            btn.className = (v === 'admin-dashboard' && (!db.currentUser || db.currentUser.role !== 'admin'))
              ? 'hidden'
              : 'px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition flex items-center gap-1.5';
          }
        }
        const mBtn = document.getElementById(`mobile-nav-${v}`);
        if (mBtn) {
          if (v === viewName) {
            mBtn.className = 'py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 bg-white text-blue-700 shadow-xs';
          } else {
            mBtn.className = (v === 'admin-dashboard' && (!db.currentUser || db.currentUser.role !== 'admin'))
              ? 'hidden'
              : 'py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/80 transition flex items-center justify-center gap-1';
          }
        }
      });
      renderAll();
    }

