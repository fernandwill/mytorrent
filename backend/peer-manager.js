const crypto = require("crypto");
const net = require("net");

class PeerManager {
    constructor(torrent, downloadManager) {
        console.log("PeerManager constructor called.");
        console.log("Torrent object: ", torrent ? "exists" : "undefined");
        console.log("Torrent pieces: ", torrent && torrent.pieces ? `length: ${torrent.pieces.length}` : "undefined");

        if (!torrent) {
            throw new Error("Torrent object is required.");
        } 

        if (!torrent.pieces) {
            throw new Error("Torrent pieces data is missing");
        }

        this.torrent = torrent;
        this.downloadManager = downloadManager;
        this.peers = new Map(); // Store active peer connections
        this.pieces = new Array(Math.cell(torrent.pieces.length / 20)).fill(false);
        this.pendingRequests = new Map(); // Track pieces requests
        this.downloadPieces = 0;

        console.log("PeerManager initialized succesfully.");
        console.log("Total pieces: ", this.pieces.length);
    }

    // BitTorrent handshake message
    createHandshake() {
        const protocolLength = Buffer.from([19]);
        const protocol = Buffer.from("BitTorrent protocol");
        const reserved = Buffer.alloc(8);
        const infoHash = this.torrent.infoHash;
        const peerId = Buffer.from("-MT0001" + crypto.randomBytes(12).toString("hex").slice(0, 12));

        return Buffer.concat([protocolLength, protocol, reserved, infoHash, peerId]);
    }

    // Connect to a peer
    connectToPeer(peer, io) {
        const socket = new net.Socket();
        const peerKey = `${peer.ip}:${peer.port}`;

        console.log(`Connecting to peer: ${peerKey}`);

        socket.setTimeout(10000); // 10 seconds to timeout

        socket.connect(peer.port, peer.ip, () => {
            console.log(`Connected to peer: ${peerKey}`);

            // Send handshake
            const handshake = this.createHandshake();
            socket.write(handshake);

            this.peers.set(peerKey, {
                socket,
                peer,
                handshakeReceived: false,
                choked: true,
                interested: false,
                pieces: new Set()
            });
        });

        socket.on("data", (data) => {
            this.handlePeerMessage(peerKey, data, io);
        });

        socket.on("error", (error) => {
            console.log(`Peer connection error ${peerKey}`, error.message);
            this.peers.delete(peerKey);
        });

        socket.on("timeout", (error) => {
            console.log(`Peer connection timeout: ${peerKey}`);
            socket.destroy();
            this.peers.delete(peerKey);
        });

        socket.on("close", () => {
            console.log(`Peer connection closed: ${peerKey}`);
            this.peers.delete(peerKey);
        });
    }

    // Handle incoming peer messages
    handlePeerMessage(peerKey, data, io) {
        const peerConnection = this.peers.get(peerKey);
        if (!peerConnection) return;

        try {
            if (!peerConnection.handshakeReceived) {
                // Handle handshake response
                if (data.length >= 68) {
                    console.log(`Handshake received from ${peerKey}`);
                    peerConnection.handshakeReceived = true;

                    // Send interested message
                    this.sendInterestedMessage(peerConnection.socket);

                    // Process any remaining data after handshake
                    if (data.length > 68) {
                        this.processMessages(data.slice(68), peerConnection, io);
                    }
                }
            } else {
                this.processMessages(data, peerConnection, io);
            }
        } catch (error) {
            console.error(`Error handling peer message from ${peerKey}:`, error);
        }
    }

    // Process BitTorrent protocol messages
    processMessages(data, peerConnection, io) {
        let offset = 0;

        while (offset < data.length) {
            if (offset + 4 > data.length) break;

            const messageLength = data.readUInt32BE(offset);
            if (messageLength === 0) {
                offset += 4;
                continue;
            }

            if (offset + 4 + messageLength > data.length) break;

            const messageId = data.readUInt32BE(offset + 4);
            const messageData = data.slice(offset + 5, offset + 4 + messageLength);

            this.handleMessage(messageId, messageData, peerConnection, io);

            offset += 4 + messageLength;
        }
    }

    // Handle specific message types 
    handleMessage(messageId, data, peerConnection, io) {
        const peerKey = `${peerConnection.peer.ip}:${peerConnection.peer.port}`;

        switch (messageId) {
            // choke
            case 0: 
                console.log(`Peer ${peerKey} choked us`);
                peerConnection.choked = true;
                break;

            // unchoke
            case 1:
                console.log(`Peer ${peerKey} unchoked us`);
                peerConnection.choked = false;
                break;

            // have
            case 4:
                if (data.length >= 4) {
                    const pieceIndex = data.readUInt32BE(0);
                    peerConnection.pieces.add(pieceIndex);
                    console.log(`Peer ${peerKey} has piece ${pieceIndex}`);
                }
                break;
            
            // bitfield
            case 5:
                console.log(`Received bitfiend from ${peerKey}`);
                this.parseBitfield(data, peerConnection);
                break;

            // piece
            case 7:
            if (data.length >= 8) {
                const pieceIndex = data.readUInt32BE(0);
                const blockOffset = data.readUInt32BE(4);
                const blockData = data.slice(8);

                console.log(`Received piece ${pieceIndex} block from ${peerKey}`);
                this.handlePieceData(pieceIndex, blockOffset, blockData, io);
            }
            break;

            default:
                console.log(`Unknown message type ${messageId} from${peerKey}`);
                
        }
    }

    // Send interested message
    sendInterestedMessage(socket) {
        const message = Buffer.alloc(5);
        message.writeUInt32BE(1, 0); // length
        message.writeUInt8(2, 4); // Interested message id
        socket.write(message);
    }

    // Parse bitfield message
    parseBitfield(data, peerConnection) {
        for (let i = 0; i < data.length; i++) {
            const byte = data[i];
            for (let bit = 0; bit < 8; bit++) {
                const pieceIndex = i * 8 + bit;
                if (pieceIndex < this.pieces.length && (byte & (1 << (7 - bit)))) {
                    peerConnection.pieces.add(pieceIndex);
                }
            }
        }
        
        console.log(`Peer has ${peerConnection.pieces.size} pieces`);
    }

    // Request pieces from peer
    requestPieces(peerConnection, io) {
        if (peerConnection.choked) return;

        // Find pieces we need that this peer has
        for (let i = 0; i < this.pieces.length; i++) {
            if (!this.pieces[i] && peerConnection.pieces.has(i)) {
                this.requestPieces(i, peerConnection);
                break; // Request one piece at a time for simplicity
            }
        }
    }

    // Request a specific piece 
    requestPiece(pieceIndex, peerConnection) {
        const pieceLength = this.torrent.pieceLength;
        const blockSize = 16384; // 16KB blocks

        for (let offset = 0; offset < pieceLength; offset += blockSize) {
            const length = Math.min(blockSize, pieceLength - offset);

            const message = Buffer.alloc(17);
            message.writeUInt32BE(13, 0); // length
            message.writeUInt8(6, 4); // request message id
            message.writeUInt32BE(pieceIndex, 5); 
            message.writeUInt32BE(offset, 9); 
            message.writeUInt32BE(length, 13);
            
            peerConnection.socket.write(message);
        }

        console.log(`Requested piece ${pieceIndex}`);
    }

    // Handle received piece data
    handlePieceData(pieceIndex, blockOffset, blockData, io) {
        // For now, just mark piece as downloaded
        // In full implementation hash will be verified and be able to write to file.

        if (!this.pieces[pieceIndex]) {
            this.pieces[pieceIndex] = true;
            this.downloadedPieces++;

            const progress = Math.round((this.downloadedPieces / this.pieces.length) * 100);

            console.log(`Download piece ${pieceIndex}, progress: ${progress}%`);

            // Emit progress update
            io.emit("download-progress", {
                downloadId: this.torrent.downloadId, 
                progress,
                downloadedPieces: this.downloadedPieces,
                totalPieces: this.pieces.length,
                downloadSpeed: Math.floor(Math.random() * 500) + 100,
                status: progress === 100 ? "completed" : "downloading"
            });

            if (progress === 100) {
                io.emit("download-complete", {
                    downloadId: this.torrent.downloadId,
                    torrent: this.torrent
                });
            }
        }
    }

    // Start connecting to peers
    startDownload(io) {
        console.log(`Starting download for ${this.torrent.name}`);
        console.log(`Connecting to ${this.torrent.peers.length} peers`);

        // Connect to first few peers (limit concurrent connections)
        const maxConnections = Math.min(5, this.torrent.length);
        for (let i = 0; i < maxConnections; i++) {
            setTimeout(() => {
                this.connectToPeer(this.torrent.peers[i], io);
            }, i * 1000); // Stagger connections
        }
    }

    // Stop all peer connections
    stopDownload() {
        console.log("Stopping peer connections.");
        for (const [peerKey, peerConnection] of this.peers) {
            peerConnection.socket.destroy();
        }
        this.peers.clear();
    }
}

module.exports = PeerManager;