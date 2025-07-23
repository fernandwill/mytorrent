# BitTorrent Protocol Basics

## What is BitTorrent?
BitTorrent is a peer-to-peer (P2P) file sharing protocol. Instead of downloading a file from one central server, you download pieces from multiple peers simultaneously.

## Key Components

### 1. Torrent Files (.torrent)
- Contains metadata about the files to be shared
- Includes tracker URLs, file names, sizes, and cryptographic hashes
- Uses a format called "bencode" (similar to JSON but more compact)

### 2. Trackers
- Servers that help peers find each other
- Maintain lists of peers downloading/uploading the same torrent
- Peers periodically contact trackers to announce their presence

### 3. Peers
- Other BitTorrent clients downloading/uploading the same files
- Each peer has pieces of the file(s)
- Peers exchange pieces directly with each other

### 4. Pieces and Blocks
- Files are split into pieces (typically 256KB - 1MB each)
- Pieces are further split into blocks (typically 16KB each)
- Each piece has a SHA-1 hash for verification

## Our Architecture
Since browsers can't do raw networking, we'll build:

**Frontend (React):**
- User interface for adding torrents
- Progress tracking and file management
- Peer and download statistics

**Backend (Node.js):**
- Torrent file parsing
- Tracker communication
- Peer connections and data exchange
- File assembly and storage

**Communication:**
- WebSocket connection between frontend and backend
- REST API for basic operations

## Next Steps
We'll start by building the torrent file parser to understand the data structure, then move on to the React frontend for displaying torrent information.