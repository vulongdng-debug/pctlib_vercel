    // ==================== VISUAL DESIGN EDITOR SCRIPT ====================
    let isVisualEditMode = false;
    function toggleVisualEditText() {
      isVisualEditMode = !isVisualEditMode;
      document.body.contentEditable = isVisualEditMode ? 'true' : 'false';
      document.getElementById('visualEditorToolbar').contentEditable = 'false';
      const btn = document.getElementById('btnVisualEdit');
      if (isVisualEditMode) {
        btn.className = 'px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center gap-1.5 transition';
        btn.innerHTML = '<i class="ph-bold ph-check"></i> Đang Sửa (Nhấp vào chữ)';
      } else {
        btn.className = 'px-3 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold flex items-center gap-1.5 transition';
        btn.innerHTML = '<i class="ph-bold ph-pencil-simple"></i> Bật Sửa Chữ';
      }
    }

    function changeThemeColor(newColor) {
      const colors = ['blue', 'emerald', 'indigo', 'teal'];
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        if (!el.className || typeof el.className !== 'string') return;
        colors.forEach(oldColor => {
          if (oldColor !== newColor) {
            el.className = el.className.replaceAll(`bg-${oldColor}-`, `bg-${newColor}-`)
                                       .replaceAll(`text-${oldColor}-`, `text-${newColor}-`)
                                       .replaceAll(`border-${oldColor}-`, `border-${newColor}-`)
                                       .replaceAll(`from-${oldColor}-`, `from-${newColor}-`)
                                       .replaceAll(`via-${oldColor}-`, `via-${newColor}-`);
          }
        });
      });
    }

    function downloadEditedHTML() {
      document.body.contentEditable = 'false';
      const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'index.html';
      a.click();
    }

    // ==================== HỆ THỐNG HỘP THOẠI IN-PAGE (KHÔNG DÙNG ALERT/CONFIRM/PROMPT) ====================
    let customDialogCallback = null;
    let customDialogMode = 'confirm'; // 'notice' | 'confirm' | 'prompt'

    function showNoticeModal(title, message) {
      customDialogMode = 'notice';
      customDialogCallback = null;
      document.getElementById('customDialogTitle').textContent = title || 'Thông báo hệ thống';
      document.getElementById('customDialogMessage').textContent = message || '';
      document.getElementById('customDialogInputWrapper').classList.add('hidden');
      document.getElementById('customDialogCancelBtn').classList.add('hidden');
      document.getElementById('customDialogConfirmBtn').textContent = 'Đã hiểu';
      document.getElementById('customDialogModal').classList.remove('hidden');
    }

    function openCustomConfirmDialog(title, message, onConfirm) {
      customDialogMode = 'confirm';
      customDialogCallback = onConfirm;
      document.getElementById('customDialogTitle').textContent = title || 'Xác nhận';
      document.getElementById('customDialogMessage').textContent = message || '';
      document.getElementById('customDialogInputWrapper').classList.add('hidden');
      document.getElementById('customDialogCancelBtn').classList.remove('hidden');
      document.getElementById('customDialogConfirmBtn').textContent = 'Đồng ý';
      document.getElementById('customDialogModal').classList.remove('hidden');
    }

    function openCustomPromptDialog(title, message, defaultValue, onConfirm) {
      customDialogMode = 'prompt';
      customDialogCallback = onConfirm;
      document.getElementById('customDialogTitle').textContent = title || 'Nhập thông tin';
      document.getElementById('customDialogMessage').textContent = message || '';
      const inputEl = document.getElementById('customDialogInput');
      inputEl.value = defaultValue || '';
      document.getElementById('customDialogInputWrapper').classList.remove('hidden');
      document.getElementById('customDialogCancelBtn').classList.remove('hidden');
      document.getElementById('customDialogConfirmBtn').textContent = 'Lưu thay đổi';
      document.getElementById('customDialogModal').classList.remove('hidden');
      setTimeout(() => inputEl.focus(), 60);
    }

    function closeCustomDialog() {
      document.getElementById('customDialogModal').classList.add('hidden');
      customDialogCallback = null;
    }

    function confirmCustomDialogAction() {
      const cb = customDialogCallback;
      const mode = customDialogMode;
      const val = document.getElementById('customDialogInput').value;
      closeCustomDialog();
      if (typeof cb === 'function') {
        if (mode === 'prompt') cb(val);
        else cb();
      }
    }

    // ==================== GIA HẠN SÁCH TRỰC TUYẾN (+7 NGÀY) ====================
    async function renewBorrowTicket(borrowId) {
      const b = db.borrows.find(x => x.id === borrowId);
      if (!b || b.status !== 'borrowing') return;
      if (isOverdue(b)) {
        showNoticeModal('Không thể gia hạn', 'Phiếu mượn này đã quá hạn trả. Vui lòng mang sách đến quầy thư viện để xử lý!');
        return;
      }
      if (b.renewed) {
        showNoticeModal('Đã hết lượt gia hạn', 'Mỗi phiếu mượn chỉ được gia hạn trực tuyến tối đa 1 lần (+7 ngày).');
        return;
      }

      if (isCloudConnected && supabaseClient) {
        if (db.currentUser?.role === 'reader') {
          const cred = getSavedReaderCred();
          const { data: res, error } = await supabaseClient.rpc('reader_renew_borrow', {
            p_reader_id: db.currentUser.id,
            p_password_hash: cred?.passHash || '',
            p_plain_is_default: Boolean(cred?.isDefaultInput),
            p_borrow_id: borrowId
          });
          if (error || !res || !res.success) {
            showNoticeModal('Không thể gia hạn', res?.error || error?.message || 'Lỗi kết nối Cloud!');
            return;
          }
          b.dueDate = res.dueDate;
          b.renewed = true;
          renderAll();
          playScannerBeep('success');
          showToast(`Đã gia hạn phiếu ${b.ticketCode} thêm 7 ngày (Hạn mới: ${b.dueDate})!`);
          return;
        }
      }

      const currentDue = new Date(b.dueDate);
      currentDue.setDate(currentDue.getDate() + 7);
      const nextDue = currentDue.toISOString().split('T')[0];
      if (isCloudConnected && supabaseClient && db.currentUser?.role === 'admin') {
        const { error } = await supabaseClient.from('borrows').update({ due_date: nextDue, renewed: true }).eq('id', borrowId);
        if (error) {
          showNoticeModal('Lỗi gia hạn', error.message || 'Không thể cập nhật trên Cloud!');
          return;
        }
      }
      b.dueDate = nextDue;
      b.renewed = true;
      await saveDB('borrows');
      playScannerBeep('success');
      showToast(`Đã gia hạn phiếu ${b.ticketCode} thêm 7 ngày (Hạn mới: ${b.dueDate})!`);
    }

