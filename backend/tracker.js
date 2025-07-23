const crypto = require("crypto");
const bencode = require("bncode");

class TrackerClient {
    constructor() {
    // Generate a unique peer ID for our client
    this.peerId = this.generatePeerId();
    this.port = 6881; // Standard BitTorrent port
}

generatePeerId() {
    // Create a 20-byte peer ID starting with our client identifier
    const prefix = "-MT0001-"; // MyTorrent version 0.0.1
    const random = crypto.randomBytes(12).toString("hex");
    return Buffer.from(prefix + random);
}

buildTrackerUrl(torrent, event = "started") {
    const params = new URLSearchParams({
        info_hash: torrent.infoHash.toString("binary"),
        peer_id: this.peerId.toString("binary"),
        port: this.port,
        uploaded: 0,
        downloaded: 0,
        left: torrent.length,
        compact: 1,
        event: event
    });

    return `${torrent.announce}?${params}`;
}

async announceToTracker(torrent) {
    try {
        const url = this.buildTrackerUrl(torrent);
        console.log("Contacting tracker: ", torrent.announce);

        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const trackerResponse = bencode.decode(Buffer.from(buffer));

        return this.parseTrackerResponse(trackerResponse);
    } catch (error) {
        console.error("Tracker communication failed: ", error);
        throw error;
    }
}

parseTrackerResponse(response) {
    const result = {
        interval: response.interval,
        complete: response.complete || 0,
        incomplete: response.incomplete || 0,
        peers: []
    };

    if (response.peers) {
        // Handle compact peer format (6 byte per peer: 4 for IP, 2 for port)
        if (Buffer.isBuffer(response.peers)) {
            for (let i = 0; i < response.peers.length; i += 6) {
                const ip = Array.from(response.peers.slice(i, i + 4)).join(".");
                const port = response.peers.readUInt16BE(i + 4);
                result.peers.push({ip, port});
            }
        }
    }

    return result;
    }
}

module.exports = TrackerClient;
