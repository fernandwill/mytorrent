const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const {parseTorrent} = require("./torrent-parser");
const multer = require("multer");
const cors = require("cors");
const TrackerClient = require("./tracker");
const DownloadManager = require("./download-manager");

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
app.use(express.json());

app.use(cors({
    origin: "http://localhost:3000"
}));

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

server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});