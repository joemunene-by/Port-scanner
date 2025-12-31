import net from 'net';

/**
 * Scans a single port on a target host.
 */
function scanPort(host, port, timeout = 1000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = 'closed';

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            status = 'open';
            socket.destroy();
        });

        socket.on('timeout', () => {
            status = 'timeout';
            socket.destroy();
        });

        socket.on('error', (err) => {
            status = 'closed';
        });

        socket.on('close', () => {
            resolve({ port, status });
        });

        socket.connect(port, host);
    });
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { target, ports } = req.body;

    if (!target) {
        return res.status(400).json({ error: 'Target is required' });
    }

    const COMMON_PORTS = [
        20, 21, 22, 23, 25, 53, 80, 110, 143, 443,
        465, 587, 993, 995, 3000, 3306, 5432, 8080, 8443
    ];

    let portsToScan = [];

    if (Array.isArray(ports) && ports.length > 0) {
        portsToScan = ports;
    } else if (typeof ports === 'string' && ports.includes('-')) {
        const parts = ports.split('-').map(Number);
        if (parts.length === 2) {
            const [start, end] = parts;
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                // Limit range size to prevent timeout on serverless
                const safeEnd = Math.min(end, start + 50);
                for (let i = start; i <= safeEnd; i++) {
                    portsToScan.push(i);
                }
            }
        }
    }

    if (portsToScan.length === 0) {
        portsToScan = COMMON_PORTS;
    }

    // Hard limit for serverless execution time
    if (portsToScan.length > 50) {
        portsToScan = portsToScan.slice(0, 50);
    }

    try {
        const results = await Promise.all(portsToScan.map(port => scanPort(target, port)));
        res.status(200).json({ target, results });
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Failed to scan target' });
    }
}
