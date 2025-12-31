const net = require('net');

/**
 * Scans a single port on a target host.
 * @param {string} host - The target hostname or IP.
 * @param {number} port - The port to scan.
 * @param {number} timeout - Connection timeout in ms.
 * @returns {Promise<object>} - Result object { port, status: 'open' | 'closed' | 'timeout' }.
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
      // Connection refused usually means closed
      if (err.code === 'ECONNREFUSED') {
        status = 'closed';
      } else {
        // Other errors can be treated as closed or filtered/error depending on need
        // For simplicity in this scanner, we'll default to closed/error
        status = 'closed'; 
      }
    });

    socket.on('close', () => {
      resolve({ port, status });
    });

    socket.connect(port, host);
  });
}

/**
 * Scans a range of ports or specific list.
 * @param {string} host 
 * @param {number[]} ports 
 * @returns {Promise<object[]>}
 */
async function scanPorts(host, ports) {
  const results = [];
  // Run scans in parallel chunks to speed up, but not too many at once to avoid OS limits
  // For simplicity, we'll do batches of 50
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < ports.length; i += BATCH_SIZE) {
    const batch = ports.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(port => scanPort(host, port));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

module.exports = { scanPort, scanPorts };
