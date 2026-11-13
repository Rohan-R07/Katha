import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { formatINR, absINR, paise, decimal } from "@/lib/khata";

export type Language = "en" | "kn" | "hi";

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  voiceCode: "en-IN" | "kn-IN" | "hi-IN";
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", voiceCode: "en-IN" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", voiceCode: "kn-IN" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", voiceCode: "hi-IN" },
];

const STORAGE_KEY = "khata_app_language";

// Comprehensive translations dictionary covering every screen and component
export const translations = {
  en: {
    // Brand & App
    appName: "KHATA",
    tagline: "Voice-First Kirana Accounting & Ledger",
    welcome: "Welcome",
    today: "Today",
    loading: "Loading...",
    saving: "Saving...",
    cancel: "Cancel",
    save: "Save",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    done: "Done",
    close: "Close",
    search: "Search",
    actions: "Actions",
    status: "Status",
    date: "Date",
    amount: "Amount",
    notes: "Notes",
    description: "Description",
    required: "Required",
    optional: "Optional",
    viewAll: "View all",
    details: "Details",
    all: "All",
    filter: "Filter",
    retry: "Retry",
    or: "or",
    refresh: "Refresh",
    success: "Success",
    error: "Error",

    // Navigation & Shell
    navOverview: "Overview",
    navCustomers: "Customers",
    navTransactions: "Transactions",
    navDailyReport: "Daily report",
    navProducts: "Products",
    navSettings: "Settings",
    navOnboarding: "Shop onboarding",
    signOut: "Sign out",
    signingOut: "Signing out...",
    openMenu: "Open menu",

    // Action Buttons
    btnVoiceAssistant: "Gnani Voice",
    btnUploadHandwritten: "Upload Handwritten Khata",
    btnAddCustomer: "Customer",
    btnRecordPayment: "Payment",
    btnGiveCredit: "Udhar",
    btnAddProduct: "Add Product",
    btnExportPDF: "Download PDF",
    btnExportCSV: "Export CSV",
    btnShareWhatsApp: "Send reminder via WhatsApp",

    // Financial Types & Headers
    udhar: "Udhar",
    credit: "Udhar (Credit)",
    payment: "Payment (Jama)",
    jama: "Jama",
    advance: "Advance",
    balance: "Balance",
    toCollect: "To collect",
    toPay: "To pay",
    settled: "Settled",
    openingBalance: "Opening balance",
    dueToday: "Due today",
    todayCredit: "Udhar today",
    todayPayments: "Collected today",
    totalOutstanding: "Total outstanding",
    totalCredit: "Lifetime Udhar",
    totalPayments: "Lifetime collected",
    totalAdvance: "Advance held",
    customersOnBooks: "customers on the books",
    entriesToday: "entries today",

    // Overview Page
    overviewTitle: "Overview",
    recentEntries: "Recent entries",
    allEntries: "All entries",
    highestDues: "Highest dues",
    recentDays: "Recent days",
    udharVsCollected: "Udhar vs collected",
    noEntriesYet: "No entries yet. Record the first Udhar or payment.",
    nobodyOwesYou: "Nobody owes you right now.",
    emptyKhataTitle: "Your khata is a blank page",
    emptyKhataBody: "Add your first customer. If they already owe you, enter it as opening Udhar and start from today.",
    addFirstCustomer: "Add first customer",

    // Customer Page & Profiles
    customersTitle: "Customers",
    searchCustomersPlaceholder: "Search by customer name or phone...",
    allCustomers: "All customers",
    owingOnly: "Owing only",
    settledOnly: "Settled only",
    customerName: "Customer name",
    mobileNumber: "Mobile number",
    address: "Address",
    viewProfile: "View profile",
    noCustomersFound: "No customers match your search.",
    noCustomersYet: "No customers recorded yet. Add one to begin tracking Udhar.",
    customerBalance: "Current balance",
    customerTransactions: "Transaction history",
    customerProfile: "Customer Profile",
    quickUdhar: "Give Udhar",
    quickPayment: "Record Payment",
    callCustomer: "Call customer",
    sendReminder: "Send WhatsApp Reminder",
    editCustomer: "Edit customer details",
    deleteCustomer: "Delete customer",
    confirmDeleteCustomer: "Are you sure you want to delete this customer? This cannot be undone.",
    lastTransaction: "Last transaction",

    // Transactions Page
    transactionsTitle: "Transactions",
    filterByType: "Filter by type",
    allTypes: "All types",
    creditsOnly: "Udhar only",
    paymentsOnly: "Payments only",
    customerCol: "Customer",
    typeCol: "Type",
    amountCol: "Amount",
    dateCol: "Date & Time",
    sourceCol: "Source",
    receipt: "Receipt",
    reversal: "Reverse transaction",
    reversed: "Reversed",
    noTransactionsFound: "No transactions found matching your criteria.",

    // Daily Report Page
    reportTitle: "Daily Report",
    dailySummary: "Day Book Summary",
    selectDate: "Select date",
    totalDayCredit: "Total Udhar Given",
    totalDayPayment: "Total Cash Collected",
    netCashFlow: "Net Cash Balance",
    customerBreakdown: "Customer Transactions Breakdown",
    noActivityDate: "No transactions recorded for this business date.",

    // Products & Inventory Page
    productsTitle: "Products & Pricing",
    productName: "Product name",
    category: "Category",
    unit: "Unit",
    price: "Price",
    stock: "Stock",
    searchProductsPlaceholder: "Search products by name or category...",
    noProductsFound: "No products in inventory yet.",

    // Settings Page
    settingsTitle: "Shop Settings",
    shopDetails: "Shop Profile",
    shopName: "Shop name",
    shopType: "Shop type / Category",
    contactNumber: "Shop phone number",
    preferredLanguage: "Default Language",
    city: "City",
    state: "State",
    saveSettings: "Save shop profile",
    systemStatus: "System & Integration Status",
    allSystemsOperational: "All core systems operational",
    voiceEngine: "Gnani Voice Engine",
    connected: "Connected",
    saveSuccessToast: "Shop settings updated successfully.",

    // Dialogs & Forms
    addCustomerDialogTitle: "Add New Customer",
    editCustomerDialogTitle: "Edit Customer",
    customerNamePlaceholder: "e.g. Ramesh Kumar",
    mobilePlaceholder: "e.g. 9876543210",
    openingBalanceLabel: "Opening Udhar Balance (₹)",
    openingBalanceHelp: "If they already owe you money from previous notebooks, enter it here.",
    recordTransactionTitle: "Record Transaction",
    recordUdharTitle: "Record New Udhar (Credit)",
    recordPaymentTitle: "Record Customer Payment (Jama)",
    selectCustomerLabel: "Select Customer",
    amountLabel: "Amount (₹)",
    amountPlaceholder: "0.00",
    descriptionPlaceholder: "e.g. 2 bags rice, oil packet",
    confirmAndSave: "Confirm & Record Entry",

    // AI Handwritten Khata Import
    handwrittenDialogTitle: "AI Handwritten Khata Import",
    handwrittenDialogDesc: "Upload photos of your handwritten ledger, diary, or paper slips to automatically extract & record entries.",
    dropzoneText: "Drop your Khata photo or PDF here, or click to browse",
    dropzoneSubtext: "Supports handwritten ledger photos (JPG, PNG) or scanned PDFs",
    extractWithAI: "Extract with AI",
    extractingProgress: "Reading Handwritten Khata...",
    extractingSubtext: "Our vision OCR is scanning customer names, amounts, and transaction types.",
    reviewExtractedTitle: "Review Extracted Transactions",
    reviewExtractedDesc: "Check details carefully. You can edit names, amounts, types, or match to existing customers.",
    addRow: "Add Row",
    verifyBadge: "Verify",
    linkToCustomer: "Link to:",
    createNewCustomerOpt: "+ Create as New Customer",
    confirmBatchSave: "Confirm & Save to Khata",
    savingBatchProgress: "Saving to Khata...",
    saveBatchSuccessTitle: "Khata Entries Saved Successfully!",
    backUploadAnother: "Back / Upload Another",

    // Voice Assistant
    voiceAssistantTitle: "Gnani AI Voice Assistant",
    voiceSubtitle: "Speak naturally in Kannada, Hindi, or English to record Udhar, payments, check balances, or get daily sales.",
    tapMicToSpeak: "TAP MIC TO SPEAK",
    listening: "LISTENING...",
    typeOrEditCommand: "Type or edit command...",
    send: "Send",
    livePipeline: "LIVE PIPELINE",
    pipeListening: "Listening to voice",
    pipeTranscribing: "Transcribing speech",
    pipeUnderstanding: "Understanding command & details",
    pipeVerifyingCustomer: "Verifying / resolving customer",
    pipeUpdatingLedger: "Recording & updating ledger",
    pipeCompleted: "Completed",
    quickSamplePrompts: "QUICK SAMPLE PROMPTS",
    samplePromptCredit: '"Add 100 credit for Rohan"',
    samplePromptPayment: '"Record 200 payment from Rohan"',
    samplePromptBalance: '"What is Ramesh\'s balance?"',
    samplePromptReport: '"Show today\'s sales report"',
    voiceWelcomeEn: "Hello! I am your Gnani AI Voice Assistant. I can help you record Udhar credit, add payments, check balances, and view your daily report. Tap the mic to speak.",
    voiceWelcomeKn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಜ್ಞಾನಿ AI ಧ್ವನಿ ಸಹಾಯಕ. ಉಧಾರ್ ಸಾಲ ಬರೆಯಲು, ಪಾವತಿ ಜಮಾ ಮಾಡಲು, ಬಾಕಿ ವಿಚಾರಿಸಲು ಮತ್ತು ದೈನಂದಿನ ವರದಿ ನೋಡಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ.",
    voiceWelcomeHi: "नमस्ते! मैं आपका ज्ञानी AI वॉयस असिस्टेंट हूँ। मैं उधार दर्ज करने, जमा राशि जोड़ने, बकाया देखने और दैनिक रिपोर्ट में आपकी सहायता कर सकता हूँ। बोलने के लिए माइक दबाएँ।",

    // Language Selector UI
    languageSelectorTitle: "Language",
    languageChangedToast: "Language changed successfully",

    // Auth & Login & Splash
    loginTitle: "Sign In to Khata",
    loginSubtitle: "Sign in to open your Kirana shop ledger.",
    emailLabel: "Email Address",
    passwordLabel: "Password",
    signInBtn: "Sign In",
    oneClickDemoBtn: "🏪 Demo: Sri Ganesh Kirana (Amogh)",
    instantDemoHeroBtn: "⚡ Quick Demo Access (Sri Ganesh Kirana)",
    enterShopBtn: "🏪 Enter Shop / Sign In",
    orOneClickDemo: "Or Instant Demo Login",
    newShopPrompt: "New Kirana shop?",
    createAccountLink: "Create an account",
    registerTitle: "Create Your Account",
    registerSubtitle: "Step 1 of 2. Then you'll name your shop.",
    fullNameLabel: "Your Name",
    mobileLabel: "Mobile Number",
    continueBtn: "Continue",
    alreadyRegisteredPrompt: "Already registered?",
    setupShopTitle: "Name Your Shop",
    setupShopSubtitle: "Step 2 of 2. Hi, this appears on your ledger.",
    shopNameField: "Shop Name",
    cityField: "City",
    stateField: "State",
    shopContactField: "Shop Contact",
    openMyKhataBtn: "Open My Khata",
    signOutInstead: "Sign out instead",
    heroHeading: "Every rupee of Udhar, accounted for.",
    heroSubheading: "The traditional bahi-khata on your counter, modernized with AI voice accounting in Kannada, Hindi, and English.",
    featureVoiceTitle: "Gnani Voice-First AI",
    featureVoiceDesc: "Speak naturally in Kannada, Hindi, or English to record Udhar and payments.",
    featureLedgerTitle: "Zero-Loss Khata",
    featureLedgerDesc: "Immutable double-entry ledger with instant customer balance tracking.",
    featureRemindersTitle: "UPI & WhatsApp",
    featureRemindersDesc: "Send instant payment links and WhatsApp reminders in one click.",
    backToWelcome: "← Back to Store Entry",

    // Navigation extra
    navPurchases: "Purchases (Bills)",

    // Customer Detail & Purchase History specific
    addPurchaseCredit: "Add Purchase (Credit)",
    recordPaymentAction: "Record Payment",
    regularCustomerBadge: "Regular Customer",
    totalPurchasesLabel: "Total Purchases",
    totalPaymentsLabel: "Total Payments",
    outstandingUdharLabel: "Outstanding (Udhar)",
    tabKhataSummary: "Khata Summary",
    tabPurchaseHistory: "Purchase History",
    tabPaymentHistory: "Payment History",
    tabAllTransactions: "All Transactions",
    purchaseHistoryHeading: "Purchase History",
    purchaseHistorySubtitle: "All items purchased with date, time and details",
    colDateTime: "Date & Time",
    colProductsPurchased: "Products Purchased",
    colQuantity: "Quantity",
    colAmount: "Amount",
    colType: "Type",
    typeCreditUdhar: "Credit (Udhar)",
    filterAllTime: "All Time",
    filterToday: "Today",
    filterThisWeek: "This Week",
    filterThisMonth: "This Month",
    filterCustomRange: "Custom Range",
    applyFilter: "Apply",
    resetFilter: "Reset",
    itemsCount: "items",
    itemSingle: "item",
  },

  kn: {
    // Brand & App
    appName: "ಖಾತಾ",
    tagline: "ಧ್ವನಿ-ಆಧಾರಿತ ಕಿರಾಣಿ ಲೆಡ್ಜರ್ & ಆಯ-ವ್ಯಯ",
    welcome: "ಸ್ವಾಗತ",
    today: "ಇಂದು",
    loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    saving: "ಉಳಿಸಲಾಗುತ್ತಿದೆ...",
    cancel: "ರದ್ದುಮಾಡಿ",
    save: "ಉಳಿಸಿ",
    confirm: "ದೃಢೀಕರಿಸಿ",
    delete: "ಅಳಿಸಿ",
    edit: "ತಿದ್ದಿ",
    back: "ಹಿಂದಕ್ಕೆ",
    done: "ಮುಕ್ತಾಯ",
    close: "ಮುಚ್ಚಿ",
    search: "ಹುಡುಕಿ",
    actions: "ಕ್ರಿಯೆಗಳು",
    status: "ಸ್ಥಿತಿ",
    date: "ದಿನಾಂಕ",
    amount: "ಮೊತ್ತ",
    notes: "ಟಿಪ್ಪಣಿ",
    description: "ವಿವರ",
    required: "ಕಡ್ಡಾಯ",
    optional: "ಐಚ್ಛಿಕ",
    viewAll: "ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ",
    details: "ವಿವರಗಳು",
    all: "ಎಲ್ಲಾ",
    filter: "ಫಿಲ್ಟರ್",
    retry: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    or: "ಅಥವಾ",
    refresh: "ತಾಜಾಗೊಳಿಸಿ",
    success: "ಯಶಸ್ವಿ",
    error: "ದೋಷ",

    // Navigation & Shell
    navOverview: "ಮುಖಪುಟ (ಅವಲೋಕನ)",
    navCustomers: "ಗ್ರಾಹಕರು",
    navTransactions: "ವಹಿವಾಟುಗಳು",
    navDailyReport: "ದೈನಂದಿನ ವರದಿ",
    navProducts: "ಸರಕುಗಳು (ದಾಸ್ತಾನು)",
    navSettings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
    navOnboarding: "ಅಂಗಡಿ ವಿವರ",
    signOut: "ಖಾತೆ ನಿರ್ಗಮನ (ಲಾಗ್‌ಔಟ್)",
    signingOut: "ಲಾಗ್‌ಔಟ್ ಆಗುತ್ತಿದೆ...",
    openMenu: "ಮೆನು ತೆರೆಯಿರಿ",

    // Action Buttons
    btnVoiceAssistant: "ಜ್ಞಾನಿ ಧ್ವನಿ ಸಹಾಯಕ",
    btnUploadHandwritten: "ಕೈಬರಹದ ಖಾತಾ ಅಪ್‌ಲೋಡ್",
    btnAddCustomer: "+ ಗ್ರಾಹಕ",
    btnRecordPayment: "ಜಮಾ (ಪಾವತಿ)",
    btnGiveCredit: "ಉಧಾರ್ (ಸಾಲ)",
    btnAddProduct: "ಸರಕು ಸೇರಿಸಿ",
    btnExportPDF: "PDF ಡೌನ್‌ಲೋಡ್",
    btnExportCSV: "CSV ಡೌನ್‌ಲೋಡ್",
    btnShareWhatsApp: "WhatsApp ನೆನಪೋಲೆ ಕಳುಹಿಸಿ",

    // Financial Types & Headers
    udhar: "ಉಧಾರ್ (ಸಾಲ)",
    credit: "ಉಧಾರ್ (ಸಾಲ)",
    payment: "ಜಮಾ (ಪಾವತಿ)",
    jama: "ಜಮಾ",
    advance: "ಮುಂಗಡ (ಅಡ್ವಾನ್ಸ್)",
    balance: "ಉಳಿಕೆ ಬಾಕಿ",
    toCollect: "ವಸೂಲಿ ಮಾಡಬೇಕಾದ ಒಟ್ಟು ಬಾಕಿ",
    toPay: "ನೀಡಬೇಕಾದದ್ದು",
    settled: "ಚುಕ್ತಾ ಆಗಿದೆ",
    openingBalance: "ಆರಂಭಿಕ ಸಾಲ",
    dueToday: "ಇಂದಿನ ಬಾಕಿ",
    todayCredit: "ಇಂದಿನ ಉಧಾರ್",
    todayPayments: "ಇಂದು ಸಂಗ್ರಹವಾದ ಜಮಾ",
    totalOutstanding: "ಒಟ್ಟು ಬಾಕಿ ವಸೂಲಾತಿ",
    totalCredit: "ಒಟ್ಟು ಉಧಾರ್",
    totalPayments: "ಒಟ್ಟು ಸಂಗ್ರಹ",
    totalAdvance: "ಮುಂಗಡ ಹಣ",
    customersOnBooks: "ದಾಖಲಾದ ಗ್ರಾಹಕರು",
    entriesToday: "ಇಂದಿನ ನಮೂದುಗಳು",

    // Overview Page
    overviewTitle: "ಅಂಗಡಿ ಅವಲೋಕನ",
    recentEntries: "ಇತ್ತೀಚಿನ ನಮೂದುಗಳು",
    allEntries: "ಎಲ್ಲಾ ವಹಿವಾಟುಗಳು",
    highestDues: "ಹೆಚ್ಚು ಬಾಕಿ ಇರುವವರು",
    recentDays: "ಇತ್ತೀಚಿನ ದಿನಗಳು",
    udharVsCollected: "ಉಧಾರ್ ಮತ್ತು ಸಂಗ್ರಹ",
    noEntriesYet: "ಇನ್ನೂ ಯಾವುದೇ ನಮೂದುಗಳಿಲ್ಲ. ಮೊದಲ ಉಧಾರ್ ಅಥವಾ ಜಮಾ ದಾಖಲಿಸಿ.",
    nobodyOwesYou: "ಸದ್ಯಕ್ಕೆ ಯಾರೂ ಹಣ ನೀಡಬೇಕಾಗಿಲ್ಲ.",
    emptyKhataTitle: "ನಿಮ್ಮ ಖಾತಾ ಪುಸ್ತಕ ಖಾಲಿಯಾಗಿದೆ",
    emptyKhataBody: "ಮೊದಲ ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಿ. ಹಳೆಯ ಬಾಕಿ ಇದ್ದರೆ ಆರಂಭಿಕ ಉಧಾರ್ ಆಗಿ ದಾಖಲಿಸಿ ಇಂದಿನಿಂದ ಪ್ರಾರಂಭಿಸಿ.",
    addFirstCustomer: "ಮೊದಲ ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಿ",

    // Customer Page & Profiles
    customersTitle: "ಗ್ರಾಹಕರ ಪಟ್ಟಿ",
    searchCustomersPlaceholder: "ಗ್ರಾಹಕರ ಹೆಸರು ಅಥವಾ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಹುಡುಕಿ...",
    allCustomers: "ಎಲ್ಲಾ ಗ್ರಾಹಕರು",
    owingOnly: "ಬಾಕಿ ಉಳಿಸಿಕೊಂಡವರು ಮಾತ್ರ",
    settledOnly: "ಚುಕ್ತಾ ಆದವರು ಮಾತ್ರ",
    customerName: "ಗ್ರಾಹಕರ ಹೆಸರು",
    mobileNumber: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
    address: "ವಿಳಾಸ",
    viewProfile: "ಖಾತೆ ವೀಕ್ಷಿಸಿ",
    noCustomersFound: "ಹುಡುಕಾಟಕ್ಕೆ ತಕ್ಕ ಗ್ರಾಹಕರು ಕಂಡುಬಂದಿಲ್ಲ.",
    noCustomersYet: "ಇನ್ನೂ ಯಾವುದೇ ಗ್ರಾಹಕರ ದಾಖಲೆಗಳಿಲ್ಲ. ಉಧಾರ್ ದಾಖಲಿಸಲು ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಿ.",
    customerBalance: "ಪ್ರಸ್ತುತ ಬಾಕಿ",
    customerTransactions: "ವಹಿವಾಟು ಚರಿತ್ರೆ",
    customerProfile: "ಗ್ರಾಹಕರ ಖಾತಾ ವಿವರ",
    quickUdhar: "ಉಧಾರ್ ನೀಡಿ",
    quickPayment: "ಜಮಾ ಪಡೆಯಿರಿ",
    callCustomer: "ಕರೆ ಮಾಡಿ",
    sendReminder: "WhatsApp ನಲ್ಲಿ ಬಾಕಿ ನೆನಪಿಸಿ",
    editCustomer: "ಗ್ರಾಹಕರ ವಿವರ ತಿದ್ದಿ",
    deleteCustomer: "ಗ್ರಾಹಕರನ್ನು ಅಳಿಸಿ",
    confirmDeleteCustomer: "ಈ ಗ್ರಾಹಕರನ್ನು ಅಳಿಸಲು ನೀವು ಖಚಿತವಾಗಿದ್ದೀರಾ? ಇದನ್ನು ರದ್ದುಮಾಡಲಾಗುವುದಿಲ್ಲ.",
    lastTransaction: "ಕಡೆಯ ವಹಿವಾಟು",

    // Transactions Page
    transactionsTitle: "ಖಾತಾ ವಹಿವಾಟುಗಳು",
    filterByType: "ಪ್ರಕಾರದ ಮೂಲಕ ಫಿಲ್ಟರ್ ಮಾಡಿ",
    allTypes: "ಎಲ್ಲಾ ಪ್ರಕಾರಗಳು",
    creditsOnly: "ಉಧಾರ್ ಮಾತ್ರ",
    paymentsOnly: "ಜಮಾ ಮಾತ್ರ",
    customerCol: "ಗ್ರಾಹಕರು",
    typeCol: "ಪ್ರಕಾರ",
    amountCol: "ಮೊತ್ತ",
    dateCol: "ದಿನಾಂಕ & ಸಮಯ",
    sourceCol: "ಮೂಲ",
    receipt: "ರಶೀದಿ",
    reversal: "ವಹಿವಾಟು ರದ್ದುಗೊಳಿಸಿ",
    reversed: "ರದ್ದಾಗಿದೆ",
    noTransactionsFound: "ಯಾವುದೇ ವಹಿವಾಟು ಕಂಡುಬಂದಿಲ್ಲ.",

    // Daily Report Page
    reportTitle: "ದೈನಂದಿನ ಲೆಕ್ಕ ಪತ್ರ (ವರದಿ)",
    dailySummary: "ದೈನಂದಿನ ಆಯ-ವ್ಯಯ ಸಾರಾಂಶ",
    selectDate: "ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ",
    totalDayCredit: "ಇಂದು ನೀಡಿದ ಒಟ್ಟು ಉಧಾರ್",
    totalDayPayment: "ಇಂದು ಸಂಗ್ರಹವಾದ ಒಟ್ಟು ಜಮಾ",
    netCashFlow: "ನಿವ್ವಳ ನಗದು ಉಳಿಕೆ",
    customerBreakdown: "ಗ್ರಾಹಕರವಾರು ವಹಿವಾಟು ವಿವರ",
    noActivityDate: "ಈ ದಿನಾಂಕಕ್ಕೆ ಯಾವುದೇ ವಹಿವಾಟು ದಾಖಲಾಗಿಲ್ಲ.",

    // Products & Inventory Page
    productsTitle: "ಸರಕುಗಳು & ದರಪಟ್ಟಿ",
    productName: "ವಸ್ತುವಿನ ಹೆಸರು",
    category: "ವರ್ಗ",
    unit: "ಮಾನದಂಡ (ಯೂನಿಟ್)",
    price: "ಬೆಲೆ",
    stock: "ದಾಸ್ತಾನು",
    searchProductsPlaceholder: "ಸರಕಿನ ಹೆಸರು ಅಥವಾ ವರ್ಗ ಹುಡುಕಿ...",
    noProductsFound: "ದಾಸ್ತಾನಿನಲ್ಲಿ ಸರಕುಗಳಿಲ್ಲ.",

    // Settings Page
    settingsTitle: "ಅಂಗಡಿಯ ಸೆಟ್ಟಿಂಗ್ಸ್",
    shopDetails: "ಅಂಗಡಿ ಪ್ರೊಫೈಲ್",
    shopName: "ಅಂಗಡಿಯ ಹೆಸರು",
    shopType: "ಅಂಗಡಿಯ ಪ್ರಕಾರ / ವರ್ಗ",
    contactNumber: "ಅಂಗಡಿ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
    preferredLanguage: "ಆದ್ಯತೆಯ ಭಾಷೆ",
    city: "ಊರು",
    state: "ರಾಜ್ಯ",
    saveSettings: "ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ",
    systemStatus: "ಸಿಸ್ಟಮ್ & ಸಂಪರ್ಕ ಸ್ಥಿತಿ",
    allSystemsOperational: "ಎಲ್ಲಾ ವ್ಯವಸ್ಥೆಗಳು ಸರಿಯಾಗಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ",
    voiceEngine: "ಜ್ಞಾನಿ AI ಧ್ವನಿ ಎಂಜಿನ್",
    connected: "ಸಂಪರ್ಕಿತವಾಗಿದೆ",
    saveSuccessToast: "ಅಂಗಡಿಯ ವಿವರಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ.",

    // Dialogs & Forms
    addCustomerDialogTitle: "ಹೊಸ ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಿ",
    editCustomerDialogTitle: "ಗ್ರಾಹಕರ ವಿವರ ತಿದ್ದಿ",
    customerNamePlaceholder: "ಉದಾ: ರಮೇಶ್ ಕುಮಾರ್",
    mobilePlaceholder: "ಉದಾ: 9876543210",
    openingBalanceLabel: "ಆರಂಭಿಕ ಉಧಾರ್ ಬಾಕಿ (₹)",
    openingBalanceHelp: "ಹಳೆಯ ಪುಸ್ತಕದ ಬಾಕಿ ಇದ್ದರೆ ಇಲ್ಲಿ ದಾಖಲಿಸಿ.",
    recordTransactionTitle: "ವಹಿವಾಟು ನಮೂದಿಸಿ",
    recordUdharTitle: "ಹೊಸ ಉಧಾರ್ ನಮೂದು (ಸಾಲ)",
    recordPaymentTitle: "ಗ್ರಾಹಕರ ಜಮಾ ನಮೂದು (ಪಾವತಿ)",
    selectCustomerLabel: "ಗ್ರಾಹಕರನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    amountLabel: "ಮೊತ್ತ (₹)",
    amountPlaceholder: "0.00",
    descriptionPlaceholder: "ಉದಾ: 2 ಚೀಲ ಅಕ್ಕಿ, ಎಣ್ಣೆ ಪ್ಯಾಕೆಟ್",
    confirmAndSave: "ದೃಢೀಕರಿಸಿ & ಖಾತಾಗೆ ಸೇರಿಸಿ",

    // AI Handwritten Khata Import
    handwrittenDialogTitle: "AI ಕೈಬರಹದ ಖಾತಾ ಆಮದು",
    handwrittenDialogDesc: "ನಿಮ್ಮ ಕೈಬರಹದ ಲೆಡ್ಜರ್, ಡೈರಿ ಅಥವಾ ಚೀಟಿಗಳ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನಮೂದುಗಳನ್ನು ದಾಖಲಿಸಿ.",
    dropzoneText: "ಖಾತಾ ಫೋಟೋ ಅಥವಾ PDF ಇಲ್ಲಿಗೆ ಎಳೆಯಿರಿ, ಅಥವಾ ಕ್ಲಿಕ್ ಮಾಡಿ",
    dropzoneSubtext: "ಕೈಬರಹದ ಲೆಡ್ಜರ್ ಫೋಟೋ (JPG, PNG) ಅಥವಾ ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ PDF ಬೆಂಬಲಿತವಾಗಿದೆ",
    extractWithAI: "AI ಮೂಲಕ ಪತ್ತೆಹಚ್ಚಿ",
    extractingProgress: "ಕೈಬರಹದ ಖಾತಾ ಓದಲಾಗುತ್ತಿದೆ...",
    extractingSubtext: "ನಮ್ಮ AI ದೃಷ್ಟಿ ಮಾದರಿಯು ಗ್ರಾಹಕರ ಹೆಸರು, ಮೊತ್ತ ಮತ್ತು ಉಧಾರ್/ಜಮಾ ನಮೂದುಗಳನ್ನು ಗುರುತಿಸುತ್ತಿದೆ.",
    reviewExtractedTitle: "ಪತ್ತೆಯಾದ ವಹಿವಾಟುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
    reviewExtractedDesc: "ವಿವರಗಳನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಪರಿಶೀಲಿಸಿ. ಹೆಸರು, ಮೊತ್ತ ಮತ್ತು ಪ್ರಕಾರವನ್ನು ಬದಲಾಯಿಸಬಹುದು.",
    addRow: "ಸಾಲು ಸೇರಿಸಿ",
    verifyBadge: "ಪರಿಶೀಲಿಸಿ",
    linkToCustomer: "ಗ್ರಾಹಕರಿಗೆ ಹೊಂದಿಸಿ:",
    createNewCustomerOpt: "+ ಹೊಸ ಗ್ರಾಹಕರಾಗಿ ದಾಖಲಿಸಿ",
    confirmBatchSave: "ದೃಢೀಕರಿಸಿ & ಖಾತಾಗೆ ಉಳಿಸಿ",
    savingBatchProgress: "ಖಾತಾಗೆ ಸೇರಿಸಲಾಗುತ್ತಿದೆ...",
    saveBatchSuccessTitle: "ಖಾತಾ ನಮೂದುಗಳು ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲ್ಪಟ್ಟಿವೆ!",
    backUploadAnother: "ಹಿಂದಕ್ಕೆ / ಇನ್ನೊಂದು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",

    // Voice Assistant
    voiceAssistantTitle: "ಜ್ಞಾನಿ AI ಧ್ವನಿ ಸಹಾಯಕ",
    voiceSubtitle: "ಉಧಾರ್, ಜಮಾ ದಾಖಲಿಸಲು, ಬಾಕಿ ವಿಚಾರಿಸಲು ಅಥವಾ ಮಾರಾಟ ತಿಳಿಯಲು ಕನ್ನಡ, ಹಿಂದಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ.",
    tapMicToSpeak: "ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ",
    listening: "ಆಲಿಸಲಾಗುತ್ತಿದೆ...",
    typeOrEditCommand: "ಆದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ತಿದ್ದಿ...",
    send: "ಕಳುಹಿಸಿ",
    livePipeline: "ಲೈವ್ ಪ್ರಕ್ರಿಯೆ",
    pipeListening: "ಧ್ವನಿಯನ್ನು ಆಲಿಸಲಾಗುತ್ತಿದೆ",
    pipeTranscribing: "ಮಾತನ್ನು ಪಠ್ಯಕ್ಕೆ ಬದಲಿಸಲಾಗುತ್ತಿದೆ",
    pipeUnderstanding: "ಆದೇಶ ಮತ್ತು ವಿವರಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ",
    pipeVerifyingCustomer: "ಗ್ರಾಹಕರ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ",
    pipeUpdatingLedger: "ಖಾತೆ ಮತ್ತು ಲೆಡ್ಜರ್ ಅಪ್‌ಡೇಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ",
    pipeCompleted: "ಪೂರ್ಣಗೊಂಡಿದೆ",
    quickSamplePrompts: "ಮಾದರಿ ಧ್ವನಿ ಆದೇಶಗಳು",
    samplePromptCredit: '"ರೋಹನ್ ಹೆಸರಿಗೆ 100 ಉಧಾರ್ ಬರಿ"',
    samplePromptPayment: '"ರೋಹನ್ ಅವರಿಂದ 200 ಜಮಾ ಬರಿ"',
    samplePromptBalance: '"ರಮೇಶ್ ಬಾಕಿ ಎಷ್ಟು?"',
    samplePromptReport: '"ಇಂದಿನ ದಿನದ ವರದಿ ತೋರಿಸು"',
    voiceWelcomeEn: "Hello! I am your Gnani AI Voice Assistant. I can help you record Udhar credit, add payments, check balances, and view your daily report. Tap the mic to speak.",
    voiceWelcomeKn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಜ್ಞಾನಿ AI ಧ್ವನಿ ಸಹಾಯಕ. ಉಧಾರ್ ಸಾಲ ಬರೆಯಲು, ಪಾವತಿ ಜಮಾ ಮಾಡಲು, ಬಾಕಿ ವಿಚಾರಿಸಲು ಮತ್ತು ದೈನಂದಿನ ವರದಿ ನೋಡಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ.",
    voiceWelcomeHi: "नमस्ते! मैं आपका ज्ञानी AI वॉयस असिस्टेंट हूँ। मैं उधार दर्ज करने, जमा राशि जोड़ने, बकाया देखने और दैनिक रिपोर्ट में आपकी सहायता कर सकता हूँ। बोलने के लिए माइक दबाएँ।",

    // Language Selector UI
    languageSelectorTitle: "ಭಾಷೆ",
    languageChangedToast: "ಭಾಷೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಯಿಸಲಾಗಿದೆ",

    // Auth & Login & Splash
    loginTitle: "ಖಾತಾಗೆ ಲಾಗಿನ್ ಆಗಿ",
    loginSubtitle: "ನಿಮ್ಮ ಕಿರಾಣಿ ಅಂಗಡಿಯ ಲೆಡ್ಜರ್ ತೆರೆಯಲು ಸೈನ್ ಇನ್ ಮಾಡಿ.",
    emailLabel: "ಇಮೇಲ್ ವಿಳಾಸ",
    passwordLabel: "ಪಾಸ್‌ವರ್ಡ್",
    signInBtn: "ಸೈನ್ ಇನ್",
    oneClickDemoBtn: "🏪 ಡೆಮೊ: ಶ್ರೀ ಗಣೇಶ ಕಿರಾಣಿ (ಅಮೋಘ್)",
    instantDemoHeroBtn: "⚡ ತ್ವರಿತ ಡೆಮೊ ಪ್ರವೇಶ (ಶ್ರೀ ಗಣೇಶ ಕಿರಾಣಿ)",
    enterShopBtn: "🏪 ಅಂಗಡಿಯೊಳಗೆ ಪ್ರವೇಶಿಸಿ / ಲಾಗಿನ್",
    orOneClickDemo: "ಅಥವಾ ಒಂದೇ ಕ್ಲಿಕ್‌ನಲ್ಲಿ ಡೆಮೊ ಲಾಗಿನ್",
    newShopPrompt: "ಹೊಸ ಕಿರಾಣಿ ಅಂಗಡಿಯೇ?",
    createAccountLink: "ಖಾತೆ ರಚಿಸಿ",
    registerTitle: "ಖಾತೆ ರಚಿಸಿ",
    registerSubtitle: "ಹಂತ 1/2. ನಂತರ ನಿಮ್ಮ ಅಂಗಡಿಯನ್ನು ಹೆಸರಿಸಿ.",
    fullNameLabel: "ನಿಮ್ಮ ಹೆಸರು",
    mobileLabel: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
    continueBtn: "ಮುಂದುವರಿಯಿರಿ",
    alreadyRegisteredPrompt: "ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಲಾಗಿದೆಯೇ?",
    setupShopTitle: "ಅಂಗಡಿಯ ಹೆಸರು ದಾಖಲಿಸಿ",
    setupShopSubtitle: "ಹಂತ 2/2. ಇದು ನಿಮ್ಮ ಲೆಡ್ಜರ್‌ನಲ್ಲಿ ಗೋಚರಿಸುತ್ತದೆ.",
    shopNameField: "ಅಂಗಡಿಯ ಹೆಸರು",
    cityField: "ಊರು / ನಗರ",
    stateField: "ರಾಜ್ಯ",
    shopContactField: "ಅಂಗಡಿ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
    openMyKhataBtn: "ನನ್ನ ಖಾತಾ ತೆರೆಯಿರಿ",
    signOutInstead: "ಬದಲಿಗೆ ಸೈನ್ ಔಟ್ ಮಾಡಿ",
    heroHeading: "ಪ್ರತಿಯೊಂದು ರೂಪಾಯಿ ಉಧಾರ್, ಖಚಿತ ಲೆಕ್ಕ.",
    heroSubheading: "ನಿಮ್ಮ ಕೌಂಟರ್‌ನಲ್ಲಿರುವ ಸಾಂಪ್ರದಾಯಿಕ ಬಹಿ-ಖಾತಾ, ಕನ್ನಡ, ಹಿಂದಿ ಮತ್ತು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ AI ಧ್ವನಿ ಲೆಕ್ಕಪತ್ರದೊಂದಿಗೆ ಆಧುನೀಕರಿಸಲ್ಪಟ್ಟಿದೆ.",
    featureVoiceTitle: "ಜ್ಞಾನಿ AI ಧ್ವನಿ ಸಹಾಯಕ",
    featureVoiceDesc: "ಕನ್ನಡ, ಹಿಂದಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ ಉಧಾರ್ ಮತ್ತು ಜಮಾ ದಾಖಲಿಸಿ.",
    featureLedgerTitle: "ಪಕ್ಕಾ ಉಧಾರ್ ಲೆಕ್ಕ",
    featureLedgerDesc: "ಅಂಗಡಿಯ ಪ್ರತಿಯೊಂದು ನಮೂದೂ ಸುರಕ್ಷಿತ, ಗ್ರಾಹಕರ ಬಾಕಿ ಕ್ಷಣಾರ್ಧದಲ್ಲಿ ಲಭ್ಯ.",
    featureRemindersTitle: "UPI & WhatsApp",
    featureRemindersDesc: "ಒಂದೇ ಕ್ಲಿಕ್‌ನಲ್ಲಿ ಪಾವತಿ ಲಿಂಕ್ ಮತ್ತು WhatsApp ನೆನಪೋಲೆ ಕಳುಹಿಸಿ.",
    backToWelcome: "← ಸ್ವಾಗತ ಪರದೆಗೆ ಹಿಂದಿರುಗಿ",

    // Navigation extra
    navPurchases: "ಖರೀದಿಗಳು (ರಶೀದಿಗಳು)",

    // Customer Detail & Purchase History specific
    addPurchaseCredit: "+ ಉಧಾರ್ ಖರೀದಿ ಸೇರಿಸಿ",
    recordPaymentAction: "₹ ಜಮಾ ದಾಖಲಿಸಿ",
    regularCustomerBadge: "ನಿಯಮಿತ ಗ್ರಾಹಕರು",
    totalPurchasesLabel: "ಒಟ್ಟು ಖರೀದಿಗಳು",
    totalPaymentsLabel: "ಒಟ್ಟು ಪಾವತಿಗಳು (ಜಮಾ)",
    outstandingUdharLabel: "ಉಳಿಕೆ ಬಾಕಿ (ಉಧಾರ್)",
    tabKhataSummary: "ಖಾತಾ ಸಾರಾಂಶ",
    tabPurchaseHistory: "ಖರೀದಿ ಚರಿತ್ರೆ",
    tabPaymentHistory: "ಪಾವತಿ ಚರಿತ್ರೆ",
    tabAllTransactions: "ಎಲ್ಲಾ ವಹಿವಾಟುಗಳು",
    purchaseHistoryHeading: "ಖರೀದಿ ಚರಿತ್ರೆ",
    purchaseHistorySubtitle: "ಗ್ರಾಹಕರು ಖರೀದಿಸಿದ ಎಲ್ಲಾ ವಸ್ತುಗಳು, ದಿನಾಂಕ ಮತ್ತು ಸಮಯದೊಂದಿಗೆ",
    colDateTime: "ದಿನಾಂಕ & ಸಮಯ",
    colProductsPurchased: "ಖರೀದಿಸಿದ ಸರಕುಗಳು",
    colQuantity: "ಪ್ರಮಾಣ",
    colAmount: "ಮೊತ್ತ",
    colType: "ಪ್ರಕಾರ",
    typeCreditUdhar: "ಉಧಾರ್ (ಸಾಲ)",
    filterAllTime: "ಎಲ್ಲಾ ಸಮಯ",
    filterToday: "ಇಂದು",
    filterThisWeek: "ಈ ವಾರ",
    filterThisMonth: "ಈ ತಿಂಗಳು",
    filterCustomRange: "ಕಸ್ಟಮ್ ದಿನಾಂಕ",
    applyFilter: "ಅನ್ವಯಿಸಿ",
    resetFilter: "ಮರುಹೊಂದಿಸಿ",
    itemsCount: "ಸರಕುಗಳು",
    itemSingle: "ಸರಕು",
  },

  hi: {
    // Brand & App
    appName: "खाता",
    tagline: "वॉयस-फर्स्ट किराना हिसाब-किताब एवं बहीखाता",
    welcome: "स्वागत है",
    today: "आज",
    loading: "लोड हो रहा है...",
    saving: "सहेजा जा रहा है...",
    cancel: "रद्द करें",
    save: "सहेजें",
    confirm: "पुष्टि करें",
    delete: "हटाएं",
    edit: "संपादित करें",
    back: "वापस",
    done: "पूर्ण",
    close: "बंद करें",
    search: "खोजें",
    actions: "क्रियाएं",
    status: "स्थिति",
    date: "दिनांक",
    amount: "राशि",
    notes: "टिप्पणी",
    description: "विवरण",
    required: "अनिवार्य",
    optional: "वैकल्पिक",
    viewAll: "सभी देखें",
    details: "विवरण",
    all: "सभी",
    filter: "फ़िल्टर",
    retry: "पुनः प्रयास करें",
    or: "या",
    refresh: "ताज़ा करें",
    success: "सफल",
    error: "त्रुटि",

    // Navigation & Shell
    navOverview: "अवलोकन (डैशबोर्ड)",
    navCustomers: "ग्राहक",
    navTransactions: "लेन-देन",
    navDailyReport: "दैनिक रिपोर्ट",
    navProducts: "सामान (उत्पाद)",
    navSettings: "सेटिंग्स",
    navOnboarding: "दुकान सेटअप",
    signOut: "साइन आउट",
    signingOut: "साइन आउट हो रहा है...",
    openMenu: "मेनू खोलें",

    // Action Buttons
    btnVoiceAssistant: "ज्ञानी वॉयस",
    btnUploadHandwritten: "हस्तलिखित खाता अपलोड",
    btnAddCustomer: "+ ग्राहक जोड़ें",
    btnRecordPayment: "जमा (भुगतान)",
    btnGiveCredit: "उधार दर्ज करें",
    btnAddProduct: "उत्पाद जोड़ें",
    btnExportPDF: "PDF डाउनलोड",
    btnExportCSV: "CSV निर्यात",
    btnShareWhatsApp: "WhatsApp पर तगादा भेजें",

    // Financial Types & Headers
    udhar: "उधार",
    credit: "उधार (क्रेडिट)",
    payment: "जमा (भुगतान)",
    jama: "जमा",
    advance: "अग्रिम (एडवांस)",
    balance: "बकाया राशि",
    toCollect: "कुल वसूली योग्य बकाया",
    toPay: "देय राशि",
    settled: "चुका दिया गया",
    openingBalance: "प्रारंभिक उधार",
    dueToday: "आज का बकाया",
    todayCredit: "आज का उधार",
    todayPayments: "आज की कुल जमा",
    totalOutstanding: "कुल बकाया उधार",
    totalCredit: "आजीवन कुल उधार",
    totalPayments: "आजीवन कुल जमा",
    totalAdvance: "अग्रिम जमा",
    customersOnBooks: "खाते में दर्ज ग्राहक",
    entriesToday: "आज की कुल प्रविष्टियां",

    // Overview Page
    overviewTitle: "दुकान का अवलोकन",
    recentEntries: "हालिया लेन-देन",
    allEntries: "सभी प्रविष्टियां",
    highestDues: "अधिकतम बकाया ग्राहक",
    recentDays: "हाल के दिन",
    udharVsCollected: "उधार बनाम जमा",
    noEntriesYet: "अभी तक कोई प्रविष्टि नहीं है। पहला उधार या जमा दर्ज करें।",
    nobodyOwesYou: "वर्तमान में किसी पर बकाया नहीं है।",
    emptyKhataTitle: "आपका खाता बही खाली है",
    emptyKhataBody: "अपना पहला ग्राहक जोड़ें। यदि उन पर पुराना बकाया है, तो प्रारंभिक उधार दर्ज करके शुरुआत करें।",
    addFirstCustomer: "पहला ग्राहक जोड़ें",

    // Customer Page & Profiles
    customersTitle: "ग्राहक सूची",
    searchCustomersPlaceholder: "ग्राहक का नाम या मोबाइल नंबर खोजें...",
    allCustomers: "सभी ग्राहक",
    owingOnly: "केवल बकाया वाले",
    settledOnly: "केवल चुकता वाले",
    customerName: "ग्राहक का नाम",
    mobileNumber: "मोबाइल नंबर",
    address: "पता",
    viewProfile: "खाता देखें",
    noCustomersFound: "खोज से मेल खाता कोई ग्राहक नहीं मिला।",
    noCustomersYet: "अभी कोई ग्राहक दर्ज नहीं है। उधार जोड़ने के लिए ग्राहक बनाएं।",
    customerBalance: "मौजूदा बकाया",
    customerTransactions: "लेन-देन इतिहास",
    customerProfile: "ग्राहक खाता विवरण",
    quickUdhar: "उधार दें",
    quickPayment: "जमा लें",
    callCustomer: "कॉल करें",
    sendReminder: "WhatsApp पर बकाया याद दिलाएं",
    editCustomer: "ग्राहक विवरण बदलें",
    deleteCustomer: "ग्राहक हटाएं",
    confirmDeleteCustomer: "क्या आप वाकई इस ग्राहक को हटाना चाहते हैं? यह वापस नहीं किया जा सकता।",
    lastTransaction: "अंतिम लेन-देन",

    // Transactions Page
    transactionsTitle: "खाता लेन-देन",
    filterByType: "प्रकार अनुसार फ़िल्टर करें",
    allTypes: "सभी प्रकार",
    creditsOnly: "केवल उधार",
    paymentsOnly: "केवल जमा",
    customerCol: "ग्राहक",
    typeCol: "प्रकार",
    amountCol: "राशि",
    dateCol: "दिनांक एवं समय",
    sourceCol: "स्रोत",
    receipt: "रसीद",
    reversal: "लेन-देन रद्द करें",
    reversed: "रद्द किया गया",
    noTransactionsFound: "कोई लेन-देन नहीं मिला।",

    // Daily Report Page
    reportTitle: "दैनिक रोजनामचा (रिपोर्ट)",
    dailySummary: "आज का हिसाब-किताब सारांश",
    selectDate: "दिनांक चुनें",
    totalDayCredit: "आज दिया गया कुल उधार",
    totalDayPayment: "आज प्राप्त कुल जमा राशि",
    netCashFlow: "शुद्ध नकद शेष",
    customerBreakdown: "ग्राहकवार लेन-देन विवरण",
    noActivityDate: "इस दिनांक पर कोई लेन-देन दर्ज नहीं किया गया।",

    // Products & Inventory Page
    productsTitle: "उत्पाद एवं दर सूची",
    productName: "उत्पाद का नाम",
    category: "श्रेणी",
    unit: "इकाई (यूनिट)",
    price: "मूल्य",
    stock: "उपलब्ध स्टॉक",
    searchProductsPlaceholder: "नाम या श्रेणी से उत्पाद खोजें...",
    noProductsFound: "इन्वेंट्री में कोई उत्पाद नहीं है।",

    // Settings Page
    settingsTitle: "दुकान सेटिंग्स",
    shopDetails: "दुकान का प्रोफ़ाइल",
    shopName: "दुकान का नाम",
    shopType: "दुकान की श्रेणी",
    contactNumber: "दुकान का मोबाइल नंबर",
    preferredLanguage: "प्राथमिक भाषा",
    city: "शहर",
    state: "राज्य",
    saveSettings: "प्रोफ़ाइल सहेजें",
    systemStatus: "सिस्टम एवं एकीकरण स्थिति",
    allSystemsOperational: "सभी सिस्टम सुचारू रूप से कार्यरत हैं",
    voiceEngine: "ज्ञानी AI वॉयस इंजन",
    connected: "संबद्ध",
    saveSuccessToast: "दुकान सेटिंग्स सफलतापूर्वक अपडेट की गईं।",

    // Dialogs & Forms
    addCustomerDialogTitle: "नया ग्राहक जोड़ें",
    editCustomerDialogTitle: "ग्राहक संपादित करें",
    customerNamePlaceholder: "उदा: रमेश कुमार",
    mobilePlaceholder: "उदा: 9876543210",
    openingBalanceLabel: "प्रारंभिक उधार राशि (₹)",
    openingBalanceHelp: "यदि पुरानी डायरी या बही का बकाया है तो यहाँ दर्ज करें।",
    recordTransactionTitle: "लेन-देन दर्ज करें",
    recordUdharTitle: "नया उधार दर्ज करें (क्रेडिट)",
    recordPaymentTitle: "ग्राहक जमा दर्ज करें (भुगतान)",
    selectCustomerLabel: "ग्राहक चुनें",
    amountLabel: "राशि (₹)",
    amountPlaceholder: "0.00",
    descriptionPlaceholder: "उदा: 2 बोरी चावल, तेल पैकेट",
    confirmAndSave: "पुष्टि करें और खाते में जोड़ें",

    // AI Handwritten Khata Import
    handwrittenDialogTitle: "AI हस्तलिखित खाता आयात",
    handwrittenDialogDesc: "अपनी हस्तलिखित बही, डायरी या पर्चियों की तस्वीर अपलोड करें और स्वचालित रूप से प्रविष्टियां दर्ज करें।",
    dropzoneText: "खाता फोटो या PDF यहाँ खींचें, या ब्राउज़ करने के लिए क्लिक करें",
    dropzoneSubtext: "हस्तलिखित बही फोटो (JPG, PNG) या स्कैन किया हुआ PDF समर्थित है",
    extractWithAI: "AI द्वारा पढ़ें",
    extractingProgress: "हस्तलिखित खाता पढ़ा जा रहा है...",
    extractingSubtext: "हमारा विज़न OCR मॉडल ग्राहक के नाम, राशि और उधार/जमा की पहचान कर रहा है।",
    reviewExtractedTitle: "प्राप्त लेन-देन की समीक्षा करें",
    reviewExtractedDesc: "विवरण की ध्यान से जांच करें। आप नाम, राशि और प्रकार बदल सकते हैं।",
    addRow: "पंक्ति जोड़ें",
    verifyBadge: "जांचें",
    linkToCustomer: "ग्राहक से जोड़ें:",
    createNewCustomerOpt: "+ नए ग्राहक के रूप में जोड़ें",
    confirmBatchSave: "पुष्टि करें और खाते में सहेजें",
    savingBatchProgress: "खाते में सहेजा जा रहा है...",
    saveBatchSuccessTitle: "खाता प्रविष्टियां सफलतापूर्वक सहेजी गईं!",
    backUploadAnother: "वापस / अन्य अपलोड करें",

    // Voice Assistant
    voiceAssistantTitle: "ज्ञानी AI वॉयस असिस्टेंट",
    voiceSubtitle: "उधार, जमा दर्ज करने, बकाया पूछने या बिक्री जानने के लिए कन्नड़, हिंदी या अंग्रेजी में बोलें।",
    tapMicToSpeak: "बोलने के लिए माइक दबाएं",
    listening: "सुन रहे हैं...",
    typeOrEditCommand: "कमांड टाइप करें या बदलें...",
    send: "भेजें",
    livePipeline: "लाइव प्रक्रिया",
    pipeListening: "आवाज़ सुनी जा रही है",
    pipeTranscribing: "आवाज़ को टेक्स्ट में बदला जा रहा है",
    pipeUnderstanding: "कमांड और विवरण समझा जा रहा है",
    pipeVerifyingCustomer: "ग्राहक का सत्यापन किया जा रहा है",
    pipeUpdatingLedger: "खाता और लेजर अपडेट किया जा रहा है",
    pipeCompleted: "पूर्ण हुआ",
    quickSamplePrompts: "त्वरित नमूना कमांड",
    samplePromptCredit: '"रोहन के नाम 100 उधार लिखो"',
    samplePromptPayment: '"रोहन से 200 जमा लिखो"',
    samplePromptBalance: '"रमेश का बकाया कितना है?"',
    samplePromptReport: '"आज की बिक्री रिपोर्ट दिखाओ"',
    voiceWelcomeEn: "Hello! I am your Gnani AI Voice Assistant. I can help you record Udhar credit, add payments, check balances, and view your daily report. Tap the mic to speak.",
    voiceWelcomeKn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಜ್ಞಾನಿ AI ಧ್ವನಿ ಸಹಾಯಕ. ಉಧಾರ್ ಸಾಲ ಬರೆಯಲು, ಪಾವತಿ ಜಮಾ ಮಾಡಲು, ಬಾಕಿ ವಿಚಾರಿಸಲು ಮತ್ತು ದೈನಂದಿನ ವರದಿ ನೋಡಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ.",
    voiceWelcomeHi: "नमस्ते! मैं आपका ज्ञानी AI वॉयस असिस्टेंट हूँ। मैं उधार दर्ज करने, जमा राशि जोड़ने, बकाया देखने और दैनिक रिपोर्ट में आपकी सहायता कर सकता हूँ। बोलने के लिए माइक दबाएँ।",

    // Language Selector UI
    languageSelectorTitle: "भाषा",
    languageChangedToast: "भाषा सफलतापूर्वक बदल दी गई",

    // Auth & Login & Splash
    loginTitle: "खाता में साइन इन करें",
    loginSubtitle: "अपनी किराना दुकान का बहीखाता खोलने के लिए साइन इन करें।",
    emailLabel: "ईमेल पता",
    passwordLabel: "पासवर्ड",
    signInBtn: "साइन इन",
    oneClickDemoBtn: "🏪 डेमो: श्री गणेश किराना (अमोघ)",
    instantDemoHeroBtn: "⚡ त्वरित डेमो प्रवेश (श्री गणेश किराना)",
    enterShopBtn: "🏪 दुकान में प्रवेश करें / लॉगिन",
    orOneClickDemo: "या एक-क्लिक डेमो लॉगिन",
    newShopPrompt: "नई किराना दुकान है?",
    createAccountLink: "नया खाता बनाएं",
    registerTitle: "नया खाता बनाएं",
    registerSubtitle: "चरण 1/2. इसके बाद अपनी दुकान का नाम दर्ज करें।",
    fullNameLabel: "आपका नाम",
    mobileLabel: "मोबाइल नंबर",
    continueBtn: "आगे बढ़ें",
    alreadyRegisteredPrompt: "पहले से पंजीकृत हैं?",
    setupShopTitle: "दुकान का नाम दर्ज करें",
    setupShopSubtitle: "चरण 2/2. यह आपके बहीखाते पर दिखाई देगा।",
    shopNameField: "दुकान का नाम",
    cityField: "शहर",
    stateField: "राज्य",
    shopContactField: "दुकान का संपर्क नंबर",
    openMyKhataBtn: "मेरा खाता खोलें",
    signOutInstead: "इसके बजाय साइन आउट करें",
    heroHeading: "उधार के हर रुपये का पक्का हिसाब।",
    heroSubheading: "आपकी दुकान का पारंपरिक बही-खाता, अब कन्नड़, हिंदी और अंग्रेजी में AI वॉयस अकाउंटिंग के साथ।",
    featureVoiceTitle: "ज्ञानी AI वॉयस असिस्टेंट",
    featureVoiceDesc: "कन्नड़, हिंदी या अंग्रेजी में बोलकर तुरंत उधार और जमा दर्ज करें।",
    featureLedgerTitle: "सटीक डिजिटल बहीखाता",
    featureLedgerDesc: "दुकान की हर प्रविष्टि सुरक्षित, हर ग्राहक का बकाया तुरंत सामने।",
    featureRemindersTitle: "UPI एवं WhatsApp तगादा",
    featureRemindersDesc: "एक क्लिक में भुगतान लिंक और WhatsApp पर तगादा भेजें।",
    backToWelcome: "← वापस मुख्य स्क्रीन पर",

    // Navigation extra
    navPurchases: "खरीदारी (बिल)",

    // Customer Detail & Purchase History specific
    addPurchaseCredit: "+ उधार खरीदारी जोड़ें",
    recordPaymentAction: "₹ जमा दर्ज करें",
    regularCustomerBadge: "नियमित ग्राहक",
    totalPurchasesLabel: "कुल खरीदारी",
    totalPaymentsLabel: "कुल जमा (भुगतान)",
    outstandingUdharLabel: "बकाया राशि (उधार)",
    tabKhataSummary: "खाता सारांश",
    tabPurchaseHistory: "खरीदारी इतिहास",
    tabPaymentHistory: "भुगतान इतिहास",
    tabAllTransactions: "सभी लेन-देन",
    purchaseHistoryHeading: "खरीदारी इतिहास",
    purchaseHistorySubtitle: "ग्राहक द्वारा खरीदी गई सभी वस्तुओं का दिनांक एवं समय सहित विवरण",
    colDateTime: "दिनांक एवं समय",
    colProductsPurchased: "खरीदा गया सामान",
    colQuantity: "मात्रा",
    colAmount: "राशि",
    colType: "प्रकार",
    typeCreditUdhar: "उधार (क्रेडिट)",
    filterAllTime: "सभी समय",
    filterToday: "आज",
    filterThisWeek: "इस सप्ताह",
    filterThisMonth: "इस माह",
    filterCustomRange: "तिथि सीमा",
    applyFilter: "लागू करें",
    resetFilter: "रीसेट",
    itemsCount: "सामान",
    itemSingle: "सामान",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
  formatCurrency: (amount: string | number | null | undefined) => string;
  formatLocalizedDate: (dateStr: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  voiceLocale: "en-IN" | "kn-IN" | "hi-IN";
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "kn" || saved === "hi" || saved === "en") {
        return saved;
      }
    } catch {
      // ignore localStorage errors
    }
    return "en";
  });

  useEffect(() => {
    const handleLangChange = (e: any) => {
      const newLang = e?.detail;
      if (newLang === "kn" || newLang === "hi" || newLang === "en") {
        setLanguageState(newLang);
      }
    };
    window.addEventListener("khata_language_change", handleLangChange);
    return () => window.removeEventListener("khata_language_change", handleLangChange);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      // Dispatch custom event for immediate sync if any listener listens
      window.dispatchEvent(new CustomEvent("khata_language_change", { detail: lang }));
    } catch {
      // ignore
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const langDict = translations[language] as Record<string, string>;
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const enDict = translations.en as Record<string, string>;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return fallback || (key as string);
  };

  const formatCurrency = (amount: string | number | null | undefined): string => {
    return formatINR(amount);
  };

  const formatLocalizedDate = (dateStr: string | Date, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
      if (Number.isNaN(d.getTime())) return "—";
      const locale = language === "kn" ? "kn-IN" : language === "hi" ? "hi-IN" : "en-IN";
      return new Intl.DateTimeFormat(locale, {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        ...options,
      }).format(d);
    } catch {
      return String(dateStr);
    }
  };

  const voiceLocale = language === "kn" ? "kn-IN" : language === "hi" ? "hi-IN" : "en-IN";

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatCurrency,
        formatLocalizedDate,
        voiceLocale,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
