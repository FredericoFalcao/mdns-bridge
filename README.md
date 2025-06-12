# 🔍 mDNS Sync Mesh

A Node.js tool to capture, sync, and broadcast mDNS service entries across subnets.  
This single-file app acts as either a **client** or a **server**, allowing local networks to share and discover mDNS services beyond their subnet boundaries.

## 🧠 Features

- Captures mDNS traffic on the local subnet (with optional service filtering)
- Maintains a local in-memory database of services with TTL management
- Periodically syncs with a global HTTP server
- Injects remote services into the local network using mDNS broadcast
- Works in either `--client` or `--server` mode from the same file
- Simple de-duplication by full service string
- Clean and customizable architecture

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install mdns-server express axios
```

### 2. Run as a Client (default)
```bash
node mdns-sync.js
```

### 3. Run as a Server
```bash
node mdns-sync.js --server
```
The server listens for POST requests from clients and responds with its known mDNS entries.

### 🧩 How it Works

#### Client Mode
	•	Captures local mDNS broadcasts and saves valid entries
	•	Syncs with the server every 60 seconds:
	•	Sends its local entries
	•	Receives global entries from the server
	•	Injects global entries into the local network

#### Server Mode
	•	Accepts incoming POSTs at /sync
	•	Maintains a global list of all known entries
	•	Responds with deduplicated list of known services


### ⚙️ Filtering Services

Inside the code, a filter function (filterFn) is provided for you to define which mDNS services you care about.
For example:
```js
return service.name.endsWith('_http._tcp.local');
```

### 🗑️ Expiration Policy
	•	Entries are purged if not seen or refreshed in the last 10 minutes
	•	Cleanup runs periodically in the background

### 📁 Project Structure

This project is a single-file Node.js app:
mdns-sync.js  ← main logic (client + server in one)
README.md     ← you're reading this

### 🛠 TODO / Customization Ideas
	•	Add persistent storage (e.g., file or Redis) on server
	•	Add authentication for sync
	•	Add mDNS service advertisement (not just injection)
	•	Add Prometheus metrics or a dashboard for debugging

### 🧑‍💻 License

MIT License – feel free to fork and extend.
