// Vercel serverless entry point — re-exports the Express app from server.js
// The VERCEL env var is automatically set by Vercel, which triggers:
//   1. Lazy MongoDB connection (per-request middleware)
//   2. No app.listen() call
const app = require('../server');
module.exports = app;
