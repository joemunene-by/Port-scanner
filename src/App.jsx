import { useState } from 'react'

function App() {
    const [target, setTarget] = useState('127.0.0.1')
    const [ports, setPorts] = useState('20-100')
    const [results, setResults] = useState([])
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState(null)

    const handleScan = async () => {
        setIsScanning(true)
        setError(null)
        setResults([])

        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ target, ports }),
            })

            if (!response.ok) {
                throw new Error('Scan failed')
            }

            const data = await response.json()
            setResults(data.results)
        } catch (err) {
            setError(err.message)
        } finally {
            setIsScanning(false)
        }
    }

    return (
        <div className="glass-panel">
            <h1>Port Scanner Pro</h1>

            <div className="input-group">
                <input
                    type="text"
                    placeholder="Target IP / Hostname"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Ports (e.g. 80, 20-100)"
                    value={ports}
                    onChange={(e) => setPorts(e.target.value)}
                />
                <button onClick={handleScan} disabled={isScanning}>
                    {isScanning ? <span className="loader"></span> : 'Start Scan'}
                </button>
            </div>

            {error && (
                <div style={{ color: 'var(--status-closed)', marginBottom: '1rem', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <div className="results-grid">
                {results.map((result) => (
                    <div key={result.port} className="port-card">
                        <span className="port-number">{result.port}</span>
                        <div className={`port-status status-${result.status}`}>
                            {result.status}
                        </div>
                    </div>
                ))}
            </div>

            {!isScanning && results.length === 0 && !error && (
                <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>
                    Ready to scan. Enter a target and port range.
                </div>
            )}
        </div>
    )
}

export default App
