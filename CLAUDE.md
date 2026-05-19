# PEAK! – Claude Code Guide

## Project Overview
Social web app built with vanilla HTML/CSS/JS + Supabase (Auth, Database, Storage).
Deployed to GitHub Pages at: https://technovav.github.io/peak-auth/

## Stack
- Frontend: HTML, CSS, JavaScript (no framework)
- Backend: Supabase (auth, postgres, storage)
- Hosting: GitHub Pages (auto-deploy from `main` via GitHub Actions)
- i18n: `public/translations.js` — VI/EN toggle, persisted in localStorage

## Key Files
| File | Purpose |
|------|---------|
| `public/index.html` | Login page |
| `public/register.html` | Register page |
| `public/forgot.html` | Forgot password |
| `public/reset.html` | Reset password (Supabase email link target) |
| `public/home.html` | Main feed (posts, composer, sidebar) |
| `public/profile.html` | User profile editor |
| `public/dashboard.html` | Debug dashboard |
| `public/config.js` | Supabase client init + helpers |
| `public/script.js` | All page logic |
| `public/translations.js` | i18n dictionary + floating EN/VI button |
| `public/style.css` | All styles |

## Supabase Tables
- `profiles` — id, full_name, username, bio, school, class, avatar_url
- `posts` — id, author_id, content, created_at
- `likes` — post_id, user_id

## Git Push Setup (run once per session)
The local git proxy port changes every session restart. Fix by running:

```bash
git remote set-url origin https://$GITHUB_PAT@github.com/TechNovaV/peak-auth.git
```

**To set up `$GITHUB_PAT`:** In Claude Code on the web, go to **Session settings → Environment variables** and add:
- Key: `GITHUB_PAT`
- Value: your GitHub PAT (needs `repo` + `workflow` scopes)

## Branch Strategy
- `main` → auto-deploys to GitHub Pages
- Feature work → branch `claude/...` then merge to main

## Design Tokens
- Brand dark: `#1a0832`
- Brand purple: `#7b3df5`
- Brand pink: `#ff7af0`
- App background: `#f0edf8`
- Card background: `#ffffff`
