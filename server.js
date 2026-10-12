'use strict';

const http = require('http');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { handleRequest } = require('./src/router');

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    logger.error('Unhandled error', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
});

server.listen(config.port, () => {
  logger.info(`Skycast weather app running at http://localhost:${config.port}`);
});

// Graceful shutdown
function shutdown(signal) {
  logger.info(`${signal} received, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
