# Project Khata – Website 1: Shop Onboarding & Profile

An inclusive, voice-first Kirana shop onboarding and operating system built for **Project Khata**.

## 🚀 Key Features

1. **Inclusive 4-Step Shop Onboarding Wizard**:
   - Multi-lingual selection (**Kannada (ಕನ್ನಡ)**, **Hindi (हिंदी)**, and **English**)
   - Merchant identity, shop category, address, and UPI ID setup
   - 1-click starter inventory presets (Staples, Dals, Dairy, Oils, Spices, Packaged Foods)
   - Integration readiness check for Amogh's FastAPI backend and Rohan's AI Voice Assistant.

2. **Persistent Contact Visibility (Mandatory Constraint)**:
   - For **ANY** customer with an outstanding balance, their **Name**, **Primary Mobile Number**, and **Alternative Mobile Number** are prominently and persistently displayed across all views (sticky top follow-up bar, customer ledger, and billing terminal).

3. **Closed-Loop Voice Billing & Invoicing**:
   - Mic input with real-time speech recognition in Kannada, Hindi, and English
   - Item parsing and weight calculation against dynamic inventory
   - Text-to-Speech (TTS) bill announcement
   - Multi-mode checkout: Cash, Instant UPI QR Code, and Khata (Udhar)
   - Automated WhatsApp invoice dispatch to customer and payment receipt alert to manager.

4. **Dynamic Inventory Management**:
   - Add, edit, delete products
   - Per-Unit and Per-KG pricing models with weight calculation presets (250g, 500g, 1kg, 2kg, 5kg)
   - Low-stock alerts and multi-lingual voice keywords.

5. **Revenue Reporting**:
   - Daily and weekly revenue intelligence
   - Payment method breakdown (Cash vs. UPI vs. Udhar)
   - 1-click CSV export.

6. **Team Handover Hub**:
   - Direct connection and status monitoring for **Amogh's FastAPI Backend & PostgreSQL**
   - 1-click export of `khata_voice_config.json` for **Rohan's AI Voice Assistant**.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Voice**: Web Speech Recognition API & SpeechSynthesis TTS
- **Backend Architecture**: Shared FastAPI Client (`http://localhost:8000`) with PostgreSQL DDL schema

---

## 💻 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

---

## 👥 Team Handover

- Read [HANDOVER.md](file:///c:/Users/ullas/Downloads/hackthan%20frontend/HANDOVER.md) for complete FastAPI endpoint schemas and Rohan's voice JSON specification.
