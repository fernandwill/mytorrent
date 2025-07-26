class DownloadManager {
    constructor() {
        this.activeTorrents = new Map();
        this.downloadIntervals = new Map(); // Track intervals for each
    }

    startDownload(torrent, io, providedDownloadId = null) {
        const downloadId = providedDownloadId || torrent.infoHash.toString("hex");

        if (this.activeTorrents.has(downloadId)) {
            console.log("Download already exists for this torrent.");
            return;
        }

        const totalPieces = torrent.pieces.length / 20;
        const downloadState = {
            torrent,
            totalPieces,
            downloadedPieces: 0,
            pieces: new Array(totalPieces).fill(false),
            peers: torrent.peers || [],
            progress: 0,
            downloadSpeed: 0,
            status: "downloading"
        };

        this.activeTorrents.set(downloadId, downloadState);
        this.simulateDownload(downloadId, io);

        console.log(`Started download simulation for ${torrent.name}`);
    }

    pauseDownload(downloadId, io) {
        const downloadState = this.activeTorrents.get(downloadId);
        if (!downloadState) {
            console.log("Download not found: ", downloadId);
            return false;
        }

        if (downloadState.status !== "downloading") {
            console.log("Download is not in downloading state: ", downloadState.status);
            return false;
        }

        // Clear the interval
        const interval = this.downloadIntervals.get(downloadId);
        if (interval) {
            clearInterval(interval);
            this.downloadIntervals.delete(downloadId);
        }

        // Update status
        downloadState.status = "paused";
        downloadState.downloadSpeed = 0;

        // Emit pause event
        io.emit("download-paused", {
            downloadId,
            status: "paused"
        });

        console.log(`Paused downloa for ${downloadState.torrent.name}`);
        return true;
    }

    resumeDownload(downloadId, io) {
        const downloadState = this.activeTorrents.get(downloadId);
        if (!downloadState) {
            console.log("Download not found: ", downloadId);
            return false;
        }

        if (downloadState.status !== "paused") {
            console.log("Download is not paused: ", downloadState.status);
            return false;
        }

        // Update status and restart simulation
        downloadState.status = "downloading";
        this.simulationDownload(downloadId, io);

        // Emit resume event
        io.emit("download-resumed", {
            downloadId,
            status: "downloading"
        });

        console.log(`Resumed download for ${downloadState.torrent.name}`);
        return true;
    }

    simulateDownload(downloadId, io) {
        const downloadState = this.activeTorrents.get(downloadId);
        if (!downloadState) return;

        const interval = setInterval(() => {
            if (downloadState.downloadedPieces >= downloadState.totalPieces) {
                downloadState.status = "completed";
                downloadState.progress = 100;
                downloadState.downloadSpeed = 0;

                io.emit("download-complete", {downloadId, torrent: downloadState.torrent});
                clearInterval(interval);
                this.downloadIntervals.delete(downloadId);
                return;
            }

            // Only continue if still downloading
            if (downloadState.status !== "downloading") {
                clearInterval(interval);
                this.downloadIntervals.delete(downloadId);
                return;
            }

            // Simulate downloading 1-3 pieces per second
            const piecesToDownload = Math.min(
                Math.floor(Math.random() * 3) + 1,
                downloadState.totalPieces - downloadState.downloadedPieces
            );

            for (let i = 0; i < piecesToDownload; i++) {
                const nextPieceIndex = downloadState.pieces.findIndex(piece => !piece);
                if (nextPieceIndex !== -1) {
                    downloadState.pieces[nextPieceIndex] = true;
                    downloadState.downloadedPieces++;
                }
            }

            downloadState.progress = Math.round((downloadState.downloadedPieces / downloadState.totalPieces) * 100);
            downloadState.downloadSpeed = Math.floor(Math.random() * 500) * 100; // 100-600 KB/s

            // Emit progress update
            io.emit("download-progress", {
                downloadId,
                progress: downloadState.progress,
                downloadedPieces: downloadState.downloadedPieces,
                totalPieces: downloadState.totalPieces,
                downloadSpeed: downloadState.downloadSpeed,
                status: downloadState.status
            });
        }, 1000); // Updates every second

        // Store the interval reference 
        this.downloadIntervals.set(downloadId, interval);
        }

        getDownloadState(downloadId) {
            return this.activeTorrents.get(downloadId);
        }

        getAllDownloads() {
            return Array.from(this.activeTorrents.entries()).map(([id, state]) => ({
                downloadId: id,
                ...state
            }));
        }
    }


module.exports = DownloadManager;