# 🏪 KHATA — Digital Khata for Kirana Shops

> **Voice-First Kirana Accounting & Ledger Platform**  
> Tailored for **Sri Ganesh Kirana Stores** — Groceries · Daily Needs · Household Items.

---

## 🚀 Instant Localhost URLs

- **Frontend Application:** [http://localhost:5173/](http://localhost:5173/)
- **Backend API & Swagger Docs:** [http://localhost:8080/api/docs](http://localhost:8080/api/docs)
- **ReDoc Interactive Reference:** [http://localhost:8080/api/redoc](http://localhost:8080/api/redoc)

---

## ⚡ Quick Start (1-Click or Terminal)

### Option 1: 1-Click Launch (Windows)
Double-click `start-all.bat` in this folder to launch both the Backend and Frontend servers automatically in separate windows.

### Option 2: Run via Terminal

#### Terminal 1 — Backend (FastAPI + SQLite/PostgreSQL):
```powershell
# Set environment variables and run backend server
$env:PORT="8080"
$env:DATABASE_URL="sqlite:///./khata.db"
$env:JWT_SECRET="CG4m3ThBbjbP3u6p60Iubp4waiRCEflbThLSjTY9QoQ4jZu0esfTBIo17_0wDheu"
python -m backend.run
```

#### Terminal 2 — Frontend (Vite + React + Tailwind):
```powershell
Set-Location "artifacts\khata-dashboard"
$env:PORT="5173"
$env:BASE_PATH="/"
npm run dev
```

---

## 🔑 Pre-Seeded Demo Credentials

| Role | Email | Password | Shop Name |
| :--- | :--- | :--- | :--- |
| **Kirana Shop Owner** | `amogh@kirana.com` | `password123` | **Sri Ganesh Kirana Stores** |

> 💡 **Quick Login:** On the login page, you can either click the **"⚡ Quick Demo Access"** button on the first welcome splash screen or click **"🏪 Demo: Sri Ganesh Kirana (Amogh)"** to log in instantly with 1-click!

---

## 🎨 Implemented Features & Requirements

### 1. 🖼️ Authentic Kirana Shop UI/UX (Exact Image Match)
- **Scalloped Red-and-Cream Awning** (*Kirana Chhappar*) across the top.
- **Sri Ganesh Kirana Stores** sign with auspicious **Lord Ganesha Emblem**.
- **Wooden Plank Sidebar** with glowing basket logo, active tab indicator, voice assistant teaser badge, and gunny sacks.
- **Counter Décor:** Hanging snack packets (Chips, Namkeen, Kurkure), glass spice/candy jars, and a realistic **UPI QR Standee**.
- **Customer Detail View for Ramesh Kumar:**
  - Total Purchases: **₹12,430.00**
  - Total Payments: **₹8,000.00**
  - Outstanding (Udhar): **₹4,430.00**
  - 4 Itemized purchase bills with product icons (Rice, Sugar, Tea, Milk, Bread, Eggs, Wheat Flour, Oil, Dal, Soap, Detergent).

### 2. 🌟 First Interface & Glowing Vector Logo
- Upon visiting `/login`, users are greeted with the **First Interface / Hero Screen**:
  - High-resolution glowing golden **KHATA Kirana Basket Logo** (`khata-logo.svg`).
  - Kirana shop backdrop with warm amber lighting (`kirana-bg.jpg`).
  - Key feature cards (Gnani Voice AI, Zero-Loss Khata, UPI & WhatsApp reminders).
  - Two direct action buttons: **"🏪 Enter Shop / Sign In"** and **"⚡ Quick Demo Access"**.
  - Smooth toggle between the Hero entry and the login card.

### 3. 🌐 Complete Multilingual Support (English, Kannada, Hindi)
- Built-in live language switcher in the top bar header.
- Instantly translates the **entire** application:
  - Navigation links (Dashboard, Customers, Transactions, Purchases, Products, Reports, Settings, Onboarding).
  - Breadcrumbs, action buttons, stat cards, tab headers, and table columns.
  - Dialog modals, forms, and date/time formatting.

### 4. 🎙️ Gnani AI Voice Assistant (Instant Direct Save & Same-Language Reply)
- **Direct Save Without Confusion:** When a shopkeeper speaks *"save ramesh's 2000 rupees"* (or *"save 2000 for ramesh"*, *"ramesh 2000 rupayi bari"*, *"ramesh ke naam 2000 likho"*), the system immediately saves the transaction to the ledger without confusion and updates Ramesh Kumar's balance.
- **Exact Same-Language Audio & Text Response:** Auto-detects the spoken language from the speech and replies in the exact same language (English, Kannada, or Hindi) both in text and spoken audio synthesis:
  - **English:** *"Successfully added ₹2,000 credit for Ramesh Kumar. Total balance is ₹6,430."*
  - **Kannada:** *"ರಮೇಶ್ ಕುಮಾರ್ ಅವರ ಖಾತೆಗೆ 2000 ರೂಪಾಯಿ ಉದ್ಧಾರ ಜಮೆ ಮಾಡಲಾಗಿದೆ. ಈಗ ಅವರ ಒಟ್ಟು ಬಾಕಿ 6430 ರೂಪಾಯಿ."*
  - **Hindi:** *"रमेश कुमार के खाते में 2000 रुपये उधार जोड़ दिया गया है। कुल बकाया 6430 रुपये है।"*
- Quick sample prompt chips in Kannada, Hindi, and English.

### 5. 📱 Android App & Web Facility
- **PWA & Native Fullscreen App:** Added `manifest.json` and service worker `sw.js` for full Android PWA standalone app installation with offline support.
- **1-Click Android Install:** Direct prompt to install on Android home screen.
- **QR Code & Phone Access:** Live QR code to scan from any Android smartphone camera and open immediately.
- **Android Device Simulator:** Interactive toggle on the dashboard to test the app inside an authentic Android smartphone frame (with 5G status bar, punch hole, and navigation pill) right on desktop!
- **Desktop Web Counter Mode:** Fullscreen Kiosk mode and speed keyboard shortcuts (`Alt+V` voice, `Alt+C` customers, `Ctrl+P` report).

### 6. 🛡️ Unbroken Backend & Accounting Integrity
- Complete double-entry ledger logic preserved.
- SQLite fallback with cross-platform date/time and JSON handling.
- Reversible entries with audit trail.
- All **65 backend tests pass** with 100% success rate.
- Clean compilation: `npm run build` passes with **0 errors**.

---

## 📁 Project Structure

```
final work for hackthon/
├── artifacts/
│   ├── khata-dashboard/        # Vite + React Frontend Application
│   │   ├── public/
│   │   │   ├── khata-logo.svg  # Custom glowing Kirana logo
│   │   │   ├── kirana-bg.jpg   # Authentic Kirana store background
│   │   │   └── favicon.svg     # Browser tab favicon
│   │   └── src/
│   │       ├── components/     # Kirana theme, voice assistant, widgets
│   │       ├── pages/          # Auth, customer detail, purchases, reports
│   │       └── lib/            # i18n dictionaries (en, kn, hi)
│   ├── mock-gnani-ai/          # Voice processing engine mock
│   └── mock-whatsapp-cloud-api/# WhatsApp notification mock
├── backend/                    # FastAPI Backend API Server
│   ├── app/
│   │   ├── core/               # Security, config, auth
│   │   ├── database/           # Models, seed data (Ramesh Kumar)
│   │   ├── routers/            # Customer, purchases, ledger, voice APIs
│   │   └── services/           # Double-entry ledger logic
│   └── run.py                  # API server bootstrap
├── khata.db                    # Pre-seeded SQLite database
├── start-all.bat               # 1-Click launcher for both servers
├── start-backend.bat           # Backend launcher script
├── start-frontend.bat          # Frontend launcher script
└── README.md                   # This documentation
```
