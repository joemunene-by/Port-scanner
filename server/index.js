const express = require("express");
const cors = require("cors");
const net = require("net");
const path = require("path");
const dns = require("dns");

const app = express();
const PORT = 3001;
const BATCH_SIZE = 100;
const TIMEOUT_MS = 1500;

// ---------------------------------------------------------------------------
// Common service names
// ---------------------------------------------------------------------------
const SERVICE_MAP = {
  20: "FTP Data",
  21: "FTP",
  22: "SSH",
  23: "Telnet",
  25: "SMTP",
  53: "DNS",
  67: "DHCP",
  68: "DHCP",
  69: "TFTP",
  80: "HTTP",
  110: "POP3",
  111: "RPCBind",
  119: "NNTP",
  123: "NTP",
  135: "MS RPC",
  137: "NetBIOS",
  138: "NetBIOS",
  139: "NetBIOS",
  143: "IMAP",
  161: "SNMP",
  162: "SNMP Trap",
  389: "LDAP",
  443: "HTTPS",
  445: "SMB",
  465: "SMTPS",
  514: "Syslog",
  515: "LPD",
  587: "SMTP (sub)",
  631: "IPP/CUPS",
  636: "LDAPS",
  993: "IMAPS",
  995: "POP3S",
  1080: "SOCKS",
  1433: "MSSQL",
  1434: "MSSQL Browser",
  1521: "Oracle DB",
  1723: "PPTP",
  2049: "NFS",
  2082: "cPanel",
  2083: "cPanel SSL",
  3306: "MySQL",
  3389: "RDP",
  5432: "PostgreSQL",
  5900: "VNC",
  5901: "VNC",
  6379: "Redis",
  6667: "IRC",
  8080: "HTTP Proxy",
  8443: "HTTPS Alt",
  8888: "HTTP Alt",
  9090: "Prometheus",
  9200: "Elasticsearch",
  11211: "Memcached",
  27017: "MongoDB",
};

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// Serve the client
app.use(express.static(path.join(__dirname, "..", "client")));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a string is a plausible IPv4 address or hostname.
 */
function isValidTarget(target) {
  if (!target || typeof target !== "string") return false;
  const trimmed = target.trim();
  if (trimmed.length === 0 || trimmed.length > 253) return false;

  // IPv4
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4.test(trimmed)) {
    return trimmed.split(".").every((n) => {
      const num = parseInt(n, 10);
      return num >= 0 && num <= 255;
    });
  }

  // Hostname (simple check)
  const hostname = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  return hostname.test(trimmed);
}

/**
 * Parse a port specification string into an array of port numbers.
 * Supports: "80", "80,443", "20-100", "22, 80, 443, 8000-9000"
 */
function parsePorts(portsInput, startPort, endPort) {
  // If explicit start/end provided, use range
  if (startPort !== undefined && endPort !== undefined) {
    const s = parseInt(startPort, 10);
    const e = parseInt(endPort, 10);
    if (isNaN(s) || isNaN(e) || s < 1 || e > 65535 || s > e) return null;
    const ports = [];
    for (let i = s; i <= e; i++) ports.push(i);
    return ports;
  }

  // Parse ports string
  if (typeof portsInput === "string") {
    const ports = new Set();
    const parts = portsInput.split(",").map((p) => p.trim());
    for (const part of parts) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map((n) => parseInt(n.trim(), 10));
        if (isNaN(a) || isNaN(b) || a < 1 || b > 65535 || a > b) return null;
        for (let i = a; i <= b; i++) ports.add(i);
      } else {
        const n = parseInt(part, 10);
        if (isNaN(n) || n < 1 || n > 65535) return null;
        ports.add(n);
      }
    }
    return [...ports].sort((a, b) => a - b);
  }

  // Array of numbers
  if (Array.isArray(portsInput)) {
    return portsInput
      .map((n) => parseInt(n, 10))
      .filter((n) => n >= 1 && n <= 65535)
      .sort((a, b) => a - b);
  }

  return null;
}

/**
 * Attempt a TCP connection to target:port. Resolves with status.
 */
function scanPort(target, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (status) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({
        port,
        status,
        service: SERVICE_MAP[port] || "Unknown",
      });
    };

    socket.setTimeout(TIMEOUT_MS);

    socket.on("connect", () => finish("open"));
    socket.on("timeout", () => finish("filtered"));
    socket.on("error", (err) => {
      if (err.code === "ECONNREFUSED") finish("closed");
      else finish("filtered");
    });

    socket.connect(port, target);
  });
}

/**
 * Scan ports in batches to avoid file-descriptor exhaustion.
 */
async function scanPorts(target, ports) {
  const results = [];
  for (let i = 0; i < ports.length; i += BATCH_SIZE) {
    const batch = ports.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((port) => scanPort(target, port))
    );
    results.push(...batchResults);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.post("/api/scan", async (req, res) => {
  try {
    const { target, ports: portsInput, startPort, endPort } = req.body;

    if (!isValidTarget(target)) {
      return res.status(400).json({ error: "Invalid target. Provide a valid IPv4 address or hostname." });
    }

    const ports = parsePorts(portsInput, startPort, endPort);
    if (!ports || ports.length === 0) {
      return res.status(400).json({ error: "Invalid port specification. Use a range like 1-1024 or a list like 80,443." });
    }

    if (ports.length > 10000) {
      return res.status(400).json({ error: "Port range too large. Maximum 10 000 ports per scan." });
    }

    console.log(`[SCAN] ${target} | ${ports.length} ports (${ports[0]}-${ports[ports.length - 1]})`);
    const startTime = Date.now();
    const results = await scanPorts(target, ports);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    const openPorts = results.filter((r) => r.status === "open");
    console.log(`[DONE] ${target} | ${openPorts.length} open / ${ports.length} scanned in ${elapsed}s`);

    res.json({
      target,
      totalScanned: ports.length,
      openCount: openPorts.length,
      elapsed,
      results,
    });
  } catch (err) {
    console.error("[ERROR]", err);
    res.status(500).json({ error: "Scan failed: " + err.message });
  }
});

// Fallback — serve client index.html for any non-API route
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n  Port Scanner Pro — backend listening on http://localhost:${PORT}\n`);
});
