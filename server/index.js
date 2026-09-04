/**
 * server/index.js
 * Standalone Express.js backend server for Render deployment.
 * Mirrors all Next.js API route handlers using the shared lib/ modules.
 *
 * Run with: node server/index.js
 * Environment: Set POSTGRES_URL, JWT_SECRET, etc. in Render dashboard.
 */

'use strict';

// ─── Load environment variables ───────────────────────────────────────────────
// In production (Render), env vars are injected by the platform.
// For local testing, create a server/.env file.
try {
  require('dotenv').config({ path: require('path').join(__dirname, '.env') });
} catch {}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Always allow localhost for local dev
ALLOWED_ORIGINS.push('http://localhost:3000', 'http://127.0.0.1:3000');

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
// Each route module exports an Express router.
// We dynamically load them so this file stays clean.

const routeModules = [
  { path: '/api/v1/auth',                  module: './routes/auth' },
  { path: '/api/v1/leads',                 module: './routes/leads' },
  { path: '/api/v1/lead-sources',          module: './routes/lead-sources' },
  { path: '/api/v1/crm',                   module: './routes/crm' },
  { path: '/api/v1/crm-connectors',        module: './routes/crm-connectors' },
  { path: '/api/v1/appointments',          module: './routes/appointments' },
  { path: '/api/v1/followup-messages',     module: './routes/followup-messages' },
  { path: '/api/v1/followup-templates',    module: './routes/followup-templates' },
  { path: '/api/v1/notifications',         module: './routes/notifications' },
  { path: '/api/v1/organizations',         module: './routes/organizations' },
  { path: '/api/v1/payments',              module: './routes/payments' },
  { path: '/api/v1/rag',                   module: './routes/rag' },
  { path: '/api/v1/reports',               module: './routes/reports' },
  { path: '/api/v1/rescue',                module: './routes/rescue' },
  { path: '/api/v1/webhooks',              module: './routes/webhooks' },
];

for (const { path: mountPath, module: modulePath } of routeModules) {
  try {
    const router = require(modulePath);
    app.use(mountPath, router);
    console.log(`✓ Mounted ${mountPath}`);
  } catch (err) {
    console.warn(`⚠ Could not load route module ${modulePath}:`, err.message);
  }
}

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Lead Rescue AI Backend`);
  console.log(`   Running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Allowed origins: ${ALLOWED_ORIGINS.join(', ')}\n`);
});
