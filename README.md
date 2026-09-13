# 🔥 Lead Rescue AI — Autonomous Lead Recovery & Qualification SaaS

Lead Rescue AI is an enterprise-grade SaaS platform designed to capture, score, qualify, and re-engage inactive, lost, or cold leads using autonomous multi-channel AI agents (Email, WhatsApp, Webhooks, CRM integrations).

---

## 🚨 IMPORTANT: Secret Safety & Git History Warning

> [!CAUTION]
> **Credential Rotation Required Before Deployment:**
> If any API keys, passwords, database URIs, or tokens were previously hardcoded or committed to git history during early development, **those old secret values remain permanently stored in git commit history**.
>
> **Before deploying this application to production:**
> 1. **Rotate all keys immediately:** Generate new API keys for Stripe, Resend, OpenRouter, WASender, Twilio, Payoneer, and Supabase.
> 2. **Update your production environment variables:** Set all active production keys in your hosting provider's dashboard (Render, Hostinger, Vercel, Supabase).
> 3. **Never commit `.env` or `.env.local`:** Ensure `.env` files remain strictly in `.gitignore`.

---

## 🛡️ Secret Safety & Environment Configuration

All sensitive configuration parameters in Lead Rescue AI are retrieved strictly via environment variables. Zero credentials, API tokens, database connection strings, or signing secrets exist as string literals in the source code.

### Required Environment Variables Summary

| Variable Name | Environment Scope | Exposure | Description / Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | Private | Application environment (`production` / `development`) |
| `PORT` | Server | Private | Backend Express server port (default `3001`) |
| `APP_URL` | Server | Private | Primary application URL (`https://leadrescueai.xilxil.com`) |
| `NEXT_PUBLIC_API_URL` | Client & Server | **Public Safe** | Backend API base URL exposed to frontend |
| `ALLOWED_ORIGINS` | Server | Private | CORS allowed origins for backend endpoints |
| `JWT_SECRET` | Server | **Private** | HMAC key for signing user auth tokens |
| `POSTGRES_URL` | Server | **Private** | Supabase / PostgreSQL database connection string |
| `OPENROUTER_API_KEY` | Server | **Private** | AI lead qualification & scoring API key |
| `RESEND_API_KEY` | Server | **Private** | Transactional email dispatch API key |
| `EMAIL_FROM` | Server | Private | Verified sender email address |
| `STRIPE_SECRET_KEY` | Server | **Private** | Stripe subscription & checkout API key |
| `STRIPE_WEBHOOK_SECRET` | Server | **Private** | Signature verification key for Stripe webhooks |
| `PAYONEER_CLIENT_SECRET`| Server | **Private** | Payoneer API client secret |
| `WASENDER_API_KEY` | Server | **Private** | WASender WhatsApp messaging API key |
| `TWILIO_AUTH_TOKEN` | Server | **Private** | Twilio SMS/WhatsApp auth token |
| `WEBHOOK_SECRET` | Server | **Private** | HMAC SHA-256 key for inbound lead webhooks |
| `WHATSAPP_VERIFY_TOKEN` | Server | **Private** | Webhook verification token for Meta / WASender |

> [!NOTE]
> See [`.env.example`](file:///.env.example) for a complete template of all configurable environment variables.

---

## 🏗️ Architecture Overview

- **Frontend:** Next.js (App Router, Tailwind CSS, Lucide Icons, Glassmorphism design system)
- **Backend:** Express REST API (`server/index.js`) running on Node.js
- **Database:** Dual-Engine architecture
  - **Production:** Supabase PostgreSQL with pooled connection management & strict RLS policies
  - **Development:** Local LibSQL / SQLite (`dev.db`)
- **Background Pipeline:** Asynchronous job queue (`server/lib/queue/asyncQueue.js`) for non-blocking AI qualification & multi-channel response dispatches

---

## 🚀 Quick Start (Local Development)

1. **Clone & Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   *Edit `.env.local` and add your development API keys.*

3. **Start Development Servers:**
   - **Frontend (Next.js):** `npm run dev` (Runs on http://localhost:3000)
   - **Backend Server (Express):** `node server/index.js` (Runs on http://localhost:3001)

4. **Run Verification Test Suite:**
   ```bash
   node test/security_and_pipeline.test.js
   node test/prd_comprehensive.test.js
   ```

---

## 🔒 Security Best Practices Checklist

- [x] All secret keys & connection strings moved to environment variables.
- [x] Zero hardcoded key string literals in source code, utility scripts, or comments.
- [x] `NEXT_PUBLIC_` prefix restricted strictly to non-sensitive public URL (`NEXT_PUBLIC_API_URL`).
- [x] Supabase Service Role Key and Stripe Secret Key kept exclusively server-side.
- [x] Webhook endpoints enforce HMAC SHA-256 signature verification.
- [x] Sensitive parameters scrubbed from console logging and API error responses.
- [x] `.env` and all credential files blocked in `.gitignore`.
