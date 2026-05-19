# SocialApp (Supabase)

Mạng xã hội mini — pure **HTML/CSS/JS** frontend, dùng **Supabase** làm backend (Auth + Database + Storage). Không cần server riêng, deploy được lên bất kỳ static host nào (Vercel, Netlify, GitHub Pages).

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20Supabase-3ecf8e)](https://supabase.com/)

## Tính năng

- Đăng ký / đăng nhập (Supabase Auth)
- Quên mật khẩu / đặt lại mật khẩu (Supabase reset email)
- Profile: full name, username, bio, school, class
- Avatar upload (Supabase Storage)
- Đăng bài (posts) + thả tim (likes) + xóa bài của mình
- Feed: 50 bài mới nhất, kèm avatar + tên tác giả
- Row Level Security (RLS): user chỉ sửa/xóa của mình

## Cấu trúc

```
project/
├── public/                Frontend (mở trong browser)
│   ├── index.html         Login
│   ├── register.html      Đăng ký
│   ├── forgot.html        Quên mật khẩu
│   ├── reset.html         Đặt lại mật khẩu
│   ├── home.html          Feed + composer
│   ├── profile.html       Chỉnh sửa profile + upload avatar
│   ├── dashboard.html     (page debug)
│   ├── config.js          Supabase client config
│   ├── script.js          Logic toàn app
│   └── style.css
├── supabase/              SQL setup (chạy 1 lần khi tạo project)
│   ├── 01_profiles.sql
│   ├── 02_posts.sql
│   └── 03_storage.sql
└── README.md
```

## Setup

### 1. Tạo Supabase project

1. Vào https://app.supabase.com → **New Project**
2. Đợi vài phút cho database khởi tạo
3. **Project Settings → API** copy: Project URL + `anon` public key

### 2. Chạy 3 file SQL

Vào **SQL Editor** trên Supabase Dashboard, chạy lần lượt:

1. `supabase/01_profiles.sql` — tạo bảng profiles + trigger auto-create khi đăng ký
2. `supabase/02_posts.sql` — tạo bảng posts + likes + RLS
3. `supabase/03_storage.sql` — tạo bucket avatars + storage policies

### 3. Cập nhật credentials trong `public/config.js`

```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbG...your-anon-key";
```

### 4. Chạy frontend

**Cách 1: VSCode Live Server** (recommended)
- Cài extension **Live Server**
- Chuột phải `public/index.html` → **Open with Live Server**

**Cách 2: http-server**
```bash
npm run dev
```

**Cách 3: Python**
```bash
cd public
python -m http.server 5500
```

Mở: http://localhost:5500/

### 5. Tùy chọn — tắt Email Confirmation

Để test nhanh không cần confirm email:
Supabase Dashboard → **Authentication → Providers → Email** → bỏ check **Confirm email**

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | HTML5 + CSS3 + Vanilla JavaScript (ES2017+) |
| Auth | Supabase Auth (email/password, JWT, password reset) |
| Database | PostgreSQL via Supabase (with RLS policies) |
| Storage | Supabase Storage (S3-compatible) |
| Hosting | Static — không cần Node server |

## Security

- **Row Level Security (RLS)** ép mọi query qua policy: user chỉ select/insert/update/delete data của mình
- **Avatar upload**: user chỉ upload được vào folder `<user_id>/` của mình
- **Posts**: ai cũng đọc được, chỉ author insert/delete được bài của mình
- **Likes**: tương tự — chỉ user like/unlike của mình
- **Auth**: Supabase quản lý JWT, refresh token, password hash (bcrypt) tự động

## Architecture

```
Browser
  │
  ├── HTML pages (static)
  │
  └── @supabase/supabase-js SDK
        │
        └─────── HTTPS ───────┐
                              ▼
                    ┌─────────────────────┐
                    │  Supabase Cloud     │
                    │  ┌───────────────┐  │
                    │  │ Auth (GoTrue) │  │
                    │  ├───────────────┤  │
                    │  │ PostgreSQL    │  │
                    │  │ + RLS         │  │
                    │  ├───────────────┤  │
                    │  │ Storage (S3)  │  │
                    │  └───────────────┘  │
                    └─────────────────────┘
```

## License

[MIT](LICENSE) © Nguyễn Quốc Vinh

## Author

**Nguyễn Quốc Vinh** — [@TechNovaV](https://github.com/TechNovaV)
