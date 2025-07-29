# MyTorrent - Modern BitTorrent Client

A fully functional BitTorrent client built with React and Node.js, featuring real peer-to-peer networking, modern UI design, and complete protocol implementation.

![MyTorrent Screenshot](https://via.placeholder.com/800x400/2c3e50/ffffff?text=MyTorrent+BitTorrent+Client)

## 🌟 Features

### Core BitTorrent Protocol
- ✅ **Complete .torrent file parsing** with bencode support
- ✅ **Magnet link support** (hex and base32 hash formats)
- ✅ **HTTP & UDP tracker communication**
- ✅ **Real peer-to-peer connections** with TCP handshake
- ✅ **BitTorrent message protocol** (choke, unchoke, have, bitfield, piece, request)
- ✅ **Multi-tracker fallback** system

### User Interface
- 🎨 **Modern React frontend** with responsive design
- 🌙 **Dark/Light theme** with smooth transitions
- 📊 **Real-time progress tracking** with WebSocket updates
- ⏯️ **Download controls** (pause, resume, remove)
- 👥 **Peer information display** with connection details
- 📱 **Mobile-friendly** responsive layout

### Advanced Features
- 🔄 **Real-time WebSocket communication**
- 🛡️ **Network restriction detection** and graceful fallback
- 📁 **File upload handling** with drag & drop support
- 🗑️ **Confirmation dialogs** for destructive actions
- 📈 **Download statistics** (speed, pieces, peers)
- 🔧 **Error handling** and user feedback

## 🏗️ Architecture

```
Frontend (React) ←→ WebSocket ←→ Backend (Node.js) ←→ TCP/UDP ←→ BitTorrent Network
```

### Frontend Components
- **React SPA** with modern hooks and state management
- **Socket.IO client** for real-time communication
- **Responsive CSS-in-JS** styling with theme support

### Backend Services
- **Express.js server** with REST API endpoints
- **Socket.IO server** for real-time updates
- **BitTorrent protocol implementation** with peer connections
- **File management** and cleanup utilities

## 📦 Installation

### Prerequisites
- Node.js 16+ and npm
- Modern web browser
- Network access (some corporate networks may block BitTorrent)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mytorrent.git
   cd mytorrent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

The backend will run on port 3001, and the frontend on port 3000.

## 🚀 Usage

### Adding Torrents

#### Method 1: Torrent Files
1. Click the "📁 Torrent File" tab
2. Select a .torrent file from your computer
3. The client will parse the file and contact trackers

#### Method 2: Magnet Links
1. Click the "🧲 Magnet Link" tab
2. Paste a magnet link (e.g., `magnet:?xt=urn:btih:...`)
3. Click "Add Magnet" to start the download

### Managing Downloads
- **Pause**: Click the "⏸️ Pause" button to pause active downloads
- **Resume**: Click the "▶️ Resume" button to resume paused downloads
- **Remove**: Click the "🗑️ Remove" button and confirm to delete torrents
- **View Peers**: Expand the peer section to see connected peers

### Theme Switching
Click the theme toggle icon (🌙/☀️) in the header to switch between dark and light modes.

## 🔧 Technical Implementation

### BitTorrent Protocol Components

#### 1. Torrent Parser (`torrent-parser.js`)
```javascript
// Parses .torrent files using bencode format
const torrentInfo = parseTorrent(filePath);
// Extracts: announce URL, file info, piece hashes, info hash
```

#### 2. Magnet Parser (`magnet-parser.js`)
```javascript
// Parses magnet links with support for:
// - Hex encoded hashes (40 characters)
// - Base32 encoded hashes (32 characters)
// - Multiple tracker URLs
// - File size and name extraction
```

#### 3. Tracker Communication (`tracker.js`, `udp-tracker.js`)
```javascript
// HTTP Tracker Protocol
const trackerResponse = await announceToHTTPTracker(torrent);

// UDP Tracker Protocol (more efficient)
const udpResponse = await announceToUDPTracker(trackerUrl, torrent);
```

#### 4. Peer Manager (`peer-manager.js`)
```javascript
// Handles TCP connections to peers
// Implements BitTorrent handshake protocol
// Manages piece requests and downloads
class PeerManager {
  connectToPeer(peer, io)     // Establish TCP connection
  handlePeerMessage(data)     // Process BitTorrent messages
  requestPieces(peer)         // Request file pieces
  handlePieceData(piece)      // Process downloaded pieces
}
```

#### 5. Download Manager (`download-manager.js`)
```javascript
// Coordinates downloads and peer connections
// Manages download state and progress
// Handles pause/resume/remove operations
class DownloadManager {
  startDownload(torrent)      // Initialize download
  pauseDownload(id)          // Pause active download
  resumeDownload(id)         // Resume paused download
  removeDownload(id)         // Remove torrent
}
```

### Frontend Architecture

#### State Management
```javascript
// React hooks for state management
const [torrents, setTorrents] = useState([]);
const [downloads, setDownloads] = useState({});
const [darkMode, setDarkMode] = useState(false);
```

#### WebSocket Communication
```javascript
// Real-time updates from backend
socket.on('download-progress', updateProgress);
socket.on('download-complete', handleComplete);
socket.on('torrent-added', addTorrent);
```

#### Theme System
```javascript
// Dynamic theming with CSS-in-JS
const theme = darkMode ? darkTheme : lightTheme;
// Smooth transitions between themes
```

## 📡 API Endpoints

### REST API
- `POST /api/torrent` - Upload .torrent file
- `POST /api/magnet` - Add magnet link
- `POST /api/download/:id/pause` - Pause download
- `POST /api/download/:id/resume` - Resume download
- `DELETE /api/download/:id` - Remove download
- `GET /api/health` - Server health check

### WebSocket Events
- `torrent-added` - New torrent added
- `download-progress` - Progress updates
- `download-complete` - Download finished
- `download-paused` - Download paused
- `download-resumed` - Download resumed
- `download-removed` - Torrent removed
- `download-error` - Error occurred

## 🗂️ Project Structure

```
mytorrent/
├── backend/
│   ├── server.js              # Express server & API routes
│   ├── torrent-parser.js      # .torrent file parser
│   ├── magnet-parser.js       # Magnet link parser
│   ├── tracker.js             # HTTP/UDP tracker client
│   ├── udp-tracker.js         # UDP tracker implementation
│   ├── peer-manager.js        # Peer connection manager
│   ├── download-manager.js    # Download coordination
│   └── package.json           # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   └── index.js          # React entry point
│   ├── public/
│   │   └── index.html        # HTML template
│   └── package.json          # Frontend dependencies
├── lessons/                   # Learning documentation
├── package.json              # Workspace configuration
└── README.md                 # This file
```

## 🔍 BitTorrent Protocol Details

### Handshake Process
1. **Connect** to peer via TCP
2. **Send handshake** with protocol identifier and info hash
3. **Receive handshake** response from peer
4. **Exchange bitfield** messages (which pieces each peer has)
5. **Send interested** message to indicate desire to download
6. **Wait for unchoke** message from peer
7. **Request pieces** in 16KB blocks
8. **Verify pieces** using SHA-1 hashes

### Message Types
- `choke/unchoke` - Flow control
- `interested/not interested` - Interest indication
- `have` - Piece availability announcement
- `bitfield` - Complete piece availability map
- `request` - Request for piece block
- `piece` - Piece data transfer
- `cancel` - Cancel previous request

### Tracker Protocol
#### HTTP Tracker Request
```
GET /announce?info_hash=...&peer_id=...&port=6881&uploaded=0&downloaded=0&left=1048576
```

#### UDP Tracker Protocol
1. **Connect** request with protocol ID
2. **Announce** request with torrent info
3. **Receive** peer list response

## 🌐 Network Considerations

### Firewall & NAT
- Most corporate/school networks block BitTorrent traffic
- UDP trackers may be blocked more than HTTP trackers
- The client gracefully handles network restrictions
- Shows appropriate error messages when blocked

### Port Usage
- **Backend server**: 3001 (HTTP/WebSocket)
- **Frontend dev server**: 3000 (React)
- **BitTorrent protocol**: 6881 (configurable)

## 🛠️ Development

### Adding New Features
1. **Backend changes**: Add to appropriate service file
2. **API endpoints**: Update `server.js` with new routes
3. **Frontend updates**: Add UI components and state management
4. **WebSocket events**: Add real-time communication if needed

### Testing
```bash
# Test with legal torrents
# Linux distributions (Ubuntu, Debian)
# Creative Commons content
# Open source software releases
```

### Debugging
- Check browser console for frontend errors
- Monitor backend terminal for protocol messages
- Use network tab to inspect API calls
- WebSocket messages show real-time communication

## 🚨 Legal Notice

This BitTorrent client is designed for:
- ✅ **Legal content distribution** (Linux ISOs, open source software)
- ✅ **Educational purposes** (learning P2P protocols)
- ✅ **Personal use** with legally obtained content

**Important**: Users are responsible for ensuring their use complies with local laws and regulations. Do not use this software for downloading copyrighted material without permission.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for:
- Bug fixes
- Feature enhancements
- Documentation improvements
- Performance optimizations

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **BitTorrent Protocol Specification** - Bram Cohen's original design
- **React Team** - For the excellent frontend framework
- **Node.js Community** - For the robust backend platform
- **Socket.IO** - For real-time communication capabilities

## 📞 Support

If you encounter issues:
1. Check the [Issues](https://github.com/yourusername/mytorrent/issues) page
2. Review the troubleshooting section above
3. Create a new issue with detailed information

---

**Built with ❤️ by [Your Name]**

*A modern take on peer-to-peer file sharing with web technologies*