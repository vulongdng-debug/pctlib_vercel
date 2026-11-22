    // ==================== QUẢN TRỊ BẢO MẬT CẤP ĐỘ 1 (SECURITY CENTER) ====================
    function openSecurityCenterModal() {
      if (!db.currentUser || db.currentUser.role !== 'admin' || !verifySessionIntegrity(db.currentUser, db)) {
        showNoticeModal('Từ chối truy cập', 'Chỉ Admin hợp lệ mới có quyền mở Trung tâm Bảo mật!');
        return;
      }
      document.getElementById('secAdminUsername').value = db.adminAccount.username || 'ADMIN';
      document.getElementById('secAdminFullName').value = db.adminAccount.fullName || 'Quản Trị';
      document.getElementById('secAdminEmail').value = db.adminAccount.email || 'longnv@pct.edu.vn';
      document.getElementById('secAdminCurrentPass').value = '';
      document.getElementById('secAdminNewPass').value = '';
      updateSecurityModalUI();
      document.getElementById('securityCenterModal').classList.remove('hidden');
    }

    function closeSecurityCenterModal() {
      document.getElementById('securityCenterModal').classList.add('hidden');
    }

    function updateSecurityModalUI() {
      const totalUsers = db.users.length;
      const hashedUsers = db.users.filter(u => String(u.password || '').startsWith('sha256$')).length;
      const elCount = document.getElementById('secStatusHashedCount');
      if (elCount) {
        elCount.textContent = `${hashedUsers}/${totalUsers} Độc giả + Admin (100% SHA-256)`;
      }
      const btnProd = document.getElementById('btnToggleProductionMode');
      if (btnProd) {
        if (db.productionMode) {
          btnProd.className = 'px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition shadow-sm';
          btnProd.innerHTML = '<i class="ph-bold ph-check-circle"></i> Đang BẬT (Đã ẩn Demo)';
        } else {
          btnProd.className = 'px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition shadow-sm';
          btnProd.innerHTML = 'Đang Tắt (Hiện Demo)';
        }
      }
      const demoSection = document.getElementById('demoQuickLoginSection');
      if (demoSection) {
        demoSection.classList.toggle('hidden', Boolean(db.productionMode));
      }
      const is2FAOn = db.adminAccount.twoFactorEnabled !== false;
      const isDeviceTrusted = (() => {
        try {
          const raw = localStorage.getItem('SMARTLIB_TRUSTED_ADMIN_STAMP');
          if (raw) {
            const parsed = JSON.parse(raw);
            const token = localStorage.getItem('SMARTLIB_TRUSTED_DEVICE_ID');
            return Boolean(parsed.verified && parsed.deviceToken === token);
          }
        } catch (e) {}
        return false;
      })();

      const labelTrust = document.getElementById('currentDeviceTrustLabel');
      if (labelTrust) {
        labelTrust.className = isDeviceTrusted ? 'text-[11px] text-emerald-700 font-bold' : 'text-[11px] text-amber-700 font-bold';
        labelTrust.textContent = isDeviceTrusted ? '✓ Đã xác nhận tin cậy (Không hỏi lại OTP)' : 'Chưa xác thực (Sẽ hỏi mã OTP khi đăng nhập)';
      }

      const badge2FA = document.getElementById('secStatus2FABadge');
      if (badge2FA) {
        badge2FA.className = is2FAOn
          ? 'font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'
          : 'font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200';
        badge2FA.textContent = is2FAOn
          ? (isDeviceTrusted ? 'Bật (Chỉ hỏi máy mới - Máy này: Đã nhớ)' : 'Bật (Yêu cầu xác thực máy mới)')
          : 'Đang Tắt';
      }
      const btn2FA = document.getElementById('btnToggleAdmin2FA');
      if (btn2FA) {
        btn2FA.className = is2FAOn
          ? 'px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition shadow-sm'
          : 'px-3.5 py-2 rounded-xl bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold shrink-0 transition shadow-sm';
        btn2FA.innerHTML = is2FAOn ? '<i class="ph-bold ph-check-circle"></i> Đang BẬT' : 'Đang Tắt';
      }
      const demoHintBox = document.getElementById('admin2faDemoHintBox');
      if (demoHintBox) {
        demoHintBox.classList.toggle('hidden', Boolean(db.productionMode));
      }
    }

    async function toggleProductionMode() {
      db.productionMode = !db.productionMode;
      updateSecurityModalUI();
      await saveDB('settings');
      showToast(db.productionMode
        ? 'Đã BẬT Chế độ Vận hành Thực tế (Ẩn gợi ý tài khoản thử nghiệm trên cửa sổ Đăng nhập)!'
        : 'Đã bật lại hiển thị gợi ý tài khoản thử nghiệm 1-Click.');
    }

    async function saveAdminSecurityForm(e) {
      e.preventDefault();
      const currPass = document.getElementById('secAdminCurrentPass').value.trim();
      const newUsername = sanitizeText(document.getElementById('secAdminUsername').value.trim());
      const newFullName = sanitizeText(document.getElementById('secAdminFullName').value.trim());
      const newEmail = sanitizeText(document.getElementById('secAdminEmail').value.trim());
      const newPass = document.getElementById('secAdminNewPass').value.trim();

      if (isCloudConnected && supabaseClient) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user || !user.email) {
          showNoticeModal('Lỗi phiên đăng nhập', 'Vui lòng đăng nhập lại tài khoản Quản trị trưởng!');
          return;
        }
        const { error: verifyErr } = await supabaseClient.auth.signInWithPassword({ email: user.email, password: currPass });
        if (verifyErr) {
          showNoticeModal('Sai mật khẩu hiện tại', 'Mật khẩu Admin hiện tại không chính xác! Vui lòng kiểm tra lại.');
          return;
        }
        if (newPass) {
          if (newPass.length < 6) {
            showNoticeModal('Mật khẩu mới quá ngắn', 'Mật khẩu Admin mới phải có ít nhất 6 ký tự để đảm bảo an toàn!');
            return;
          }
          const { error: updAuthErr } = await supabaseClient.auth.updateUser({ password: newPass });
          if (updAuthErr) {
            showNoticeModal('Lỗi đổi mật khẩu', updAuthErr.message || 'Không thể cập nhật mật khẩu trên Supabase Auth!');
            return;
          }
        }
        const { error: updStaffErr } = await supabaseClient.from('staff_accounts').update({
          username: (newUsername || 'ADMIN').toUpperCase(),
          full_name: newFullName || 'Quản Trị'
        }).eq('auth_user_id', user.id);
        if (updStaffErr) {
          showNoticeModal('Lỗi cập nhật hồ sơ', updStaffErr.message || 'Không thể cập nhật thông tin staff_accounts!');
          return;
        }

        db.adminAccount.username = (newUsername || 'ADMIN').toUpperCase();
        db.adminAccount.fullName = newFullName || 'Quản Trị';
        db.adminAccount.email = newEmail || db.adminAccount.email || user.email;
        try { localStorage.setItem('SMARTLIB_ADMIN_2FA_EMAIL', db.adminAccount.email); } catch (err) {}

        saveSessionUser({
          ...db.currentUser,
          role: 'admin',
          isSuperAdmin: true,
          isStaff: false,
          authUserId: user.id,
          username: db.adminAccount.username,
          fullName: db.adminAccount.fullName
        });
        await saveDB('settings');
        closeSecurityCenterModal();
        showToast('Đã cập nhật tài khoản, Email 2FA & mật khẩu Supabase Auth thành công!');
        return;
      }

      if (!verifyPassword(currPass, db.adminAccount.password)) {
        showNoticeModal('Sai mật khẩu hiện tại', 'Mật khẩu Admin hiện tại không chính xác! Vui lòng kiểm tra lại.');
        return;
      }
      if (newPass.length < 6) {
        showNoticeModal('Mật khẩu mới quá ngắn', 'Mật khẩu Admin mới phải có ít nhất 6 ký tự để đảm bảo an toàn!');
        return;
      }

      db.adminAccount.username = newUsername || 'ADMIN';
      db.adminAccount.fullName = newFullName || 'Quản Trị';
      db.adminAccount.email = newEmail || 'longnv@pct.edu.vn';
      db.adminAccount.password = hashPassword(newPass);

      saveSessionUser({
        role: 'admin',
        username: db.adminAccount.username,
        fullName: db.adminAccount.fullName
      });

      await saveDB('settings');
      closeSecurityCenterModal();
      showToast('Đã cập nhật tài khoản, Email 2FA & mã hóa SHA-256 mật khẩu Admin!');
    }

    // ==================== XÁC THỰC BẢO MẬT 2 LỚP BẰNG EMAIL (ADMIN 2FA OTP ENGINE) ====================
    let pendingAdmin2FA = null; // { otpHash, plainDemoOtp, expiresAt, attemptsLeft, targetEmail }
    let admin2faCountdownInterval = null;

    const TRUSTED_DEVICE_STORAGE_KEY = 'SMARTLIB_TRUSTED_DEVICE_ID';
    const TRUSTED_STAMP_STORAGE_KEY = 'SMARTLIB_TRUSTED_ADMIN_STAMP';
    let lastDetectedLoginContext = { deviceToken: '', reason: '' };

    // 1. Lấy hoặc tạo mã định danh duy nhất (Device Token) cho máy tính / trình duyệt này
    function getOrCreateDeviceToken() {
      let token = '';
      try {
        token = localStorage.getItem(TRUSTED_DEVICE_STORAGE_KEY) || '';
        if (!token) {
          token = 'DEV_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
          localStorage.setItem(TRUSTED_DEVICE_STORAGE_KEY, token);
        }
      } catch (e) {
        token = 'SESSION_DEV';
      }
      return token;
    }

    // 2. Kiểm tra xem Máy tính hiện tại đã được xác thực OTP trước đó chưa
    async function checkTrustedAdminDeviceAndIP() {
      // Khôi phục email nhận OTP riêng của Admin nếu bị Cloud ghi đè
      const savedAdminEmail = localStorage.getItem('SMARTLIB_ADMIN_2FA_EMAIL');
      if (savedAdminEmail) db.adminAccount.email = savedAdminEmail;

      const deviceToken = getOrCreateDeviceToken();

      // Đọc dấu xác thực tin cậy lưu trên máy tính này
      let localStamp = null;
      try {
        const raw = localStorage.getItem(TRUSTED_STAMP_STORAGE_KEY);
        if (raw) localStamp = JSON.parse(raw);
      } catch (e) {}

      // Nếu máy tính này ĐÃ xác nhận OTP trước đó -> Tin cậy 100%, bỏ qua OTP
      if (localStamp && localStamp.verified === true && localStamp.deviceToken === deviceToken) {
        lastDetectedLoginContext = {
          trusted: true,
          deviceToken,
          verifiedAt: localStamp.verifiedAt || '',
          reason: 'Máy tính đã được xác thực tin cậy'
        };
        return { trusted: true, ...lastDetectedLoginContext };
      }

      // Ngược lại nếu là máy tính khác (hoặc trình duyệt mới chưa xác nhận) -> Yêu cầu OTP
      lastDetectedLoginContext = {
        trusted: false,
        deviceToken,
        reason: 'Máy tính / Trình duyệt mới chưa xác thực'
      };
      return { trusted: false, ...lastDetectedLoginContext };
    }

    // 3. Ghi nhớ máy tính này là thiết bị tin cậy ngay khi nhập đúng mã OTP
    async function markCurrentDeviceAndIPTrusted() {
      const emailInput = document.getElementById('admin2faTargetEmailInput')?.value.trim();
      if (emailInput && emailInput.includes('@')) {
        db.adminAccount.email = emailInput;
        try { localStorage.setItem('SMARTLIB_ADMIN_2FA_EMAIL', emailInput); } catch (e) {}
      }

      const deviceToken = getOrCreateDeviceToken();
      const stampRecord = {
        verified: true,
        deviceToken,
        verifiedAt: new Date().toLocaleString('vi-VN')
      };

      try {
        localStorage.setItem(TRUSTED_STAMP_STORAGE_KEY, JSON.stringify(stampRecord));
      } catch (e) {}

      await saveDB('settings');
    }

    // 4. Xóa ghi nhớ thiết bị tin cậy trên máy tính này (để thử nghiệm hoặc khi muốn bắt buộc nhập lại OTP)
    function forgetCurrentTrustedDevice() {
      try {
        localStorage.removeItem(TRUSTED_STAMP_STORAGE_KEY);
      } catch (e) {}
      updateSecurityModalUI();
      showToast('Đã xóa ghi nhớ máy tính này! Lần đăng nhập sau sẽ yêu cầu mã OTP.');
    }

    function generateSecure6DigitOTP() {
      try {
        if (window.crypto && window.crypto.getRandomValues) {
          const arr = new Uint32Array(1);
          window.crypto.getRandomValues(arr);
          return String(100000 + (arr[0] % 900000));
        }
      } catch (e) {}
      return String(Math.floor(100000 + Math.random() * 900000));
    }

    function stopAdmin2FATimer() {
      if (admin2faCountdownInterval) {
        clearInterval(admin2faCountdownInterval);
        admin2faCountdownInterval = null;
      }
    }

    function startAdmin2FATimer() {
      stopAdmin2FATimer();
      const badge = document.getElementById('admin2faTimerBadge');
      admin2faCountdownInterval = setInterval(() => {
        if (!pendingAdmin2FA) {
          stopAdmin2FATimer();
          return;
        }
        const remainingSec = Math.max(0, Math.floor((pendingAdmin2FA.expiresAt - Date.now()) / 1000));
        const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
        const secs = String(remainingSec % 60).padStart(2, '0');
        if (badge) {
          badge.textContent = `${mins}:${secs}`;
          badge.className = remainingSec <= 60
            ? 'px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
            : 'px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300';
        }
        if (remainingSec <= 0) {
          stopAdmin2FATimer();
          if (badge) badge.textContent = 'HẾT HẠN';
        }
      }, 1000);
    }

    async function sendAdminOtpViaEmailJS(targetEmail, otpCode) {
      if (!window.emailjs || !targetEmail) return false;
      const nowStr = new Date().toLocaleString('vi-VN');
      const templateParams = {
        to_email: targetEmail,
        reader_name: `${db.adminAccount.fullName || 'Admin'} (Xác thực 2 lớp 2FA)`,
        ticket_code: `OTP-${otpCode}`,
        status_label: `MÃ XÁC THỰC ĐĂNG NHẬP ADMIN: ${otpCode}`,
        book_title: `Mã bảo mật 2 lớp (2FA OTP): ${otpCode}`,
        book_code: otpCode,
        shelf: 'Hiệu lực 5 phút',
        borrow_date: nowStr,
        due_date: 'Hết hạn sau 5 phút',
        otp_code: otpCode,
        message: `Mã xác thực 2 lớp (2FA) để đăng nhập quyền Quản trị Thư viện SmartLib của bạn là: ${otpCode}. Mã có hiệu lực trong 5 phút.`
      };
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams);
        return true;
      } catch (err) {
        console.error('Lỗi gửi Email OTP 2FA:', err);
        return false;
      }
    }

    async function initiateAdmin2FAStep(customEmail = null) {
      const defaultAdminEmail = INITIAL_DB.adminAccount.email || 'longnv@pct.edu.vn';
      const targetEmail = sanitizeText((customEmail || db.adminAccount.email || defaultAdminEmail).trim());
      if (customEmail && targetEmail.includes('@')) {
        db.adminAccount.email = targetEmail;
        await saveDB('settings');
      }

      const isProd = Boolean(db.productionMode);
      const otpCode = generateSecure6DigitOTP();
      pendingAdmin2FA = {
        otpHash: hashPassword(otpCode),
        plainDemoOtp: isProd ? null : otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 phút
        attemptsLeft: 5,
        targetEmail
      };

      // Chuyển giao diện sang Bước 2 trong #authModal
      const loginFormEl = document.getElementById('loginForm');
      if (loginFormEl) loginFormEl.classList.add('hidden');
      const regFormEl = document.getElementById('registerForm');
      if (regFormEl) regFormEl.classList.add('hidden');
      const twoFaForm = document.getElementById('admin2faForm');
      if (twoFaForm) twoFaForm.classList.remove('hidden');

      document.getElementById('admin2faTargetEmailInput').value = targetEmail;
      document.getElementById('admin2faCodeInput').value = '';
      document.getElementById('admin2faAttemptsLabel').textContent = 'Còn 5 lần thử';
      document.getElementById('admin2faTimerBadge').textContent = '05:00';

      const demoValueEl = document.getElementById('admin2faDemoCodeValue');
      if (demoValueEl) demoValueEl.textContent = isProd ? '••••••' : otpCode;
      const demoHintBox = document.getElementById('admin2faDemoHintBox');
      if (demoHintBox) demoHintBox.classList.toggle('hidden', isProd);

      startAdmin2FATimer();

      const statusText = document.getElementById('admin2faEmailStatusText');
      if (statusText) {
        statusText.innerHTML = `<i class="ph-bold ph-spinner animate-spin text-indigo-600"></i> Đang gửi mã OTP 6 chữ số đến hộp thư <strong>${escapeHtml(targetEmail)}</strong>...`;
      }

      const sentOk = await sendAdminOtpViaEmailJS(targetEmail, otpCode);
      if (statusText) {
        if (sentOk) {
          statusText.innerHTML = `<span class="text-emerald-700 font-semibold">✓ Đã gửi mã OTP 6 số tới hộp thư <strong>${escapeHtml(targetEmail)}</strong>!</span> Vui lòng kiểm tra Email (kể cả mục Spam/Quảng cáo) và nhập mã bên dưới.`;
        } else if (!isProd) {
          statusText.innerHTML = `<span class="text-amber-700 font-semibold">⚠️ Không thể kết nối máy chủ EmailJS (Chế độ thử nghiệm).</span> Bạn có thể sử dụng mã dự phòng bên dưới.`;
          if (demoHintBox) demoHintBox.classList.remove('hidden');
        } else {
          statusText.innerHTML = `<span class="text-rose-700 font-semibold">❌ Không thể gửi mã OTP qua EmailJS!</span> Vui lòng kiểm tra kết nối mạng hoặc hạn mức EmailJS rồi bấm <strong>Gửi lại mã</strong>.`;
          if (demoHintBox) demoHintBox.classList.add('hidden');
        }
      }

      setTimeout(() => document.getElementById('admin2faCodeInput')?.focus(), 80);
    }

    async function resendAdmin2FACode() {
      const defaultAdminEmail = INITIAL_DB.adminAccount.email || 'longnv@pct.edu.vn';
      const targetEmail = sanitizeText((db.adminAccount.email || defaultAdminEmail).trim());
      await initiateAdmin2FAStep();
      showToast(`Đã tạo và gửi lại mã OTP mới tới ${targetEmail}!`);
    }

    function fillDemoAdminOtp() {
      if (!pendingAdmin2FA || !pendingAdmin2FA.plainDemoOtp) return;
      const input = document.getElementById('admin2faCodeInput');
      if (input) {
        input.value = pendingAdmin2FA.plainDemoOtp;
        input.focus();
      }
    }

    async function cancelAdmin2FAStep() {
      pendingAdmin2FA = null;
      if (pendingSupaStaffAuth && supabaseClient) {
        try { await supabaseClient.auth.signOut(); } catch (e) {}
        pendingSupaStaffAuth = null;
      }
      stopAdmin2FATimer();
      switchAuthTab('login');
    }

    async function handleAdmin2FASubmit(e) {
      e.preventDefault();
      if (!pendingAdmin2FA) {
        showNoticeModal('Phiên OTP không tồn tại', 'Vui lòng đăng nhập lại từ bước mật khẩu!');
        cancelAdmin2FAStep();
        return;
      }

      if (Date.now() > pendingAdmin2FA.expiresAt) {
        playScannerBeep('error');
        showNoticeModal('Mã OTP đã hết hạn', 'Mã xác thực OTP đã quá thời hạn 5 phút. Vui lòng bấm "Gửi lại mã" để nhận mã mới!');
        return;
      }

      const enteredCode = (document.getElementById('admin2faCodeInput')?.value || '').trim();
      if (enteredCode.length !== 6) {
        showNoticeModal('Thiếu chữ số', 'Vui lòng nhập đủ 6 chữ số của mã xác thực OTP!');
        return;
      }

      if (!verifyPassword(enteredCode, pendingAdmin2FA.otpHash)) {
        pendingAdmin2FA.attemptsLeft -= 1;
        playScannerBeep('error');
        const attemptsEl = document.getElementById('admin2faAttemptsLabel');
        if (attemptsEl) {
          attemptsEl.textContent = `Còn ${pendingAdmin2FA.attemptsLeft} lần thử`;
          attemptsEl.className = 'text-[11px] font-bold text-rose-600';
        }
        if (pendingAdmin2FA.attemptsLeft <= 0) {
          pendingAdmin2FA = null;
          stopAdmin2FATimer();
          await cancelAdmin2FAStep();
          showNoticeModal('Khóa phiên xác thực', 'Bạn đã nhập sai mã OTP quá 5 lần. Phiên đăng nhập đã bị hủy để bảo vệ tài khoản Admin!');
          return;
        }
        showNoticeModal('Mã OTP không đúng', `Mã xác thực bạn nhập không chính xác. Bạn còn ${pendingAdmin2FA.attemptsLeft} lần thử!`);
        return;
      }

      // Xác thực 2 lớp thành công 100%
      pendingAdmin2FA = null;
      stopAdmin2FATimer();
      playScannerBeep('success');
      await markCurrentDeviceAndIPTrusted(); // Ghi nhớ máy tính & IP này cho các lần sau

      if (pendingSupaStaffAuth) {
        const { authUser, staffRow } = pendingSupaStaffAuth;
        pendingSupaStaffAuth = null;
        await finalizeSupaAdminLogin(authUser, staffRow);
        return;
      }

      saveSessionUser({
        role: 'admin',
        username: db.adminAccount.username,
        fullName: db.adminAccount.fullName,
        twoFactorVerified: true
      });
      closeAuthModal();
      switchView('admin-dashboard');
      showToast('Xác thực bảo mật 2 lớp (2FA) thành công! Chào mừng Admin.');
    }

    async function toggleAdminTwoFactor() {
      db.adminAccount.twoFactorEnabled = !(db.adminAccount.twoFactorEnabled !== false);
      updateSecurityModalUI();
      await saveDB('settings');
      showToast(db.adminAccount.twoFactorEnabled
        ? 'Đã BẬT Xác thực Bảo mật 2 Lớp bằng Email (2FA OTP) cho tài khoản Admin!'
        : 'Đã tắt xác thực 2 lớp (Chỉ dùng mật khẩu SHA-256 khi đăng nhập Admin).');
    }

    async function sendTestAdminOtpEmail() {
      const emailEl = document.getElementById('secAdminEmail');
      const testEmail = emailEl ? emailEl.value.trim() : '';
      if (!testEmail || !testEmail.includes('@')) {
        showNoticeModal('Thiếu địa chỉ Email', 'Vui lòng nhập địa chỉ Email nhận mã OTP của Admin trước khi gửi thử!');
        return;
      }
      db.adminAccount.email = sanitizeText(testEmail);
      await saveDB('settings');
      showToast(`Đang gửi thử mã OTP 6 số tới ${testEmail}...`);
      const sampleOtp = generateSecure6DigitOTP();
      const ok = await sendAdminOtpViaEmailJS(testEmail, sampleOtp);
      if (ok) {
        showNoticeModal('Gửi thử OTP thành công', `Hệ thống đã gửi thử mã OTP (${sampleOtp}) tới hộp thư ${testEmail}. Vui lòng kiểm tra hộp thư đến của bạn!`);
      } else {
        showNoticeModal('Không thể gửi EmailJS', 'Không thể kết nối EmailJS lúc này. Vui lòng kiểm tra kết nối mạng hoặc cấu hình EmailJS.');
      }
    }

    // --- BỔ SUNG CÁC HÀM QUAN TRỌNG BỊ THIẾU ---
    function renderAll() {
      if (document.getElementById('globalSchoolYearSelect') && db.currentSchoolYear) {
        document.getElementById('globalSchoolYearSelect').value = db.currentSchoolYear;
      }
      [
        renderAuthHeader,
        renderPublicBooks,
        renderReaderProfile,
        renderAdminStats,
        renderAdminBooks,
        renderAdminUsers,
        renderAdminBorrows,
        renderPosScannerStation,
        updateAdminUIPermissions
      ].forEach(fn => {
        try { fn(); } catch (err) { console.error('Lỗi render:', fn.name, err); }
      });

      // --- BỔ SUNG: Cập nhật thống kê Footer tự động ---
      if (document.getElementById('footerStatUsers')) {
        const totalCopies = db.books.reduce((sum, b) => sum + (Number(b.total) || 0), 0) || publicStatsCache.totalCopies || 0;
        const isStaffAdmin = db.currentUser && db.currentUser.role === 'admin';
        const displayReaders = isStaffAdmin ? db.users.length : (publicStatsCache.totalReaders || db.users.length);
        const displayBorrows = isStaffAdmin ? db.borrows.length : (publicStatsCache.totalBorrows || db.borrows.length);
        document.getElementById('footerStatUsers').textContent = displayReaders.toLocaleString('vi-VN');
        document.getElementById('footerStatBooks').textContent = totalCopies.toLocaleString('vi-VN');
        document.getElementById('footerStatBorrows').textContent = displayBorrows.toLocaleString('vi-VN');
        
        // Bộ đếm lượt truy cập (Bắt đầu từ mốc 45,291 và tự tăng dần)
        let currentViews = parseInt(localStorage.getItem('smartlib_page_views') || 0);
        currentViews += 1;
        localStorage.setItem('smartlib_page_views', currentViews);
        document.getElementById('footerStatViews').textContent = currentViews.toLocaleString('vi-VN');
      }
    }

    function resetDemoData() {
      if (isCloudConnected) {
        showNoticeModal('Bảo vệ dữ liệu thực tế', 'Hệ thống đang kết nối Supabase Cloud (RLS). Nút Khôi phục dữ liệu mẫu được khóa để tránh ghi đè dữ liệu thư viện thật!');
        return;
      }
      openCustomConfirmDialog(
        'Khôi phục dữ liệu mẫu ban đầu',
        'Toàn bộ danh mục sách, độc giả và phiếu mượn sẽ quay về dữ liệu mẫu mặc định. Bạn có chắc chắn?',
        async () => {
          try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
          const session = db.currentUser;
          db = JSON.parse(JSON.stringify(INITIAL_DB));
          db.currentUser = session;
          await saveDB('ALL');
          switchView('reader-home');
          showToast('Đã khôi phục dữ liệu gốc!');
        }
      );
    }

    // Khởi động ứng dụng & kết nối Cloud
    renderAll();
    initCloudConnection();
