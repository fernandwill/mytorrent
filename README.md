# MyTorrent

A BitTorrent client built with React and Node.js featuring real peer-to-peer networking and modern UI design.

## Features

- Complete .torrent file parsing with bencode support
- Magnet link support (hex and base32 hash formats)
- HTTP and UDP tracker communication
- Real peer-to-peer connections with TCP handshake
- BitTorrent message protocol implementation
- Modern React frontend with dark/light theme
- Real-time progress tracking with WebSocket updates
- Download controls (pause, resume, remove)
- Peer information display
- Network restriction detection and graceful fallback

## Installation

### Prerequisites
- Node.js 16+ and npm
- Modern web browser

### Setup
1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/mytorrent.git
   cd mytorrent
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development servers
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

## Usage

### Adding Torrents
- **Torrent Files**: Click "Torrent File" tab and select a .torrent file
- **Magnet Links**: Click "Magnet Link" tab and paste a magnet link

### Managing Downloads
- Use pause/resume buttons to control downloads
- Click remove button to delete torrents
- Expand peer section to view connected peers
- Toggle theme using the icon in the header

## Architecture

```
Frontend (React) ↔ WebSocket ↔ Backend (Node.js) ↔ TCP/UDP ↔ BitTorrent Network
```

### Backend Components
- **server.js** - Express server with REST API and WebSocket
- **torrent-parser.js** - Parses .torrent files using bencode
- **magnet-parser.js** - Parses magnet links with hash decoding
- **tracker.js** - HTTP and UDP tracker communication
- **peer-manager.js** - TCP peer connections and BitTorrent protocol
- **download-manager.js** - Download coordination and state management

### Frontend Components
- **App.js** - Main React component with state management
- **Socket.IO client** - Real-time communication with backend
- **Theme system** - Dark/light mode with CSS-in-JS

## API Endpoints

### REST API
- `POST /api/torrent` - Upload .torrent file
- `POST /api/magnet` - Add magnet link
- `POST /api/download/:id/pause` - Pause download
- `POST /api/download/:id/resume` - Resume download
- `DELETE /api/download/:id` - Remove download

### WebSocket Events
- `torrent-added` - New torrent added
- `download-progress` - Progress updates
- `download-complete` - Download finished
- `download-paused/resumed/removed` - State changes

## Project Structure

```
mytorrent/
├── backend/
│   ├── server.js
│   ├── torrent-parser.js
│   ├── magnet-parser.js
│   ├── tracker.js
│   ├── udp-tracker.js
│   ├── peer-manager.js
│   └── download-manager.js
├── frontend/
│   └── src/
│       ├── App.js
│       └── index.js
└── package.json
```

## BitTorrent Protocol Implementation

### Handshake Process
1. Connect to peer via TCP
2. Send handshake with protocol identifier and info hash
3. Exchange bitfield messages
4. Send interested message
5. Wait for unchoke message
6. Request pieces in 16KB blocks

### Message Types
- `choke/unchoke` - Flow control
- `interested/not interested` - Interest indication
- `have` - Piece availability announcement
- `bitfield` - Complete piece availability map
- `request/piece` - Data transfer

### Tracker Communication
- HTTP tracker requests with announce URLs
- UDP tracker protocol for efficiency
- Multi-tracker fallback system

## Network Considerations

- Corporate/school networks may block BitTorrent traffic
- Client gracefully handles network restrictions
- Shows appropriate error messages when blocked
- Supports both HTTP and UDP tracker protocols

## Legal Notice

This BitTorrent client is designed for legal content distribution, educational purposes, and personal use with legally obtained content. Users are responsible for ensuring compliance with local laws and regulations.

## License

MIT License - see LICENSE file for details.