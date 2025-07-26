const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const {parseTorrent} = require("./torrent-parser");
const multer = require("multer");
const cors = require("cors");
const TrackerClient = require("./tracker");
const DownloadManager = require("./download-manager");
const {parseMagnetLink} = require("./magnet-parser");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const tracker = new TrackerClient();

const downloadManager = new DownloadManager();

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    console.log("Headers: ", req.headers);
    console.log("Body: ", req.body);
    next();
});

const upload = multer({dest: "uploads/"});

app.post("/api/torrent", upload.single("torrent"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({error: "No torrent file uploaded."});
        }

        const torrentInfo = parseTorrent(req.file.path);
        console.log("Parsed torrent: ", torrentInfo);

        // Contact tracker to get peers
        try {
            const trackerResponse = await tracker.announceToTracker(torrentInfo);
            console.log("Tracker response: ", trackerResponse);

        // Generate download ID
        const downloadId = `torrent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const fullTorrentInfo = {
                ...torrentInfo,
                downloadId,
                peers: trackerResponse.peers,
                seeders: trackerResponse.complete,
                leechers: trackerResponse.incomplete,
                interval: trackerResponse.interval
            };

        // Broadcast to connected clients
        io.emit("torrent-added", fullTorrentInfo);
        downloadManager.startDownload(fullTorrentInfo, io);
        res.json(fullTorrentInfo);
        } catch (trackerError) {
            console.error("Tracker failed, using mock data for demonstration.");

            const downloadId = `torrent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Mock tracker response for demonstration
            const mockTorrentInfo = {
                ...torrentInfo,
                downloadId,
                peers: [
                    {ip: "192.168.1.100", port: 6881},
                    {ip: "10.0.0.50", port: 6882},
                    {ip: "172.16.0.25", port: 6883}
                ],
                seeders: 5,
                leechers: 12,
                interval: 1800
            };
            
            // Still return torrent info even if tracker fails
            downloadManager.startDownload(mockTorrentInfo, io, downloadId);
            io.emit("torrent-added", mockTorrentInfo);
            res.json(mockTorrentInfo);
        }
    } catch (error) {
        console.error("Error parsing torrent: ", error);
        res.status(500).json({error: "Failed to parse torrent file."});
    }
});

// Magnet link endpoint
app.post("/api/magnet", async (req, res) => {

    console.log("=== MAGNET ENDPOINT HIT ==="); 
    console.log("Received request body: ", req.body); 
    console.log("Magnet link from body: ", req.body.magnetLink); 

    try {
        const {magnetLink} = req.body;

        if (!magnetLink) {
            return res.status(400).json({error: "No magnet link provided"});
        }

        console.log("Processing magnet link: ", magnetLink);

        const torrentInfo = parseMagnetLink(magnetLink);
        console.log("Parsed magnet: ", torrentInfo);

        // Generate download ID
        const downloadId = `magnet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Add mock peer data (since we can't do real DHT)
        const magnetTorrentInfo = {
            ...torrentInfo,
            downloadId,
            peers: [
                {ip: "192.168.1.101", port: 6881},
                {ip: "10.0.0.51", port: 6882},
                {ip: "172.16.0.26", port: 6883},
                {ip: "203.0.113.10", port: 6884},
            ],
            seeders: 8,
            leechers: 15,
            interval: 1800
        };

        // Start download simulation
        downloadManager.startDownload(magnetTorrentInfo, io, downloadId);

        io.emit("torrent-added", magnetTorrentInfo);
        res.json(magnetTorrentInfo);
    } catch (error) {
        console.error("Error processing magnet link: ", error);
        res.status(500).json({error: "Failed to process magnet link: " + error.message});
    }
});

app.post("/api/download/:torrentId", (req, res) => {
    const torrentId = req.params.torrentId;

    // In real implementation, look up torrent by ID
    // Using recently uploaded torrent for now
    // Its possible to store torrents in a database or memory, we'll PostgreSQL later

    res.json({message: "Download started:", torrentId});
})

// Basic route
app.get("/api/health", (req, res) => {
    res.json({status: "Server is running!"});
});

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log("Frontend connected: ", socket.id);

    socket.on("disconnect", () => {
        console.log("Frontend disconnected: ", socket.id);
    });
});

// Remove download endpoint
app.delete("/api/download/:downloadId", (req, res)=> {
    const {downloadId} = req.params;

    // Get download state before removing to access file info
    const downloadState = downloadManager.getDownloadState(downloadId);

    const success = downloadManager.removeDownload(downloadId, io);

    if (success) {
        // Delete torrent files if exists
        if (downloadState && !downloadState.torrent.isMagnet) {
            const uploadsDir = path.join(__dirname, "uploads");
            if (fs.existsSync(uploadsDir)) {
                fs.readdir(uploadsDir, (err, files) => {
                    if (!err) {
                        files.forEach(file => {
                            const filePath = path.join(uploadsDir, file);
                            const stats = fs.statSync(filePath);
                            const now = new Date().getTime();
                            const fileTime = new Date(stats.mtime).getTime();

                            // Remove file older than 1 hour
                            if (now - fileTime > 36000000) {
                                fs.unlinkSync(filePath);
                                console.log("Cleaned up old upload file: ", file);
                            }
                        });
                    }
                });
            }
        }

            res.json({message: "Download removed.", downloadId});
        } else {
            res.status(400).json({error: "Failed to remove download"});
        }
    });

server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});