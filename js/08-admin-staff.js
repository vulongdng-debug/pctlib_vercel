    // ==================== QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN THỦ THƯ ====================
    function updateAdminUIPermissions() {
      if (!db.currentUser || db.currentUser.role !== 'admin') return;
      const isSuperAdmin = db.currentUser.isSuperAdmin !== false && !db.currentUser.isStaff;
      const isStaff = Boolean(db.currentUser.isStaff);
      // Ẩn hoàn toàn cả thanh banner trên cùng đối với tài khoản Thủ thư
      const topBanner = document.getElementById('adminTopControlBanner');
      if (topBanner) topBanner.classList.toggle('hidden', isStaff);
      const btnStaffPass = document.getElementById('btnStaffChangePassTop');
      if (btnStaffPass) btnStaffPass.classList.toggle('hidden', !isStaff);
      
      // Tab 6: Chỉ Super Admin thấy
      const btnTabStaff = document.getElementById('admin-tab-btn-staff');
      if (btnTabStaff) btnTabStaff.classList.toggle('hidden', !isSuperAdmin);

      // Các nút tối cao trên thanh công cụ quản trị (chỉ Super Admin thấy)
      const btnSecurity = document.querySelector('button[onclick*="openSecurityCenterModal"]');
      const btnCloud = document.querySelector('button[onclick*="openCloudConfigModal"]');
      const btnBackupJSON = document.querySelector('button[onclick*="exportFullBackupJSON"]');
      const labelRestoreJSON = document.querySelector('label:has(input[onchange*="importFullBackupJSON"])');
      const btnResetDemo = document.querySelector('button[onclick*="resetDemoData"]');

      if (btnSecurity) btnSecurity.classList.toggle('hidden', !isSuperAdmin);
      if (btnCloud) btnCloud.classList.toggle('hidden', !isSuperAdmin);
      if (btnBackupJSON) btnBackupJSON.classList.toggle('hidden', !isSuperAdmin);
      if (labelRestoreJSON) labelRestoreJSON.classList.toggle('hidden', !isSuperAdmin);
      if (btnResetDemo) btnResetDemo.classList.toggle('hidden', !isSuperAdmin);

      // Nếu là Thủ thư phụ: kiểm tra và ẩn các Tab không có quyền
      if (isStaff) {
        const perms = db.currentUser.permissions || {};
        const tabMap = {
          books: document.getElementById('admin-tab-btn-books'),
          users: document.getElementById('admin-tab-btn-users'),
          borrows: document.getElementById('admin-tab-btn-borrows'),
          scanner: document.getElementById('admin-tab-btn-scanner'),
          stats: document.getElementById('admin-tab-btn-stats')
        };
        Object.keys(tabMap).forEach(key => {
          const btn = tabMap[key];
          if (btn) btn.classList.toggle('hidden', !perms[key]);
        });

        // Ẩn/hiện tất cả các nút mở trình in thẻ (bao gồm Mục 6) theo quyền perms.cards
      document.querySelectorAll('button[onclick*="openBarcodePrintModal"]').forEach(btn => {
        btn.classList.toggle('hidden', !perms.cards);
      });

        // Tự động chuyển đến tab đầu tiên được cấp quyền nếu đang ở tab bị cấm
        const activePanelKey = ['books', 'users', 'borrows', 'scanner', 'stats'].find(k => {
          const p = document.getElementById(`admin-tab-${k}`);
          return p && !p.classList.contains('hidden');
        });
        if (activePanelKey && !perms[activePanelKey]) {
          const firstAllowed = ['scanner', 'borrows', 'books', 'users', 'stats'].find(k => perms[k]);
          if (firstAllowed) switchAdminTab(firstAllowed);
        }
      } else {
        // Super Admin mở tất cả
        ['books', 'users', 'borrows', 'scanner', 'stats'].forEach(k => {
          const btn = document.getElementById(`admin-tab-btn-${k}`);
          if (btn) btn.classList.remove('hidden');
        });
        document.querySelectorAll('button[onclick*="openBarcodePrintModal"]').forEach(btn => {
        btn.classList.remove('hidden');
      });
      }
    }

    function renderAdminStaffList() {
      const tbody = document.getElementById('adminStaffTableBody');
      if (!tbody) return;

      const staffList = db.staffAccounts || [];
      const totalStaff = staffList.length + 1; // Tính cả Super Admin
      const activeStaff = 1 + staffList.filter(s => s.status !== 'locked').length;
      const lockedStaff = staffList.filter(s => s.status === 'locked').length;

      const totalEl = document.getElementById('statTotalStaffCount');
      if (totalEl) totalEl.textContent = totalStaff;
      const subEl = document.getElementById('statStaffSubLabel');
      if (subEl) subEl.textContent = `1 Quản trị trưởng + ${staffList.length} Thủ thư`;
      const activeEl = document.getElementById('statActiveStaffCount');
      if (activeEl) activeEl.textContent = activeStaff;
      const lockedEl = document.getElementById('statLockedStaffCount');
      if (lockedEl) lockedEl.textContent = lockedStaff;

      // Hàng 1: Super Admin (Cố định, không thể xóa)
      let html = `
        <tr class="bg-purple-50/40 hover:bg-purple-50/70 transition">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                <i class="ph-bold ph-crown text-base"></i>
              </span>
              <div>
                <p class="font-bold text-slate-900">${db.adminAccount.fullName || 'Thủ Thư Quản Trị'}</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="font-mono font-bold text-purple-700 text-xs bg-purple-100 px-1.5 py-0.2 rounded">${db.adminAccount.username || 'ADMIN'}</span>
                  <span class="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full">Quản Trị Trưởng (Toàn quyền)</span>
                </div>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4 text-xs text-slate-600">
            <div class="flex items-center gap-1 text-slate-700 font-medium">
              <i class="ph ph-envelope-simple text-sm text-purple-600"></i> ${db.adminAccount.email || 'Chưa có email'}
            </div>
            <div class="flex items-center gap-1 text-slate-500 mt-0.5">
              <i class="ph ph-shield-check text-sm text-emerald-600"></i> Bảo mật 2FA Email
            </div>
          </td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white shadow-xs">
              <i class="ph-bold ph-sparkle"></i> Toàn quyền hệ thống (100%)
            </span>
          </td>
          <td class="py-3.5 px-4 text-center">
            <span class="px-2.5 py-1 text-xs rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Hoạt động</span>
          </td>
          <td class="py-3.5 px-4 text-right">
            <button onclick="openSecurityCenterModal()" class="px-3 py-1.5 rounded-lg bg-white border border-purple-300 hover:bg-purple-100 text-purple-800 text-xs font-bold transition shadow-xs">
              <i class="ph-bold ph-gear"></i> Đổi MK / 2FA
            </button>
          </td>
        </tr>
      `;

      // Các hàng tiếp theo: Danh sách Thủ thư phụ
      staffList.forEach(s => {
        const p = s.permissions || {};
        const permBadges = [];
        if (p.books) permBadges.push('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">1. Kho Sách</span>');
        if (p.users) permBadges.push('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">2. Độc Giả</span>');
        if (p.borrows) permBadges.push('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">3. Mượn/Trả</span>');
        if (p.scanner) permBadges.push('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">4. Quầy POS</span>');
        if (p.cards) permBadges.push('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">5. In Thẻ A4</span>');
        if (p.stats) permBadges.push('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">6. Thống Kê</span>');

        const isActive = s.status !== 'locked';

        html += `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                  <i class="ph-bold ph-user text-base"></i>
                </span>
                <div>
                  <p class="font-bold text-slate-900">${s.fullName}</p>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="font-mono font-bold text-slate-700 text-xs bg-slate-100 px-1.5 py-0.2 rounded">${s.username}</span>
                    <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">${s.roleTitle || 'Thủ thư'}</span>
                  </div>
                </div>
              </div>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-600">
              <div class="flex items-center gap-1 text-slate-700">
                <i class="ph ph-envelope-simple text-sm text-slate-400"></i> ${s.email || 'Chưa cập nhật email'}
              </div>
              <div class="flex items-center gap-1 text-slate-500 mt-0.5">
                <i class="ph ph-phone text-sm text-slate-400"></i> ${s.phone || '---'}
              </div>
            </td>
            <td class="py-3.5 px-4">
              <div class="flex flex-wrap items-center gap-1 max-w-sm">
                ${permBadges.length > 0 ? permBadges.join('') : '<span class="text-[11px] text-slate-400 italic">Chưa cấp quyền nào</span>'}
              </div>
            </td>
            <td class="py-3.5 px-4 text-center">
              <span class="px-2.5 py-1 text-xs rounded-full font-bold ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}">
                ${isActive ? 'Hoạt động' : 'Tạm khóa'}
              </span>
            </td>
            <td class="py-3.5 px-4 text-right space-x-1.5">
              <button onclick="openStaffModal(${s.id})" class="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition">
                <i class="ph-bold ph-pencil-simple"></i> Sửa/Quyền
              </button>
              <button onclick="toggleStaffLock(${s.id})" class="px-2.5 py-1.5 rounded-lg ${isActive ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'} text-xs font-bold transition">
                ${isActive ? 'Khóa' : 'Mở'}
              </button>
              <button onclick="deleteStaffAccount(${s.id})" class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition">
                <i class="ph-bold ph-trash"></i> Xóa
              </button>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    }

    function openStaffModal(staffId = null) {
      const modal = document.getElementById('staffFormModal');
      const titleEl = document.getElementById('staffFormModalTitle');
      const idInput = document.getElementById('staffEditId');
      const userInput = document.getElementById('staffInputUsername');
      const passInput = document.getElementById('staffInputPassword');
      const nameInput = document.getElementById('staffInputFullName');
      const roleInput = document.getElementById('staffInputRoleTitle');
      const emailInput = document.getElementById('staffInputEmail');
      const phoneInput = document.getElementById('staffInputPhone');

      if (!staffId) {
        titleEl.textContent = 'Thêm Tài Khoản Thủ Thư Mới';
        idInput.value = '';
        userInput.value = '';
        userInput.readOnly = false;
        passInput.value = '123456';
        nameInput.value = '';
        roleInput.value = 'Thủ thư';
        emailInput.value = '';
        phoneInput.value = '';
        setCounterStaffPermsPreset();
      } else {
        const s = (db.staffAccounts || []).find(x => x.id === staffId);
        if (!s) return;
        titleEl.textContent = `Chỉnh Sửa & Phân Quyền: ${s.fullName}`;
        idInput.value = s.id;
        userInput.value = s.username;
        userInput.readOnly = true;
        passInput.value = '********';
        nameInput.value = s.fullName;
        roleInput.value = s.roleTitle || 'Thủ thư';
        emailInput.value = s.email || '';
        phoneInput.value = s.phone || '';

        const p = s.permissions || {};
        ['books', 'users', 'borrows', 'scanner', 'cards', 'stats'].forEach(k => {
          const chk = document.getElementById(`perm_${k}`);
          if (chk) chk.checked = Boolean(p[k]);
        });
      }

      modal.classList.remove('hidden');
    }

    function closeStaffModal() {
      const modal = document.getElementById('staffFormModal');
      if (modal) modal.classList.add('hidden');
    }

    function setAllStaffPerms(val) {
      ['books', 'users', 'borrows', 'scanner', 'cards', 'stats'].forEach(k => {
        const chk = document.getElementById(`perm_${k}`);
        if (chk) chk.checked = Boolean(val);
      });
    }

    function setCounterStaffPermsPreset() {
      ['books', 'users', 'cards', 'stats'].forEach(k => {
        const chk = document.getElementById(`perm_${k}`);
        if (chk) chk.checked = false;
      });
      ['borrows', 'scanner'].forEach(k => {
        const chk = document.getElementById(`perm_${k}`);
        if (chk) chk.checked = true;
      });
    }

    async function saveStaffForm(e) {
      e.preventDefault();
      const id = document.getElementById('staffEditId').value;
      const username = sanitizeText(document.getElementById('staffInputUsername').value.trim());
      const rawPassword = document.getElementById('staffInputPassword').value.trim();
      const fullName = sanitizeText(document.getElementById('staffInputFullName').value.trim());
      const roleTitle = sanitizeText(document.getElementById('staffInputRoleTitle').value.trim()) || 'Thủ thư';
      const email = sanitizeText(document.getElementById('staffInputEmail').value.trim());
      const phone = sanitizeText(document.getElementById('staffInputPhone').value.trim());

      const permissions = {
        books: Boolean(document.getElementById('perm_books')?.checked),
        users: Boolean(document.getElementById('perm_users')?.checked),
        borrows: Boolean(document.getElementById('perm_borrows')?.checked),
        scanner: Boolean(document.getElementById('perm_scanner')?.checked),
        cards: Boolean(document.getElementById('perm_cards')?.checked),
        stats: Boolean(document.getElementById('perm_stats')?.checked)
      };

      if (!db.staffAccounts) db.staffAccounts = [];

      if (!id) {
        // Kiểm tra trùng username
        if (username.toUpperCase() === String(db.adminAccount.username || 'ADMIN').toUpperCase()) {
          showNoticeModal('Tên đăng nhập đã tồn tại', 'Tên đăng nhập này trùng với Quản trị trưởng (Super Admin)!');
          return;
        }
        if (db.staffAccounts.some(s => s.username.toUpperCase() === username.toUpperCase())) {
          showNoticeModal('Tên đăng nhập đã tồn tại', 'Đã có thủ thư sử dụng tên đăng nhập này!');
          return;
        }

        if (isCloudConnected && supabaseClient) {
          const staffPass = rawPassword || '123456';
          if (staffPass.length < 6) {
            showNoticeModal('Mật khẩu quá ngắn', 'Mật khẩu thủ thư phải có tối thiểu 6 ký tự!');
            return;
          }
          const cleanUserKey = username.toLowerCase().replace(/[^a-z0-9]/g, '') || ('staff' + Date.now());
          const authEmail = (email && email.includes('@'))
            ? email
            : `${cleanUserKey}.${Date.now().toString().slice(-4)}@staff.pct.edu.vn`;
          try {
            // Dùng client tạm không lưu session để không làm đăng xuất Super Admin hiện tại
            const tempAuthClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
              auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
            });
            const { data: signUpRes, error: signUpErr } = await tempAuthClient.auth.signUp({
              email: authEmail,
              password: staffPass
            });
            if (signUpErr) {
              showNoticeModal('Lỗi tạo tài khoản Auth', signUpErr.message || 'Không thể tạo user trong Supabase Auth!');
              return;
            }
            const { data: insertedStaff, error: insErr } = await supabaseClient.from('staff_accounts').insert({
              auth_user_id: signUpRes?.user?.id || null,
              username: username.toUpperCase(),
              full_name: fullName,
              email: authEmail,
              phone,
              role: 'librarian',
              role_title: roleTitle,
              permissions,
              status: 'active'
            }).select().single();
            if (insErr) throw insErr;

            db.staffAccounts.push(mapStaffFromDB(insertedStaff));
            closeStaffModal();
            renderAdminStaffList();
            if (signUpRes?.user && !signUpRes?.session) {
              showNoticeModal(
                'Đã tạo tài khoản (Chờ xác nhận Email)',
                `Tài khoản "${username}" đã được tạo! Tuy nhiên Supabase đang bật "Confirm email". Hãy bấm link xác nhận trong hộp thư "${authEmail}", HOẶC tắt "Confirm email" trong Supabase Dashboard (Authentication → Providers → Email) để tài khoản tạo từ web dùng được ngay lập tức.`
              );
            } else {
              showToast(`Đã tạo và kích hoạt tài khoản thủ thư ${fullName} (${username}) thành công!`);
            }
            return;
          } catch (err) {
            showNoticeModal('Lỗi tạo thủ thư', err.message || 'Không thể lưu tài khoản thủ thư lên Supabase!');
            return;
          }
        }

        const newStaff = {
          id: Date.now(),
          username,
          password: hashPassword(rawPassword || '123456'),
          fullName,
          roleTitle,
          email,
          phone,
          status: 'active',
          permissions
        };
        db.staffAccounts.push(newStaff);
        showToast(`Đã tạo tài khoản thủ thư ${fullName} thành công!`);
      } else {
        const idx = db.staffAccounts.findIndex(s => s.id === Number(id));
        if (idx > -1) {
          const old = db.staffAccounts[idx];
          if (isCloudConnected && supabaseClient) {
            const { data: updStaff, error: updErr } = await supabaseClient.from('staff_accounts').update({
              full_name: fullName,
              role_title: roleTitle,
              email,
              phone,
              permissions
            }).eq('id', Number(id)).select().single();
            if (updErr) {
              showNoticeModal('Lỗi cập nhật', updErr.message || 'Không thể cập nhật phân quyền trên Supabase!');
              return;
            }
            db.staffAccounts[idx] = mapStaffFromDB(updStaff);
          } else {
            const keepOldPass = rawPassword === '********';
            db.staffAccounts[idx] = {
              ...old,
              fullName,
              roleTitle,
              email,
              phone,
              permissions,
              password: keepOldPass ? old.password : hashPassword(rawPassword)
            };
          }
          showToast(`Đã cập nhật thông tin và phân quyền cho ${fullName}!`);
        }
      }

      await saveDB('settings');
      closeStaffModal();
      renderAdminStaffList();
    }

    async function toggleStaffLock(staffId) {
      const s = (db.staffAccounts || []).find(x => x.id === staffId);
      if (!s) return;
      const nextStatus = s.status === 'active' ? 'locked' : 'active';
      if (isCloudConnected && supabaseClient) {
        const { error } = await supabaseClient.from('staff_accounts').update({ status: nextStatus }).eq('id', staffId);
        if (error) {
          showNoticeModal('Lỗi cập nhật', error.message || 'Không thể khóa/mở tài khoản trên Supabase!');
          return;
        }
      }
      s.status = nextStatus;
      await saveDB('settings');
      renderAdminStaffList();
      showToast(`Đã ${s.status === 'active' ? 'mở khóa' : 'tạm khóa'} tài khoản ${s.fullName}!`);
    }

    function deleteStaffAccount(staffId) {
      const s = (db.staffAccounts || []).find(x => x.id === staffId);
      if (!s) return;

      openCustomConfirmDialog(
        'Xóa tài khoản thủ thư',
        `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản thủ thư của "${s.fullName}" (${s.username}) khỏi hệ thống?`,
        async () => {
          if (isCloudConnected && supabaseClient) {
            const { error } = await supabaseClient.from('staff_accounts').delete().eq('id', staffId);
            if (error) {
              showNoticeModal('Lỗi xóa tài khoản', error.message || 'Không thể xóa tài khoản trên Supabase!');
              return;
            }
          }
          db.staffAccounts = (db.staffAccounts || []).filter(x => x.id !== staffId);
          await saveDB('settings');
          renderAdminStaffList();
          showToast(`Đã xóa tài khoản thủ thư ${s.fullName}!`);
        }
      );
    }
    // ==================== ĐỔI MẬT KHẨU Thủ thư ====================
    function openStaffChangePasswordModal() {
      if (!db.currentUser || !db.currentUser.isStaff) return;
      document.getElementById('staffChangePassSubtitle').textContent = `Tài khoản: ${db.currentUser.username} (${db.currentUser.fullName})`;
      document.getElementById('staffCurrentPassInput').value = '';
      document.getElementById('staffNewPassInput').value = '';
      document.getElementById('staffConfirmNewPassInput').value = '';
      document.getElementById('staffChangePasswordModal').classList.remove('hidden');
    }

    function closeStaffChangePasswordModal() {
      const modal = document.getElementById('staffChangePasswordModal');
      if (modal) modal.classList.add('hidden');
    }

    async function handleStaffChangePasswordSubmit(e) {
      e.preventDefault();
      if (!db.currentUser || !db.currentUser.isStaff) return;

      const currentPass = document.getElementById('staffCurrentPassInput').value.trim();
      const newPass = document.getElementById('staffNewPassInput').value.trim();
      const confirmPass = document.getElementById('staffConfirmNewPassInput').value.trim();

      if (newPass.length < 6) {
        showNoticeModal('Mật khẩu quá ngắn', 'Mật khẩu mới phải có tối thiểu 6 ký tự!');
        return;
      }

      if (newPass !== confirmPass) {
        showNoticeModal('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới!');
        return;
      }

      if (isCloudConnected && supabaseClient) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user || !user.email) {
          showNoticeModal('Lỗi tài khoản', 'Phiên đăng nhập Supabase Auth không hợp lệ!');
          return;
        }
        const { error: verifyErr } = await supabaseClient.auth.signInWithPassword({ email: user.email, password: currentPass });
        if (verifyErr) {
          showNoticeModal('Sai mật khẩu hiện tại', 'Mật khẩu hiện tại không chính xác! Vui lòng nhập lại.');
          return;
        }
        const { error: updErr } = await supabaseClient.auth.updateUser({ password: newPass });
        if (updErr) {
          showNoticeModal('Lỗi đổi mật khẩu', updErr.message || 'Không thể cập nhật mật khẩu trên Supabase Auth!');
          return;
        }
        closeStaffChangePasswordModal();
        showToast('Đã đổi mật khẩu thủ thư trên Supabase Auth thành công!');
        return;
      }

      const staff = (db.staffAccounts || []).find(s => s.id === db.currentUser.staffId || String(s.username).toUpperCase() === String(db.currentUser.username).toUpperCase());
      if (!staff) {
        showNoticeModal('Lỗi tài khoản', 'Không tìm thấy dữ liệu tài khoản thủ thư của bạn!');
        return;
      }

      if (!verifyPassword(currentPass, staff.password)) {
        showNoticeModal('Sai mật khẩu hiện tại', 'Mật khẩu hiện tại không chính xác! Vui lòng nhập lại.');
        return;
      }

      staff.password = hashPassword(newPass);
      saveSessionUser(db.currentUser);
      await saveDB('settings');

      closeStaffChangePasswordModal();
      showToast('Đã đổi mật khẩu thủ thư thành công!');
    }
