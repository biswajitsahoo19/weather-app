'use strict';

const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  publicDir: path.join(__dirname, '..', 'public'),

  // Open-Meteo: free, no API key required
  geocodingUrl: 'https://geocoding-api.open-meteo.com/v1/search',
  forecastUrl: 'https://api.open-meteo.com/v1/forecast',

  requestTimeoutMs: 8000,
  cacheTtlMs: 10 * 60 * 1000, // 10 minutes
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
};
