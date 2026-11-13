# PROJECT KHATA: MODULE 1 HANDOVER DOCUMENTATION
## Website 1: Shop Onboarding & Profile Management

### 1. Module Overview & Role
**Website 1 (Shop Onboarding & Profile)** serves as the front-of-house operating system for Kirana and retail shopkeepers. It connects to **Amogh’s Central FastAPI Backend & PostgreSQL Database** and provides configuration data to **Rohan’s AI Voice Assistant**.

---

### 2. Mandatory Business Logic Constraints & Implementation

#### A. Persistent Contact Visibility for Outstanding Balances (Khata Debtors)
* **Rule**: For **ANY** customer registered with an outstanding balance, their contact details (**Name**, **Primary Mobile Number**, and **Alternative Mobile Number**) must be prominently and persistently displayed alongside their name across all relevant views to ensure seamless follow-ups.
* **Implementation**:
  - `PersistentKhataAlertBar.tsx`: Sticky top banner active on every dashboard view displaying debtor count, total overdue balance, and individual debtor cards showing Primary Phone + Alternative Phone with direct click-to-call and 1-click WhatsApp payment reminders.
  - `VoiceBillingTerminal.tsx`: When selecting a customer during billing, existing balance is highlighted alongside their Primary and Alternative phone numbers.
  - `OutstandingCustomersList.tsx`: Full customer ledger view with required Primary and Secondary contact verification for every credit account.

#### B. Closed-Loop Billing & Messaging
* **Spoken Item Parsing**: Translates spoken order strings (e.g., *"2 kg sugar, 1 packet maggi, 500g toor dal, 1 litre milk"* in Kannada, Hindi, or English) into matched items with accurate unit and weight pricing.
* **Dynamic Weight Calculations**: Per-KG items calculate fractional weights (e.g. 500g of ₹44/kg = ₹22).
* **Voice TTS Announcement**: Uses browser `SpeechSynthesis` in the shopkeeper's selected language (`kn-IN`, `hi-IN`, `en-IN`) to announce the grand total to the customer and shopkeeper.
* **Multi-Channel Payments**: Supports Cash, Instant UPI QR Code (with shop's UPI ID and exact total), and Khata Credit.
* **Closed-Loop Messaging**: Dispatches automated WhatsApp invoice receipts to the customer and payment alerts to the shop manager.

#### C. Revenue Reporting
* **Daily Module**: Today's Gross Sales, Cash vs. UPI vs. Udhar breakdown, Khata repayments collected, total transactions, and average order value.
* **Weekly Module**: 7-day revenue velocity bar chart, day-by-day sales table, top selling items by volume and revenue, and 1-click CSV report export.

---

### 3. Handover to Amogh (Shared FastAPI Backend & PostgreSQL)

#### Central Architecture Constraint
* The frontend does **NOT** run any independent backend or database.
* All network requests are routed to `VITE_API_BASE_URL` (default: `http://localhost:8000`).
* If the FastAPI server is launching, a reactive local fallback layer maintains state and auto-retries healthchecks.

#### FastAPI REST Endpoints Contract
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend ping & status check |
| `GET / POST` | `/api/shop/profile` | Shopkeeper profile, UPI ID, and shop category |
| `PUT` | `/api/shop/language` | Preferred language update (`kn`, `hi`, `en`) |
| `GET / POST / PUT / DELETE` | `/api/inventory/products` | Dynamic catalog management |
| `GET / POST` | `/api/customers` | Customer ledger with primary & alt phones |
| `POST` | `/api/customers/{id}/transactions` | Udhar (credit) and Jama (payment) entries |
| `POST` | `/api/voice/parse-order` | Speech-to-item parser backend endpoint |
| `POST` | `/api/billing/invoices` | Persist completed bill and deduct inventory |
| `POST` | `/api/notifications/dispatch` | Closed-loop WhatsApp message dispatch queue |

---

### 4. Handover to Rohan (AI Voice Assistant)

#### Voice Configuration & Dictionary Export
* **File Name**: `khata_voice_config.json`
* **Downloadable In-App**: Via **"Team API & Rohan Voice"** tab or Onboarding Step 4.
* **Export Content**:
  - `preferredLanguage`: Selected language code (`kn`, `hi`, `en`)
  - `speechLocale`: Locale tag (`kn-IN`, `hi-IN`, `en-IN`)
  - `catalogDictionary`: Complete vocabulary containing product names, Kannada/Hindi voice tags, units, and base prices.
  - `supportedUnits` & `weightParameters`: Multipliers for 100g, 250g (paavu), 500g (adha), 1kg, 2kg, 5kg.
  - `ttsSettings`: Regional billing and payment speech utterance templates.

