const crypto = require("crypto");

function parseMagnetLink(magnetUri) {
    if (!magnetUri.startsWith("magnet:?")) {
        throw new Error("Invalid magnet link format.");
    }

    const url = new URL(magnetUri);
    const params = url.searchParams;

    // Extract info hash from xt parameter
    const xt = params.get("xt");
    if (!xt || !xt.startsWith("urn:btih:")) {
        throw new Error("Missing or invalid info hash in magnet link.");
    }

    const hashString = xt.replace("urn:btih:", "");
    let infoHash;

    // Handle both hex and base32 encoded hashes
    if (hashString.length === 40) {
        // Hex encoded (40 chars)
        infoHash = Buffer.from(hashString, "hex");
    } else if (hashString.length === 32) {
        // Base32 encoded (32 chars) - convert to hex first
        infoHash = Buffer.from(base32Decode(hashString));
    } else {
        throw new Error ("Invalid info hash length.");
    }

    // Extract other parameters
    const displayName = params.get("dn") || "Unknown";
    const trackers = params.getAll("tr");
    const exactLength = params.get("xl") ? parseInt(params.get("xl")) : null;

    // Create torrent-like object
    const torrentInfo = {
        announce: trackers[0] || "http://tracker.opentracker.org:1337/announce",
        name: decodeURIComponent(displayName.replace(/\+/g, " ")),
        length: exactLength || 1048576, // Default to 1MB if not specified
        pieceLength: 32768, // 32KB pieces
        pieces: Buffer.alloc(20), // Mock piece hash for now
        infoHash: infoHash,
        isMagnet: true,
        trackers: trackers
    };

    return torrentInfo;
}

// Simple base32 decoder (for magnet links)
function base32Decode(str) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";

    // Convert each character to 5-bit binary
    for (let i = 0; i < str.length; i++) {
        const char = str[i].toUpperCase();
        const index = alphabet.indexOf(char);
        if (index === -1) continue;
        bits += index.toString(2).padStart(5, "0");
    }

    // Convert bits to bytes
    const butes = [];
    for (let i = 0; i < bits.length; i += 8) {
        if (i + 8 <= bits.length) {
            bytes.push(parseInt(bits.substr(i, 8), 2));
        }
    }

    return Buffer.from(bytes);
}

module.exports = {parseMagnetLink};