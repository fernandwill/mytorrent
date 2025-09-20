# MyTorrent

A BitTorrent client built with React and Node.js featuring real peer-to-peer networking and a modern UI. The backend speaks to HTTP/UDP trackers, manages peer sessions, and streams progress to the React frontend over WebSockets.

## Features

- Parse .torrent files with bencode support
- Magnet link ingestion (hex and base32 hashes)
- HTTP and UDP tracker announce with multi-tracker fallback
- Real TCP peer connections and BitTorrent message handling
- Automatic piece requesting and progress reporting
- React frontend with dark/light theme, live updates, and download controls
- Pause, resume, and remove actions exposed via the UI and API
- Network diagnostics with graceful fallback messaging when peers are unreachable

## Installation

### Prerequisites
- Node.js 16+ and npm
- A network that allows outbound TCP/UDP on typical BitTorrent ports (e.g. 6881)

### Install dependencies
The project is split into separate frontend and backend packages. Install each one once:

```bash
# from the repo root
git clone https://github.com/yourusername/mytorrent.git
cd mytorrent

# install root helpers (concurrently, shared scripts)
npm install

# install backend deps
npm --prefix backend install

# install frontend deps
npm --prefix frontend install
```

### Running in development
Start both services (this keeps the backend on port 3001 and the frontend on 3000):

```bash
npm run dev            # spawns backend and frontend together
```

If you prefer separate terminals:

```bash
npm --prefix backend run dev   # nodemon backend/server.js
npm --prefix frontend start    # CRA dev server
```

Then open http://localhost:3000.

### Production build quickstart

```bash
npm --prefix frontend run build
npm --prefix backend start
```

Serve the `frontend/build` directory (e.g. with `serve`) or wire it behind a reverse proxy pointing at the backend API.

## Usage

### Adding torrents
- **Torrent file**: Use the *Torrent File* tab and upload a `.torrent`
- **Magnet link**: Use the *Magnet Link* tab and paste a magnet URI

### Managing downloads
- Pause/resume via the controls next to each torrent
- Remove deletes the torrent entry and stops peer sessions
- Expand a download to see peer/IP/port details and progress
- Theme toggle lives in the header (dark/light)

## Architecture overview

```
React frontend <-> Socket.IO <-> Node.js backend <-> TCP/UDP <-> BitTorrent peers
```

### Backend
- `server.js` – Express API + Socket.IO bridge
- `torrent-parser.js` – .torrent decoding and infoHash generation
- `magnet-parser.js` – Magnet URI parsing/validation
- `tracker.js` / `udp-tracker.js` – Tracker announce logic
- `peer-manager.js` – TCP peer sessions, message handling, piece requests
- `download-manager.js` – Tracks active downloads, state, and Socket.IO events

### Frontend
- `src/App.js` – Main React surface & routing of events
- Socket.IO client – Real-time link to backend state
- Components for torrent list, peer view, controls, and theming

## API quick reference

### REST
- `POST /api/torrent` – Upload a `.torrent`
- `POST /api/magnet` – Submit a magnet link
- `POST /api/download/:id/pause` – Pause a download
- `POST /api/download/:id/resume` – Resume a paused download
- `DELETE /api/download/:id` – Remove a download

### WebSocket events
- `torrent-added`
- `download-progress`
- `download-complete`
- `download-paused`, `download-resumed`, `download-removed`

## BitTorrent protocol notes

1. Backend performs the 19-byte handshake, validates infoHash, and exchanges bitfield/interested/unchoke messages.
2. Once unchoked, it requests pieces in 16 KB blocks and marks them complete as data arrives.
3. UDP tracker announces send connection id, peer id, and transfer stats so trackers return real peers.

## Networking tips

- Open outbound UDP/TCP (default peer port 6881) for best results.
- Some corporate or ISP networks block BitTorrent; the client will fall back to a waiting state but cannot force peers in that case.
- Firewalls performing deep packet inspection may still interfere; consider testing on an unrestricted network.

## Legal notice

Use MyTorrent only with content you have the legal right to share or download. Respect local laws regarding peer-to-peer traffic.

## License

MIT License – see `LICENSE` for details.
