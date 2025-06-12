// mdns-sync.js
// A single-file mDNS sync tool acting as client or server
// Uses mdns-server for mDNS and Express for HTTP

const express = require('express');
const axios = require('axios');
const mdns = require('mdns-server');

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const SYNC_INTERVAL = 60 * 1000; // 60 seconds

// Parse command line arguments for --server-url
function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  const pref = name + '=';
  const arg = process.argv.find((a) => a.startsWith(pref));
  return arg ? arg.slice(pref.length) : null;
}

const SERVER_URL = getArg('--server-url') || process.env.SERVER_URL;

// In-memory database of services
const services = {}; // key -> {record, ts}

// Helper: unique key for de-duplication
function keyFor(rec) {
  return `${rec.name}:${rec.type}`;
}

function addOrUpdate(rec) {
  services[keyFor(rec)] = { record: rec, ts: Date.now() };
}

function purgeOld() {
  const now = Date.now();
  for (const k of Object.keys(services)) {
    if (now - services[k].ts > TTL_MS) {
      delete services[k];
    }
  }
}

// Filtering placeholder
function filterFn(rec) {
  // Example: return rec.name.endsWith('_http._tcp.local');
  return true; // capture everything by default
}

function startMdnsCapture() {
  const server = mdns();

  server.on('response', (res) => {
    for (const answer of res.answers) {
      if (filterFn(answer)) addOrUpdate(answer);
    }
  });

  // also listen to queries if desired
  server.on('query', (q) => {
    for (const question of q.questions) {
      if (filterFn(question)) addOrUpdate(question);
    }
  });

  // start server
  server.createMDNS();
  return server;
}

async function syncWithServer(mdnsServer) {
  purgeOld();
  try {
    const localEntries = Object.values(services).map((s) => s.record);
    const res = await axios.post(SERVER_URL, { entries: localEntries });
    const remoteEntries = res.data.entries || [];
    remoteEntries.forEach((entry) => {
      addOrUpdate(entry);
      mdnsServer.respond(entry); // inject into local subnet
    });
  } catch (err) {
    console.error('Sync error', err.message);
  }
}

function startClient() {
  if (!SERVER_URL) {
    console.error('SERVER_URL must be provided via --server-url or environment variable');
    process.exit(1);
  }
  const mdnsServer = startMdnsCapture();
  setInterval(() => syncWithServer(mdnsServer), SYNC_INTERVAL);
  setInterval(purgeOld, TTL_MS);
}

function startServer() {
  const app = express();
  app.use(express.json());

  app.post('/sync', (req, res) => {
    const entries = req.body.entries || [];
    entries.forEach((e) => addOrUpdate(e));
    purgeOld();
    res.json({ entries: Object.values(services).map((s) => s.record) });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server listening on ${port}`));

  setInterval(purgeOld, TTL_MS);
}

if (process.argv.includes('--server')) {
  startServer();
} else {
  startClient();
}
