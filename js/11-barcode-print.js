    // ==================== TRUNG TÂM TẠO & IN MÃ VẠCH CODE-128 (BARCODE PRINT STUDIO) ====================
    let currentBarcodePrintTab = 'books'; // 'books' | 'users'

    function renderBarcodeSvg(selectorOrEl, value, opts = {}) {
      if (!window.JsBarcode || !value) return;
      try {
        JsBarcode(selectorOrEl, String(value).trim(), {
          format: 'CODE128',
          lineColor: '#0f172a',
          background: '#ffffff',
          width: opts.width || 1.8,
          height: opts.height || 40,
          displayValue: opts.displayValue !== false,
          fontSize: opts.fontSize || 12,
          fontOptions: 'bold',
          margin: opts.margin ?? 4
        });
      } catch (e) {}
    }

    function openBarcodePrintModal(defaultTab = 'books') {
      currentBarcodePrintTab = defaultTab;
      const gradeSel = document.getElementById('barcodePrintGradeSelect');
      const classSel = document.getElementById('barcodePrintClassSelect');
      const filterInput = document.getElementById('barcodePrintFilterInput');
      if (gradeSel) gradeSel.value = '';
      if (classSel) classSel.value = '';
      if (filterInput) filterInput.value = '';
      document.getElementById('barcodePrintModal').classList.remove('hidden');
      switchBarcodePrintTab(defaultTab);
    }

    function closeBarcodePrintModal() {
      document.getElementById('barcodePrintModal').classList.add('hidden');
    }

    function getUserGradeLevel(u) {
      if (getUserType(u) === 'teacher') return 'teacher';
      const grp = String(u.group || '').trim();
      const m = grp.match(/(?:^|[^\d])(10|11|12)(?:[^\d]|$)/);
      return m ? m[1] : 'other';
    }

    function onPrintGradeChange() {
      populatePrintClassFilter(true);
      renderBarcodePrintPreview();
    }

    function populatePrintClassFilter(resetClass = false) {
      const select = document.getElementById('barcodePrintClassSelect');
      const gradeSelect = document.getElementById('barcodePrintGradeSelect');
      if (!select) return;

      const selectedGrade = gradeSelect ? gradeSelect.value : '';
      const currentYear = db.currentSchoolYear || '2026-2027';
      const classesSet = new Set();

      db.users.forEach(u => {
        const matchYear = currentYear === 'ALL' || (u.schoolYear || '2026-2027') === currentYear;
        if (!matchYear || !u.group) return;
        if (selectedGrade && selectedGrade !== 'ALL' && getUserGradeLevel(u) !== selectedGrade) return;
        classesSet.add(u.group.trim());
      });

      const sortedClasses = Array.from(classesSet).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
      const currentVal = resetClass ? (selectedGrade ? 'ALL' : '') : (select.value || '');
      const firstOption = selectedGrade
        ? `<option value="ALL">-- Tất cả (${selectedGrade === 'teacher' ? 'Giáo viên' : (selectedGrade === 'ALL' ? 'Toàn trường' : 'Khối ' + selectedGrade)}) --</option>`
        : `<option value="">-- Chọn Lớp / Tổ --</option>`;

      select.innerHTML = firstOption + sortedClasses.map(cls => {
        const label = selectedGrade === 'teacher' ? `Tổ ${cls}` : cls;
        return `<option value="${cls}" ${cls === currentVal ? 'selected' : ''}>${label}</option>`;
      }).join('');
    }

    function switchBarcodePrintTab(tab) {
      currentBarcodePrintTab = tab;
      const btnBooks = document.getElementById('btnPrintTabBooks');
      const btnUsers = document.getElementById('btnPrintTabUsers');
      const copyModeSelect = document.getElementById('barcodePrintCopyMode');
      const classWrapper = document.getElementById('cardPrintClassFilterWrapper');
      const gradeWrapper = document.getElementById('cardPrintGradeFilterWrapper');

      if (tab === 'books') {
        if (btnBooks) btnBooks.className = 'px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-1.5 shadow-sm';
        if (btnUsers) btnUsers.className = 'px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-1.5';
        if (copyModeSelect) copyModeSelect.classList.remove('hidden');
        if (classWrapper) classWrapper.classList.add('hidden');
        if (gradeWrapper) gradeWrapper.classList.add('hidden');
      } else {
        if (btnUsers) btnUsers.className = 'px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-1.5 shadow-sm';
        if (btnBooks) btnBooks.className = 'px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-1.5';
        if (copyModeSelect) copyModeSelect.classList.add('hidden');
        if (classWrapper) classWrapper.classList.remove('hidden');
        if (gradeWrapper) gradeWrapper.classList.remove('hidden');
        populatePrintClassFilter();
      }
      renderBarcodePrintPreview();
    }

    function renderBarcodePrintPreview() {
      const grid = document.getElementById('barcodePrintGrid');
      const summary = document.getElementById('barcodePrintSummaryText');
      if (!grid) return;

      const q = removeVietnameseTones((document.getElementById('barcodePrintFilterInput')?.value || '').trim());
      const copyMode = document.getElementById('barcodePrintCopyMode')?.value || 'single';

      if (currentBarcodePrintTab === 'books') {
        const matchedBooks = db.books.filter(b => {
          if (!q) return true;
          return removeVietnameseTones(b.code).includes(q) ||
                 removeVietnameseTones(b.title).includes(q) ||
                 removeVietnameseTones(b.category).includes(q) ||
                 removeVietnameseTones(b.shelf || '').includes(q);
        });

        const labelItems = [];
        matchedBooks.forEach(b => {
          const copies = copyMode === 'all_copies' ? Math.min(10, Math.max(1, Number(b.total) || 1)) : 1;
          for (let i = 1; i <= copies; i++) {
            labelItems.push({ book: b, copyIndex: i, totalCopies: copies });
          }
        });

        summary.textContent = `Đang hiển thị ${labelItems.length} tem mã vạch sách (Chuẩn CODE-128 cho súng quét)`;
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4';
        grid.innerHTML = labelItems.map((item, idx) => `
          <div class="bg-white border-2 border-dashed border-slate-300 rounded-xl p-3 text-center flex flex-col justify-between shadow-sm">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-blue-700">Thư viện trường THPT Phan Châu Trinh</p>
              <p class="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">${item.book.title}</p>
              <p class="text-[10px] text-slate-500">${item.book.category} • <strong>${item.book.shelf || 'Kệ A1'}</strong> ${item.totalCopies > 1 ? `(Bản #${item.copyIndex})` : ''}</p>
            </div>
            <div class="my-1.5">
              <svg id="print-book-bc-${idx}" class="mx-auto max-h-14 w-full"></svg>
            </div>
          </div>
        `).join('');

        labelItems.forEach((item, idx) => {
          renderBarcodeSvg(`#print-book-bc-${idx}`, item.book.code, { height: 38, fontSize: 12, margin: 2 });
        });
      } else {
        const currentYear = db.currentSchoolYear || '2026-2027';
        const selectedGrade = document.getElementById('barcodePrintGradeSelect')?.value || '';
        const selectedClass = document.getElementById('barcodePrintClassSelect')?.value || '';

        if (!selectedGrade && !selectedClass && !q) {
          summary.innerHTML = `Sẵn sàng • Vui lòng chọn <strong>Khối/GV</strong>, <strong>Lớp/Tổ</strong> hoặc nhập từ khóa để tải thẻ.`;
          grid.className = 'space-y-6';
          grid.innerHTML = `
            <div class="py-16 px-4 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300 max-w-2xl mx-auto">
              <i class="ph-duotone ph-funnel text-4xl mb-2 block text-blue-500"></i>
              <p class="font-bold text-slate-800 text-sm">Chưa tải danh sách thẻ để đảm bảo tốc độ mượt mà</p>
              <p class="text-xs text-slate-500 mt-1">Vui lòng chọn <strong>Khối/GV</strong>, <strong>Lớp/Tổ</strong> hoặc nhập <strong>Tên / Mã thẻ</strong> ở thanh công cụ phía trên để hiển thị thẻ cần in.</p>
            </div>
          `;
          return;
        }

        const matchedUsers = db.users.filter(u => {
          const matchYear = currentYear === 'ALL' || (u.schoolYear || '2026-2027') === currentYear;
          if (!matchYear) return false;
          if (selectedGrade && selectedGrade !== 'ALL' && getUserGradeLevel(u) !== selectedGrade) return false;
          const userGroup = (u.group || '').trim();
          const matchClass = !selectedClass || selectedClass === 'ALL' || userGroup.toLowerCase() === selectedClass.toLowerCase();
          if (!matchClass) return false;
          if (!q) return true;
          return removeVietnameseTones(u.cardCode).includes(q) ||
                 removeVietnameseTones(u.fullName).includes(q) ||
                 removeVietnameseTones(u.group).includes(q);
        });

        // Chia nhóm đúng 08 thẻ / trang giấy A4 (2 cột x 4 hàng)
        const CARDS_PER_PAGE = 8;
        const pages = [];
        for (let i = 0; i < matchedUsers.length; i += CARDS_PER_PAGE) {
          pages.push(matchedUsers.slice(i, i + CARDS_PER_PAGE));
        }

        const totalPages = pages.length;
        summary.innerHTML = `Đang chọn <strong>${matchedUsers.length}</strong> bạn đọc ${selectedClass !== 'ALL' ? `(Lớp ${selectedClass})` : ''} • Chia thành <strong>${totalPages} trang giấy A4</strong> (Chuẩn đúng 08 thẻ / trang có khung dán ảnh 3x4)`;
        grid.className = 'space-y-6';

        if (matchedUsers.length === 0) {
          grid.innerHTML = `
            <div class="py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
              <i class="ph-duotone ph-identification-card text-4xl mb-2 block text-slate-300"></i>
              Không tìm thấy bạn đọc nào phù hợp với lớp hoặc từ khóa tìm kiếm.
            </div>
          `;
          return;
        }

        let globalIdx = 0;
        grid.innerHTML = pages.map((chunk, pageIdx) => `
          <div class="a4-print-page bg-white p-4 border border-slate-300 shadow-md mb-8 rounded-2xl mx-auto w-full max-w-[210mm]">
            <div class="a4-screen-indicator flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs font-bold text-slate-500">
              <span class="flex items-center gap-1.5"><i class="ph-bold ph-printer text-blue-600"></i> Trang A4 số ${pageIdx + 1} / ${totalPages} ${selectedClass !== 'ALL' ? `(Lớp ${selectedClass})` : ''}</span>
              <span class="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">${chunk.length} / 8 thẻ</span>
            </div>
            <div class="a4-page-grid grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              ${chunk.map(u => {
                const cardHtml = `
                  <div class="library-card-item bg-white border-2 border-blue-900 rounded-xl p-2 flex flex-col justify-between shadow-sm relative overflow-hidden text-left bg-gradient-to-b from-blue-50/20 via-white to-white">
                    <!-- Header thẻ -->
                    <div class="flex items-center gap-2 pb-1.5 border-b border-blue-900/30">
                      <img src="logo.png" alt="Logo" class="w-8 h-8 object-contain shrink-0 drop-shadow-xs" />
                      <div class="min-w-0 flex-1 text-center">
                        <p class="text-[7.5px] font-bold text-slate-600 uppercase tracking-tight">SỞ GD&ĐT ĐÀ NẴNG - THPT PHAN CHÂU TRINH</p>
                        <h5 class="text-[11.5px] font-black text-blue-950 uppercase tracking-wide mt-0.5 leading-none">THẺ THƯ VIỆN ĐIỆN TỬ</h5>
                      </div>
                      <span class="text-[7.5px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0"> NH ${currentYear !== 'ALL' ? currentYear : (u.schoolYear || '2026-2027')}</span>
                    </div>

                    <!-- Thân thẻ: Bên trái dán ảnh 3x4, Bên phải thông tin -->
                    <div class="flex items-center gap-2.5 py-1.5">
                      <!-- Khung dán ảnh 3x4 cm -->
                      <div class="w-[22mm] h-[29mm] border-[1.5px] border-dashed border-slate-400 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center shrink-0 p-0.5">
                        <i class="ph-bold ph-user text-slate-300 text-2xl"></i>
                        <span class="text-[8px] font-bold text-slate-500 uppercase mt-1 leading-none">Ảnh 3x4</span>
                        <span class="text-[7px] text-slate-400 mt-0.5">(Dán ảnh)</span>
                      </div>

                      <!-- Thông tin bạn đọc -->
                      <div class="min-w-0 flex-1 space-y-1 text-black">
                        <div>
                          <span class="text-[7.5px] text-black uppercase font-semibold block leading-none">Họ và tên bạn đọc:</span>
                          <h4 class="text-[12px] font-black text-black uppercase truncate mt-1 pt-0.5 leading-normal">${u.fullName}</h4>
                        </div>
                        <div class="grid grid-cols-2 gap-1 text-[9px]">
                          <div>
                            <span class="text-black block text-[7.5px] leading-none">Lớp / Tổ:</span>
                            <strong class="text-black font-bold text-[10.5px]">${u.group}</strong>
                          </div>
                          <div>
                            <span class="text-black block text-[7.5px] leading-none">Mã số thẻ:</span>
                            <strong class="font-mono font-bold text-black text-[10.5px]">${u.cardCode}</strong>
                          </div>
                        </div>
                        <div class="pt-0.5 border-t border-slate-300 flex items-center justify-between text-[7.5px] text-black">
                          <span>${getUserType(u) === 'teacher' ? 'Đối tượng: <strong>Cán bộ / GV</strong>' : `Niên khóa: <strong>${getUserCohort(u, currentYear)}</strong>`}</span>
                          <span class="text-[7px] text-black font-bold uppercase">Có giá trị toàn trường</span>
                        </div>
                      </div>
                    </div>

                    <!-- Đáy thẻ: Barcode mã độc giả (Code-128) -->
                    <div class="pt-1 border-t border-slate-200 text-center bg-white">
                      <svg id="print-user-bc-${globalIdx}" class="mx-auto max-h-[14mm] w-full"></svg>
                    </div>
                  </div>
                `;
                globalIdx++;
                return cardHtml;
              }).join('')}
            </div>
          </div>
        `).join('');

        // Sinh mã vạch chuẩn Code-128 từ cardCode cho từng thẻ
        globalIdx = 0;
        pages.forEach(chunk => {
          chunk.forEach(u => {
            renderBarcodeSvg(`#print-user-bc-${globalIdx}`, u.cardCode, { height: 22, fontSize: 9.5, margin: 1 });
            globalIdx++;
          });
        });
      }
    }
