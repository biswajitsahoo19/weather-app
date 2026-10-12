'use strict';

const config = require('./config');
const logger = require('./utils/logger');
const RateLimiter = require('./utils/rateLimiter');
const { AppError } = require('./utils/errors');
const { getWeatherByCity } = require('./services/weatherService');
const { serveStatic } = require('./staticServer');

const limiter = new RateLimiter(config.rateLimit);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; connect-src 'self'",
};

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(payload);
}

async function handleRequest(req, res) {
  const started = Date.now();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);

  res.on('finish', () => {
    logger.info(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - started}ms)`);
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, HEAD' });
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // ---- API routes ----
  if (url.pathname.startsWith('/api/')) {
    if (!limiter.allow(req.socket.remoteAddress)) {
      return sendJson(res, 429, { error: 'Too many requests. Please slow down.' });
    }

    if (url.pathname === '/api/health') {
      return sendJson(res, 200, { status: 'ok', uptime: process.uptime() });
    }

    if (url.pathname === '/api/weather') {
      try {
        const data = await getWeatherByCity(
          url.searchParams.get('city'),
          url.searchParams.get('units')
        );
        return sendJson(res, 200, data);
      } catch (err) {
        if (err instanceof AppError) {
          return sendJson(res, err.statusCode, { error: err.message });
        }
        throw err;
      }
    }

    return sendJson(res, 404, { error: 'API route not found' });
  }

  // ---- Static frontend ----
  return serveStatic(req, res, url.pathname);
}

module.exports = { handleRequest };
