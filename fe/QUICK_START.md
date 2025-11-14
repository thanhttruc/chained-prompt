# 🚀 Hướng dẫn nhanh

## Bước 1: Cài đặt dependencies

```bash
cd fe
npm install
```

## Bước 2: Cấu hình môi trường

Tạo file `.env` trong thư mục `fe/`:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## Bước 3: Chạy development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: http://localhost:3000

## 📝 Các lệnh khác

- `npm run build` - Build production
- `npm run preview` - Preview production build
- `npm run lint` - Chạy ESLint

## 🔗 Kết nối với Backend

Đảm bảo backend đang chạy tại `http://localhost:3001` để API hoạt động đúng.

## 📚 Cấu trúc chính

- **Pages**: `src/pages/` - Các trang chính (Home, Login, Register, Dashboard)
- **Components**: `src/components/` - Component tái sử dụng
- **API**: `src/api/` - Service functions để gọi API
- **Context**: `src/context/` - Quản lý state (Auth, Theme)
- **Router**: `src/router/` - Định nghĩa routes

