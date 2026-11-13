import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { amoghApiClient } from '../../services/api';
import { downloadVoiceConfigJson } from '../../services/exportVoice';
import { 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  Database, 
  Mic, 
  Server 
} from 'lucide-react';

export const IntegrationHandoverHub: React.FC = () => {
  const { backendStatus, checkBackendHealth, voiceConfig, t } = useApp();

  const [activeTab, setActiveTab] = useState<'rohan_voice' | 'amogh_fastapi' | 'postgres_schema'>('rohan_voice');
  const [customApiUrl, setCustomApiUrl] = useState(amoghApiClient.getBaseUrl());
  const [copiedRohan, setCopiedRohan] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const handleUpdateApiUrl = () => {
    amoghApiClient.setBaseUrl(customApiUrl);
    checkBackendHealth();
  };

  const handlePing = async () => {
    setIsPinging(true);
    await checkBackendHealth();
    setTimeout(() => setIsPinging(false), 500);
  };

  const jsonVoiceConfig = JSON.stringify(voiceConfig, null, 2);

  const postgresDDL = `-- PostgreSQL Central Database Schema for Project Khata
-- Shared Backend Architect: Amogh

CREATE TABLE IF NOT EXISTS shops (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    shopkeeper_name VARCHAR(255) NOT NULL,
    shop_type VARCHAR(64) NOT NULL,
    primary_phone VARCHAR(20) NOT NULL,
    alt_phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    market_area VARCHAR(255),
    pincode VARCHAR(10),
    upi_id VARCHAR(100) NOT NULL,
    gst_number VARCHAR(50),
    preferred_language VARCHAR(10) DEFAULT 'kn',
    is_onboarded BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    shop_id VARCHAR(64) REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_kannada VARCHAR(255),
    name_hindi VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    pricing_type VARCHAR(20) NOT NULL, -- 'per_unit' or 'per_kg'
    price_per_unit NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- 'kg', 'packet', 'litre', etc.
    stock_quantity NUMERIC(10, 2) DEFAULT 0,
    min_stock_alert NUMERIC(10, 2) DEFAULT 10,
    voice_keywords TEXT[], -- Synonyms in Kannada/Hindi for Rohan's speech recognition
    barcode VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    shop_id VARCHAR(64) REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    primary_phone VARCHAR(20) NOT NULL,
    alt_phone VARCHAR(20) NOT NULL, -- MANDATORY: persistent follow-up visibility
    alt_phone_label VARCHAR(50) DEFAULT 'Spouse',
    address TEXT,
    credit_limit NUMERIC(10, 2) DEFAULT 5000,
    outstanding_balance NUMERIC(10, 2) DEFAULT 0,
    last_transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS khata_transactions (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE CASCADE,
    bill_id VARCHAR(64),
    tx_type VARCHAR(20) NOT NULL, -- 'credit' (udhar) or 'payment' (jama)
    amount NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    description TEXT,
    recorded_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bills (
    id VARCHAR(64) PRIMARY KEY,
    shop_id VARCHAR(64) REFERENCES shops(id) ON DELETE CASCADE,
    bill_number VARCHAR(64) NOT NULL UNIQUE,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_primary_phone VARCHAR(20),
    customer_alt_phone VARCHAR(20),
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- 'cash', 'upi', 'khata'
    payment_status VARCHAR(20) NOT NULL, -- 'completed', 'credit', 'pending'
    voice_transcript TEXT,
    customer_message_sent BOOLEAN DEFAULT FALSE,
    manager_message_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_dispatches (
    id VARCHAR(64) PRIMARY KEY,
    bill_id VARCHAR(64) REFERENCES bills(id) ON DELETE CASCADE,
    recipient_role VARCHAR(50) NOT NULL, -- 'Customer' or 'Shop Manager'
    recipient_phone VARCHAR(20) NOT NULL,
    channel VARCHAR(20) DEFAULT 'WhatsApp',
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t.apiIntegrationTitle}
            </h1>
            <span className="text-xs bg-indigo-100 text-indigo-900 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Module 1 of 3
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete API Contracts for Amogh’s FastAPI Central Backend and JSON Speech Config for Rohan’s AI Voice Assistant.
          </p>
        </div>

        {/* Live Backend Connection Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
              backendStatus.isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>FastAPI: {backendStatus.isConnected ? 'Connected' : 'Offline (Local Sync Active)'}</span>
            {backendStatus.latencyMs && (
              <span className="text-[10px] font-mono text-emerald-600">({backendStatus.latencyMs}ms)</span>
            )}
          </div>

          <button
            onClick={handlePing}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition-colors"
            title="Ping FastAPI Backend Health Endpoint"
          >
            <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl mb-6 max-w-xl">
        <button
          onClick={() => setActiveTab('rohan_voice')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'rohan_voice'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Rohan Voice Export</span>
        </button>

        <button
          onClick={() => setActiveTab('amogh_fastapi')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'amogh_fastapi'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Amogh FastAPI Spec</span>
        </button>

        <button
          onClick={() => setActiveTab('postgres_schema')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'postgres_schema'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>PostgreSQL DDL</span>
        </button>
      </div>

      {/* TAB 1: ROHAN'S AI VOICE ASSISTANT EXPORT */}
      {activeTab === 'rohan_voice' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-black text-amber-900 text-base">
                <Mic className="w-5 h-5 text-amber-700" />
                <span>Rohan’s AI Voice Assistant Handover Specification</span>
              </div>
              <p className="text-xs text-amber-800 mt-1 max-w-2xl">
                Contains persistent language locale (<code>{voiceConfig.speechLocale}</code>), complete store vocabulary dictionary with spoken Kannada/Hindi aliases, weight multipliers (250g, 500g, 1kg), and TTS voice templates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonVoiceConfig);
                  setCopiedRohan(true);
                  setTimeout(() => setCopiedRohan(false), 2000);
                }}
                className="px-3.5 py-2 bg-white hover:bg-amber-100/50 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition-colors flex items-center gap-1.5"
              >
                {copiedRohan ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRohan ? 'Copied JSON!' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={() => downloadVoiceConfigJson(voiceConfig)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download khata_voice_config.json</span>
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="bg-slate-900 rounded-3xl p-5 text-slate-200 shadow-xl overflow-hidden border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400 font-mono">
              <span>khata_voice_config.json ({voiceConfig.catalogDictionary.length} items)</span>
              <span className="text-amber-400 font-bold">{voiceConfig.speechLocale}</span>
            </div>
            <pre className="mt-3 text-xs font-mono overflow-x-auto max-h-[460px] text-amber-200/90 leading-relaxed">
              {jsonVoiceConfig}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: AMOGH'S FASTAPI ENDPOINTS SPEC */}
      {activeTab === 'amogh_fastapi' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Backend Base URL Configurator */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 mb-2">
              Connect to Amogh’s FastAPI Central Backend
            </h3>
            <div className="flex items-center gap-2 max-w-lg">
              <input
                type="text"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
              />
              <button
                onClick={handleUpdateApiUrl}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                Update & Ping
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Default is <code>http://localhost:8000</code>. When Amogh launches the server (e.g. <code>uvicorn main:app --reload</code>), the frontend seamlessly reads and writes from his central PostgreSQL database!
            </p>
          </div>

          {/* Endpoints Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900">
              Shared FastAPI REST Endpoints Contract
            </h3>

            <div className="space-y-3 text-xs">
              {[
                {
                  method: 'GET / POST',
                  path: '/api/shop/profile',
                  desc: 'Fetch or persist shopkeeper details, shop category, UPI ID, and address.',
                  status: 'Integrated & Synced',
                },
                {
                  method: 'PUT',
                  path: '/api/shop/language',
                  desc: 'Update preferred language (kn, hi, en) for speech & invoice services.',
                  status: 'Integrated & Synced',
                },
                {
                  method: 'GET / POST / PUT',
                  path: '/api/inventory/products',
                  desc: 'Manage dynamic catalog items, stock limits, per-unit vs per-KG rates, and Kannada/Hindi voice aliases.',
                  status: 'Integrated & Synced',
                },
                {
                  method: 'GET / POST',
                  path: '/api/customers',
                  desc: 'Customer ledger with MANDATORY primary & alternative phone numbers and outstanding balance.',
                  status: 'Integrated & Synced',
                },
                {
                  method: 'POST',
                  path: '/api/customers/{id}/transactions',
                  desc: 'Record Udhar credit or Jama repayments and recalculate balances.',
                  status: 'Integrated & Synced',
                },
                {
                  method: 'POST',
                  path: '/api/voice/parse-order',
                  desc: 'Parse speech transcript into matched inventory items and calculated prices.',
                  status: 'Integrated & Synced',
                },
                {
                  method: 'POST',
                  path: '/api/billing/invoices',
                  desc: 'Create completed invoice, update stock inventory, and trigger notifications.',
                  status: 'Integrated & Synced',
                },
                {
                  method: 'POST',
                  path: '/api/notifications/dispatch',
                  desc: 'Closed-loop automated WhatsApp dispatch to customer and manager payment alert.',
                  status: 'Integrated & Synced',
                },
              ].map((ep, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {ep.method}
                      </span>
                      <span className="font-bold text-slate-900">{ep.path}</span>
                    </div>
                    <div className="text-slate-600 text-[11px]">{ep.desc}</div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full self-start sm:self-auto shrink-0">
                    {ep.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POSTGRESQL CENTRAL DDL SCHEMA */}
      {activeTab === 'postgres_schema' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-black text-blue-900 text-base">
                <Database className="w-5 h-5 text-blue-700" />
                <span>Central PostgreSQL Database Schema</span>
              </div>
              <p className="text-xs text-blue-800 mt-1">
                Run this DDL script in PostgreSQL / Supabase to initialize all required relational tables for Amogh's FastAPI backend.
              </p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(postgresDDL);
                setCopiedSchema(true);
                setTimeout(() => setCopiedSchema(false), 2000);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSchema ? 'Copied SQL DDL!' : 'Copy SQL Schema'}</span>
            </button>
          </div>

          <div className="bg-slate-900 rounded-3xl p-5 text-slate-200 shadow-xl overflow-hidden border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400 font-mono">
              <span>schema.sql (PostgreSQL 14+)</span>
              <span className="text-blue-400 font-bold">Relational DB</span>
            </div>
            <pre className="mt-3 text-xs font-mono overflow-x-auto max-h-[460px] text-blue-200/90 leading-relaxed">
              {postgresDDL}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
