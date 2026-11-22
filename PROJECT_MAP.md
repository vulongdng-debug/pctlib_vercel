# SmartLib - Bản Đồ Dự Án (PROJECT MAP)

> **Lưu ý cho AI / Lập trình viên**: Đọc file này trước để mở **đúng file cần sửa** mà không cần quét toàn bộ dự án.

## 1. Cấu trúc tệp triển khai (`Code/` → GitHub → Vercel)

| Tệp / Thư mục | Dòng | Vai trò & Các hàm chính |
| :--- | :---: | :--- |
| `index.html` | ~2.194 | Toàn bộ khung giao diện HTML (Header, Trang chủ OPAC, Hồ sơ Độc giả, Admin Dashboard, các Modal) |
| `css/styles.css` | ~145 | CSS tùy chỉnh, hiệu ứng máy quét, `@media print` in thẻ & tem mã vạch khổ A4 đa trang |
| `vercel.json` | 17 | SPA rewrite (bỏ qua `/css/`, `/js/`, `/logo.png`) + Security Headers |
| `logo.png` | - | Logo trường THPT Phan Châu Trinh & Favicon |
| `.gitignore` | - | Chặn `*.xls`, `*.xlsx`, `supabase/`, `Tam.txt`, `.env` |

## 2. Bản đồ 12 Module JavaScript (`Code/js/`, nạp theo đúng thứ tự 01 → 12)

| File | Chức năng sở hữu | Các hàm quan trọng |
| :--- | :--- | :--- |
| `js/01-config-db.js` | Cấu hình Supabase, SHA-256/XSS (`escapeHtml`, `sanitizeText`), mapper snake_case ↔ camelCase, phân trang 1.000 dòng & đồng bộ Cloud | `SUPABASE_CONFIG`, `fetchAllRows`, `upsertInChunks`, `saveDB`, `restoreAuthSessionFromSupabase`, `initCloudConnection`, `syncFromCloud` |
| `js/02-search-auth.js` | Tìm kiếm tiếng Việt không dấu (debounce 220ms), gợi ý tìm kiếm, Đăng nhập (Supabase Auth + RPC Độc giả), Đăng ký, Đăng xuất về trang chủ, Đổi MK lần đầu | `handleSearchInput`, `renderAuthHeader`, `handleLoginSubmit`, `handleRegisterSubmit`, `handleLogout`, `handleFirstLoginSubmit`, `openChangePasswordModal`, `saveUpdateProfile`, `switchView` |
| `js/03-reader-opac.js` | Hiển thị sách trang chủ, chi tiết sách, đặt mượn online, hồ sơ thẻ độc giả, hủy phiếu chờ, chọn năm học | `renderPublicBooks`, `openBookDetailModal`, `confirmOnlineBorrow`, `renderReaderProfile`, `cancelPendingBorrow`, `changeGlobalSchoolYear` |
| `js/04-admin-dashboard.js` | Thống kê chuyên sâu, báo cáo năm học, bảng quản lý Sách / Độc giả / Phiếu mượn, phân trang, chuyển lớp cuối năm | `renderAdminDeepStats`, `renderAdminStats`, `renderAdminBooks`, `renderAdminUsers`, `renderAdminBorrows`, `handlePromoteStudentsSubmit`, `getUserType` |
| `js/05-admin-crud.js` | Xem chi tiết & xóa phiếu mượn (Atomic RPC), Thêm/Sửa/Xóa Sách, Thêm/Sửa/Khóa/Xóa Độc giả | `openBorrowDetailModal`, `deleteBorrowTicket`, `saveBookForm`, `deleteBook`, `saveUserForm`, `toggleUserLock`, `deleteUser` |
| `js/06-borrows-email.js` | Cấu hình EmailJS, gửi email duyệt/trả/quá hạn, duyệt phiếu (`approve_borrow_atomic`), thu hồi sách (`return_book_atomic`), lập phiếu trực tiếp tại quầy | `EMAILJS_CONFIG`, `approvePendingBorrow`, `markBorrowReturned`, `sendOverdueEmail`, `saveAdminDirectBorrow` |
| `js/07-excel-backup.js` | Tải mẫu & Nhập/Xuất Excel Sách và Độc giả (đồng bộ theo lô 400 dòng), Sao lưu/Khôi phục JSON | `handleImportBooksExcel`, `handleImportUsersExcel`, `exportFullBackupJSON`, `importFullBackupJSON` |
| `js/08-admin-staff.js` | Phân quyền giao diện theo vai trò, tạo/sửa/khóa/xóa tài khoản Thủ thư (Supabase Auth + `staff_accounts`), đổi mật khẩu Thủ thư | `updateAdminUIPermissions`, `renderAdminStaffList`, `saveStaffForm`, `toggleStaffLock`, `deleteStaffAccount`, `handleStaffChangePasswordSubmit` |
| `js/09-ui-dialogs-renew.js` | Visual Editor, Hộp thoại In-page (`showNoticeModal`, `openCustomConfirmDialog`, `openCustomPromptDialog`), Gia hạn sách +7 ngày | `showNoticeModal`, `openCustomConfirmDialog`, `renewBorrowTicket` |
| `js/10-pos-scanner.js` | Âm thanh bíp WebAudio, bắt sóng súng quét mã vạch USB/Bluetooth HID, mượn/trả nhanh POS qua Atomic RPC | `playScannerBeep`, `processScannedBarcode`, `handleScannedBookOnPos`, `posAtomicReturnTicket`, `renderPosScannerStation` |
| `js/11-barcode-print.js` | Sinh mã vạch Code-128 (JsBarcode), bố cục in thẻ bạn đọc & tem sách khổ A4 | `renderBarcodeSvg`, `openBarcodePrintModal`, `renderBarcodePrintPreview` |
| `js/12-security-2fa-init.js` | Trung tâm Bảo mật Admin, Xác thực 2 lớp (2FA Email OTP), `renderAll()` (có `try/catch` an toàn + Footer stats), khởi động ứng dụng | `saveAdminSecurityForm`, `initiateAdmin2FAStep`, `handleAdmin2FASubmit`, `renderAll`, `initCloudConnection()` |

## 3. Kiến trúc Supabase (PostgreSQL + RLS + Atomic RPC)
* **Bảng dữ liệu**: `books`, `readers`, `borrows`, `staff_accounts`, `library_settings`, `audit_logs` (kịch bản SQL lưu tại `Code/supabase/`, không đẩy lên GitHub).
* **Quyền truy cập**:
  * **Khách vãng lai (`anon`)**: Chỉ `SELECT` bảng `books`, `library_settings`, và gọi RPC `get_public_library_stats()`.
  * **Độc giả**: Xác thực qua RPC `reader_login_and_fetch`; các thao tác đặt mượn/hủy/gia hạn/đổi MK đi qua RPC `SECURITY DEFINER`.
  * **Admin / Thủ thư**: Xác thực qua **Supabase Auth** (`resolve_staff_login_email` → `signInWithPassword`), đăng nhập bằng username (`admin`, `thuthu01`, ...); email của Admin chỉ dùng nhận 2FA OTP (`library_settings.admin_email`).
