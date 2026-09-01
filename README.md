# ✂️ Bearded Guys Barbershop — Portfolio Website

A modern, responsive portfolio website for a barbershop. Features a public-facing landing page with a dynamic gallery powered by **Supabase Storage**, and a secure owner-only admin portal for uploading and managing photos.

---

## 📋 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES Modules) |
| Auth | Supabase Auth (email + password) |
| Storage | Supabase Storage |
| Fonts | Google Fonts — Bebas Neue + Inter |
| Deployment | Netlify (or any static host) |

---

## 🗂️ Project Structure

```
bearded-guys-website/
├── index.html              ← Public portfolio landing page
├── login.html              ← Owner login (glassmorphism)
├── admin.html              ← Protected gallery management
├── css/
│   ├── styles.css          ← Global / public styles
│   └── admin.css           ← Admin dashboard styles
├── js/
│   ├── config.js           ← 🔒 YOUR CREDENTIALS (git-ignored)
│   ├── config.example.js   ← Template — safe to commit
│   ├── supabase-client.js  ← Supabase SDK initializer
│   ├── auth.js             ← Login / logout / session helpers
│   ├── gallery.js          ← Public gallery loader + lightbox
│   └── admin.js            ← Admin upload / delete / CRUD
├── assets/
│   └── brand/              ← Logo & favicon (logo.png, logo-badge.png, favicon.png, favicon.ico)
├── .gitignore
├── netlify.toml
└── README.md
```

---

## ⚡ Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/bearded-guys-website.git
cd bearded-guys-website
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. After project creation, go to **Settings → API** and copy:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`)
   - **Anon / public key**

### 3. Create a Storage Bucket

1. In your Supabase project → **Storage → New Bucket**
2. Name it exactly: `gallery`
3. Set it to **Public** (so the website can display images without auth)

### 4. Configure your credentials

```bash
cp js/config.example.js js/config.js
```

Open `js/config.js` and fill in your values:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';
const STORAGE_BUCKET = 'gallery';
```

> ⚠️ `config.js` is listed in `.gitignore` — it will **never** be committed.

### 5. Invite the owner account

1. In Supabase → **Authentication → Users → Invite user**
2. Enter the owner's email address
3. The owner will receive a link to set their password

### 6. Open in browser

Simply open `index.html` in your browser (double-click or use a local server like VS Code's Live Server).

---

## 🚀 Deployment

### Netlify (Recommended — Free)

1. Push your repo to GitHub (without `config.js` — it's git-ignored)
2. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
3. Select your repo
4. Build settings are already configured in `netlify.toml`
5. After deploy, go to **Site settings → Environment variables** and add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

> **Note:** For a purely static site with no build step, you can also just drag-and-drop the folder onto Netlify's UI (just make sure `config.js` is present locally).

### GitHub Pages

1. Go to your GitHub repo → **Settings → Pages**
2. Source: **Deploy from a branch → main → / (root)**
3. Your site will be at `https://YOUR_USERNAME.github.io/bearded-guys-website`

---

## 🔒 Security Notes

- `admin.html` includes an **auth guard** — any unauthenticated user is immediately redirected to `login.html`
- Images uploaded to Supabase use randomized filenames (`timestamp-randomhex.ext`) to prevent enumeration
- Supabase's Row Level Security (RLS) should be configured to restrict writes to authenticated users only
- `config.js` is git-ignored and must never be committed

### Recommended Supabase Storage Policy (for `gallery` bucket)

In Supabase → Storage → Policies, add:
- **SELECT** (public read): `true` — allows anyone to view gallery images
- **INSERT / UPDATE / DELETE**: `auth.role() = 'authenticated'` — only logged-in owner can modify

---

## 🎨 Customization

### Replace placeholder content
- **Hero background**: Replace `assets/hero-bg.jpg` with a real photo
- **About photo**: In `index.html`, replace the Unsplash URL in the `<img>` tag
- **Contact info**: Update phone, address, Instagram, and hours in `index.html`
- **Services & Prices**: Edit the service cards in `index.html`
- **Logo**: Swap `assets/brand/logo.png` (master) and regenerate the badge/favicon derivatives

### Colors
All design tokens are in `css/styles.css` under `:root`. Change `--clr-gold` to update the accent color sitewide.

---

## 📞 Pages Overview

| URL | Description |
|---|---|
| `/` or `index.html` | Public portfolio — hero, about, services, gallery, contact |
| `/login.html` | Owner login (linked in footer) |
| `/admin.html` | Gallery upload + management (auth-protected) |

---

## 📄 License

MIT — free to use and modify for your barbershop.
