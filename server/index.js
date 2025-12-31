const express = require('express');
const cors = require('cors');
const { scanPorts } = require('./scanner');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Common ports to scan if none provided
const COMMON_PORTS = [
    20, 21, 22, 23, 25, 53, 80, 110, 143, 443,
    465, 587, 993, 995, 3000, 3306, 5432, 8080, 8443
];

app.post('/api/scan', async (req, res) => {
    const { target, ports } = req.body;

    if (!target) {
        return res.status(400).json({ error: 'Target is required' });
    }

    // Use provided ports or default to common ones
    // If ports is a range string like "20-100", parse it (simple implementation)
    let portsToScan = [];

    if (Array.isArray(ports) && ports.length > 0) {
        portsToScan = ports;
    } else if (typeof ports === 'string' && ports.includes('-')) {
        const [start, end] = ports.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
            for (let i = start; i <= end; i++) {
                portsToScan.push(i);
            }
        }
    }

    if (portsToScan.length === 0) {
        portsToScan = COMMON_PORTS;
    }

    // Limit max ports to prevent abuse in this demo
    if (portsToScan.length > 1000) {
        return res.status(400).json({ error: 'Too many ports. Limit is 1000.' });
    }

    try {
        console.log(`Scanning ${target} on ${portsToScan.length} ports...`);
        const results = await scanPorts(target, portsToScan);
        res.json({ target, results });
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Failed to scan target' });
    }
});

app.listen(PORT, () => {
    console.log(`Scanner server running on http://localhost:${PORT}`);
});
