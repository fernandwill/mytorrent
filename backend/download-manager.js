class DownloadManager {
    constructor() {
        this.activeTorrents = new Map();
    }

    startDownload(torrent, io) {
        const downloadId = torrent.infoHash.toString("hex");

        if (this.activeTorrents.has(downloadId)) {
            console.log("Download already active for this torrent.");
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

    simulateDownload(downloadId, io) {
        const downloadState = this.activeTorrents.get(downloadId);
        if (!downloadState) return;

        const interval = setInterval(() => {
            if (downloadState.downloadedPieces >= downloadState.totalPieces) {
                downloadState.status = "completed";
                downloadState.progress = 100;
                io.emit("download-complete", {downloadId, torrent: downloadState.torrent});
                clearInterval(interval);
                return;
            }

            // Simulate downloading 1-3 pieces per second
            const piecesToDownload = Math.min(
                Math.floor(Math.random() * 3) + 1,
                downloadState.totalPieces - downloadState.downloadedPieces
            );

            for (let i = 0; i < piecesToDownload; i++) {
                // Find next piece to download
                const nextPieceIndex = downloadState.pieces.findIndex(piece => !piece);
                    if (nextPieceIndex !== -1) {
                        downloadState.pieces[nextPieceIndex] = true;
                        downloadState.downloadedPieces++;
                    }
                }

                downloadState.progress = Math.round((downloadState.downloadedPieces / downloadState.totalPieces) * 100);
                downloadState.downloadSpeed = Math.floor(Math.random() * 500) + 100; // 100-600 KB/s

                // Emit progress update
                io.emit("download-progress", {
                    downloadId,
                    progress: downloadState.progress,
                    downloadedPieces: downloadState.downloadedPieces,
                    totalPieces: downloadState.downloadSpeed,
                    status: downloadState.status
                });

            }, 1000); // Update every second
    }

    getDownloadState(downloadId) {
        return this.activeTorrents.get(downloadId);
    }
}

module.exports = DownloadManager;