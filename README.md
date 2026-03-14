# Port Scanner Pro

A modern, high-performance web-based port scanner featuring a Node.js backend and a sleek React frontend.

![License](https://img.shields.io/badge/license-ISC-blue.svg)

## Features

- **Fast Scanning**: Uses Node.js native `net` module for accurate and quick port scanning.
- **Modern UI**: Built with React and Vite, featuring glassmorphism design and smooth animations.
- **Real-time Results**: Visual feedback for open, closed, and timeout ports.
- **Range Support**: Scan specific ports (e.g., `80, 443`) or ranges (e.g., `20-100`).

## Tech Stack

- **Frontend**: React, Vite, CSS (Modules/Variables)
- **Backend**: Node.js, Express, Socket.io (ready), Net module

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/joemunene-by/Port-scanner.git
   cd Port-scanner
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

### Running the Application

You need to run both the backend and frontend servers.

1. **Start the Backend Server**:

   ```bash
   npm start
   ```

   Server runs on `http://localhost:3001`

2. **Start the Frontend Development Server**:

   ```bash
   npm run dev
   ```

   Frontend runs on `http://localhost:5173` (or similar)

## API Endpoints

### `POST /api/scan`

Scans a target host for specified ports.

**Body:**

```json
{
  "target": "127.0.0.1",
  "ports": "20-100" // or [80, 443]
}
```

## License

This project is licensed under the ISC License.
