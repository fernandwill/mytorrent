const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

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