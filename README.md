# Peak Auth API

Production-ready authentication & authorization API built with Node.js, Express, and MongoDB. Implements industry best practices: JWT access + refresh tokens, role-based access control, email verification, password reset, and multi-device session management.

[![CI](https://github.com/TechNovaV/peak-auth/actions/workflows/ci.yml/badge.svg)](https://github.com/TechNovaV/peak-auth/actions/workflows/ci.yml)
[![Deploy Docs](https://github.com/TechNovaV/peak-auth/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/TechNovaV/peak-auth/actions/workflows/deploy-docs.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-97%20passing-success)](#testing)
[![Coverage](https://img.shields.io/badge/coverage-~90%25-success)](#testing)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-orange)](https://technovav.github.io/peak-auth/)
[![Code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4)](https://prettier.io/)

> 📖 **[Live API Documentation →](https://technovav.github.io/peak-auth/)**

---

## Highlights

- **17 documented endpoints** across 6 tags (Auth, Password, Email, User, Admin, System)
- **97 automated tests** running in ~60s with MongoDB in-memory (no real DB needed)
- **3-layer protection**: pre-commit lint → pre-push test → GitHub Actions CI on Node 20 & 22
- **JWT access (15m) + refresh (7d)** with HttpOnly cookie and per-session revocation
- **Multi-device sessions**: list active sessions, revoke any device individually
- **Anti-enumeration**, **anti-timing-attack**, **single-use tokens**, **token rotation**
- **Interactive API docs** via Swagger UI at `/api-docs`

## Tech Stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Runtime    | Node.js >= 20                                      |
| Framework  | Express 5                                          |
| Database   | MongoDB + Mongoose                                 |
| Auth       | JSON Web Token, bcryptjs                           |
| Security   | Helmet, CORS, express-rate-limit                   |
| Validation | Custom validators                                  |
| Email      | Nodemailer-ready stub (dev: console log)           |
| Docs       | OpenAPI 3.0 (swagger-jsdoc + swagger-ui-express)   |
| Tests      | Jest, Supertest, mongodb-memory-server             |
| Quality    | ESLint (flat config), Prettier, Husky, lint-staged |
| CI         | GitHub Actions (Node 20 + 22 matrix)               |

## Quick Start

### Prerequisites

- Node.js >= 20
- MongoDB running locally (or MongoDB Atlas connection string)

### Setup

```bash
git clone https://github.com/TechNovaV/peak-auth.git
cd peak-auth
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
npm run dev
```

Server runs at `http://localhost:3000`. Open `http://localhost:3000/api-docs` for interactive API documentation.

### Generate secure JWT secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run twice to get two different secrets (access and refresh must differ).

## API Documentation

- **Live (public)**: [https://technovav.github.io/peak-auth/](https://technovav.github.io/peak-auth/) — Redoc, auto-deployed from `main`
- **Local interactive**: http://localhost:3000/api-docs (Swagger UI with Try-it-out, requires `npm run dev`)
- **Raw OpenAPI spec**: `/api-docs.json` (local) or [`docs/openapi.json`](docs/openapi.json) (importable to Postman/Insomnia/Bruno)

### Endpoints

| Method | Path                            | Auth   | Description                                          |
| ------ | ------------------------------- | ------ | ---------------------------------------------------- |
| POST   | `/api/auth/register`            | –      | Create account, optionally with email + verify token |
| POST   | `/api/auth/login`               | –      | Returns access token, sets refresh cookie            |
| POST   | `/api/auth/refresh`             | cookie | New access token                                     |
| POST   | `/api/auth/logout`              | cookie | Revoke current session                               |
| POST   | `/api/auth/forgot-password`     | –      | Request reset token (anti-enumeration)               |
| POST   | `/api/auth/reset-password`      | –      | Reset with token (single-use, revokes all sessions)  |
| POST   | `/api/auth/verify-email`        | –      | Verify email with token                              |
| POST   | `/api/auth/resend-verification` | –      | New verify token (rotates old)                       |
| POST   | `/api/auth/change-password`     | Bearer | Change while logged in (revokes all sessions)        |
| PATCH  | `/api/auth/profile`             | Bearer | Update username and/or email                         |
| DELETE | `/api/auth/account`             | Bearer | Hard delete (requires password)                      |
| GET    | `/api/auth/me`                  | Bearer | Current user info                                    |
| GET    | `/api/auth/sessions`            | Bearer | List active sessions                                 |
| DELETE | `/api/auth/sessions/:id`        | Bearer | Revoke specific session                              |
| GET    | `/api/admin/users`              | admin  | List all users                                       |
| PATCH  | `/api/admin/users/:id/role`     | admin  | Change user role                                     |
| GET    | `/health`                       | –      | Health check                                         |

## Testing

```bash
npm test               # Run all tests
npm run test:watch     # Watch mode for TDD
npm run test:coverage  # With coverage report
```

### Stats

```
Test Suites: 8 passed, 8 total
Tests:       97 passed, 97 total
Time:        ~60s
Coverage:    ~90% statements
```

Tests use [`mongodb-memory-server`](https://github.com/typegoose/mongodb-memory-server) so no real database is needed during tests, and each test gets a clean DB.

### Test files

| File                           | Tests | Focus                                 |
| ------------------------------ | ----- | ------------------------------------- |
| `tests/auth.test.js`           | 19    | register, login, refresh, logout, /me |
| `tests/admin.test.js`          | 9     | RBAC, list users, update role         |
| `tests/forgotPassword.test.js` | 10    | forgot/reset flow                     |
| `tests/verifyEmail.test.js`    | 13    | verify/resend with token rotation     |
| `tests/changePassword.test.js` | 11    | TDD demo — password change            |
| `tests/profileUpdate.test.js`  | 13    | TDD demo — profile update             |
| `tests/deleteAccount.test.js`  | 9     | TDD demo — account deletion           |
| `tests/sessions.test.js`       | 13    | Multi-device session management       |

## Project Structure

```
peak-auth/
├── .github/
│   ├── workflows/ci.yml          GitHub Actions CI (Node 20 + 22 matrix)
│   └── pull_request_template.md  PR template with checklist
├── .husky/
│   ├── pre-commit                Runs lint-staged on staged files
│   └── pre-push                  Runs full test suite
├── src/
│   ├── server.js                 Entry point (loads env, connects DB, listens)
│   ├── app.js                    Express app config (middleware, routes, errors)
│   ├── config/
│   │   ├── env.js                Centralized env vars + validation
│   │   ├── db.js                 MongoDB connection
│   │   └── swagger.js            OpenAPI spec definition
│   ├── routes/
│   │   ├── auth.routes.js        14 auth endpoints with JSDoc
│   │   └── admin.routes.js       2 admin endpoints with JSDoc
│   ├── controllers/
│   │   ├── auth.controller.js    Auth handlers (register, login, sessions, etc.)
│   │   └── admin.controller.js   Admin handlers (list users, update role)
│   ├── models/
│   │   └── User.js               User schema + embedded sessions array
│   ├── middlewares/
│   │   ├── auth.js               verifyToken + requireRole
│   │   ├── rateLimiter.js        5 req / 15 min on auth routes
│   │   └── errorHandler.js       Centralized error response
│   ├── services/
│   │   └── mailer.js             Email stub (dev logs to console)
│   ├── utils/
│   │   ├── validators.js         Field validators + httpError helper
│   │   └── tokens.js             Crypto random token + SHA-256 hash
│   └── scripts/
│       └── seedAdmin.js          CLI to promote a user to admin
├── tests/                        97 test cases across 8 files
├── eslint.config.js              ESLint flat config (recommended + Jest globals)
├── .prettierrc.json              Prettier config (LF, double quotes, trailing commas)
├── render.yaml                   Render Blueprint (production deploy config)
├── .env.example                  Template for environment variables
└── package.json                  Scripts: dev, start, test, lint, format
```

## Security Notes

- **Passwords**: bcrypt with cost factor 12
- **Reset & verify tokens**: SHA-256 hash stored in DB (raw token only in email)
- **JWT secrets**: must differ for access vs refresh (enforced at startup)
- **Refresh cookie**: `HttpOnly`, `SameSite=Strict`, `Secure` in production
- **Rate limit**: 5 requests / 15 min / IP on auth endpoints (bypassed in tests)
- **Timing-safe login**: bcrypt compare against dummy hash when user doesn't exist
- **Anti-enumeration**: `/forgot-password` and `/resend-verification` always return 200 with generic message
- **Session revocation**: change/reset password clears all sessions; logout clears only current
- **Lockout protection**: admin cannot demote their own role

## Development Workflow

```
git commit  ──▶  pre-commit hook (lint-staged: eslint --fix + prettier --write)
                 ▼
                 commit succeeds only if no eslint errors
                 ▼
git push    ──▶  pre-push hook (npm test, ~30s)
                 ▼
                 push succeeds only if all 97 tests pass
                 ▼
GitHub      ──▶  CI workflow (Node 20 + Node 22 in parallel, ~2 min)
                 ▼
                 branch protection blocks merge until both checks pass
```

## Roadmap

- [x] Basic auth (register, login)
- [x] JWT access + refresh tokens
- [x] Refresh token rotation per session
- [x] Forgot password / reset password flow
- [x] Email verification flow
- [x] RBAC with admin endpoints
- [x] Multi-device session management
- [x] Profile update (username/email with re-verification)
- [x] Account deletion (with password confirmation)
- [x] OpenAPI 3.0 / Swagger UI documentation
- [x] 97 automated tests with mongodb-memory-server
- [x] CI/CD with GitHub Actions (Node 20 & 22 matrix)
- [x] Pre-commit & pre-push hooks (Husky + lint-staged)
- [x] Branch protection on main
- [x] Public API docs on GitHub Pages (Redoc)
- [ ] Deploy to Render / Railway with MongoDB Atlas
- [ ] Real SMTP integration (Resend / Gmail / SendGrid)
- [ ] Structured logging (pino) with request ID
- [ ] 2FA / TOTP support
- [ ] OAuth (Google / GitHub social login)
- [ ] Conventional Commits enforcement + auto-CHANGELOG

## Scripts

| Command                 | Purpose                          |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Start with auto-reload (nodemon) |
| `npm start`             | Start production server          |
| `npm test`              | Run all 97 tests                 |
| `npm run test:watch`    | Watch mode for TDD               |
| `npm run test:coverage` | Tests + coverage report          |
| `npm run lint`          | Check lint errors                |
| `npm run lint:fix`      | Auto-fix lint errors             |
| `npm run format`        | Format all files with Prettier   |
| `npm run format:check`  | Check formatting without writing |

## Contributing

This is a learning / portfolio project but contributions are welcome. See [`.github/pull_request_template.md`](.github/pull_request_template.md) for PR checklist. All PRs must pass CI before merging (`Test (Node 20)` and `Test (Node 22)` status checks are required).

## License

[MIT](LICENSE) © Nguyễn Quốc Vinh

## Author

**Nguyễn Quốc Vinh** — [@TechNovaV](https://github.com/TechNovaV)
