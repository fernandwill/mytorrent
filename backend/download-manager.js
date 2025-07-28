const PeerManager = require("./peer-manager");

class DownloadManager {
  constructor() {
    this.activeTorrents = new Map();
    this.peerManagers = new Map();
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

    // Check if we have real peers to connect to
    if (torrent.peers && torrent.peers.length > 0 && this.hasValidPeers(torrent.peers)) {
      console.log(`Starting REAL download for ${torrent.name} with ${torrent.peers.length} peers`);
      this.startRealDownload(downloadId, torrent, io);
    } else {
      console.log(`No valid peers available for ${torrent.name}`);
      console.log(`This could be due to:`);
      console.log(`- Network blocking BitTorrent traffic`);
      console.log(`- Tracker connectivity issues`);
      console.log(`- No active seeders for this torrent`);
      
      // Set status to show it's ready but waiting for peers
      downloadState.status = "waiting_for_peers";
      io.emit("download-waiting", {
        downloadId,
        message: "Waiting for peers (network may be blocking BitTorrent traffic)"
      });
    }
  }

  // Check if we have valid peers (not mock/local IPs)
  hasValidPeers(peers) {
    const validPeers = peers.filter(peer => {
      return !peer.ip.startsWith('192.168.') && 
             !peer.ip.startsWith('10.0.') && 
             !peer.ip.startsWith('172.16.') &&
             !peer.ip.startsWith('127.') &&
             peer.ip !== 'localhost';
    });
    
    console.log(`Found ${validPeers.length} valid peers out of ${peers.length} total`);
    return validPeers.length > 0;
  }

  // Start real BitTorrent download
  startRealDownload(downloadId, torrent, io) {
    const torrentWithId = { ...torrent, downloadId };
    
    const peerManager = new PeerManager(torrentWithId, this);
    this.peerManagers.set(downloadId, peerManager);
    
    // Start connecting to peers
    peerManager.startDownload(io);
  }

  pauseDownload(downloadId, io) {
    const downloadState = this.activeTorrents.get(downloadId);
    if (!downloadState) {
      console.log("Download not found:", downloadId);
      return false;
    }

    if (downloadState.status !== "downloading") {
      console.log("Download is not in downloading state:", downloadState.status);
      return false;
    }

    // Stop real download if active
    const peerManager = this.peerManagers.get(downloadId);
    if (peerManager) {
      peerManager.stopDownload();
    }

    downloadState.status = "paused";
    downloadState.downloadSpeed = 0;

    io.emit("download-paused", {
      downloadId,
      status: "paused"
    });

    console.log(`Paused download for ${downloadState.torrent.name}`);
    return true;
  }

  resumeDownload(downloadId, io) {
    const downloadState = this.activeTorrents.get(downloadId);
    if (!downloadState) {
      console.log("Download not found:", downloadId);
      return false;
    }

    if (downloadState.status !== "paused" && downloadState.status !== "waiting_for_peers") {
      console.log("Download cannot be resumed from state:", downloadState.status);
      return false;
    }

    downloadState.status = "downloading";

    // Try to resume real download if we have valid peers
    if (this.hasValidPeers(downloadState.torrent.peers)) {
      this.startRealDownload(downloadId, downloadState.torrent, io);
    } else {
      downloadState.status = "waiting_for_peers";
      io.emit("download-waiting", {
        downloadId,
        message: "Still waiting for peers"
      });
      return false;
    }

    io.emit("download-resumed", {
      downloadId,
      status: "downloading"
    });

    console.log(`Resumed download for ${downloadState.torrent.name}`);
    return true;
  }

  removeDownload(downloadId, io) {
    const downloadState = this.activeTorrents.get(downloadId);
    if (!downloadState) {
      console.log("Download not found:", downloadId);
      return false;
    }

    // Stop real download if active
    const peerManager = this.peerManagers.get(downloadId);
    if (peerManager) {
      peerManager.stopDownload();
      this.peerManagers.delete(downloadId);
    }

    this.activeTorrents.delete(downloadId);

    io.emit("download-removed", {
      downloadId,
      torrentName: downloadState.torrent.name
    });

    console.log(`Removed download for ${downloadState.torrent.name}`);
    return true;
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
