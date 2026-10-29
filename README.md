# Hướng Dẫn Triển Khai SmartLib Lên Vercel

Dự án SmartLib là ứng dụng Single Page Application (SPA) hoàn toàn chạy ở Client-side (Frontend thuần HTML/JS/Tailwind CSS kết hợp Supabase & EmailJS).

## Cách 1: Triển khai qua GitHub (Khuyên dùng nhất)
1. Tải toàn bộ các file trong thư mục này lên một repository mới trên GitHub (gồm `index.html` và `vercel.json`).
2. Truy cập [Vercel](https://vercel.com/) và bấm **Add New...** -> **Project**.
3. Chọn repository vừa tạo và nhấn **Import**.
4. Cấu hình triển khai:
   - **Framework Preset**: Chọn **Other** (mặc định).
   - **Root Directory**: `./` (mặc định).
   - **Build and Output Settings**: Giữ nguyên (không cần build command).
5. Bấm **Deploy**. Vercel sẽ tự động cấp phát domain miễn phí dạng `ten-du-an.vercel.app`.

## Cách 2: Triển khai bằng Vercel CLI từ máy tính
1. Mở Terminal / PowerShell tại thư mục này.
2. Cài đặt Vercel CLI: `npm install -g vercel`
3. Chạy lệnh: `vercel` và làm theo các bước xác nhận.
4. Triển khai bản chính thức (Production): `vercel --prod`
