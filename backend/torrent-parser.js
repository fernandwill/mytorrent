const bencode = require("bncode");
const crypto = require("crypto");
const fs = require("fs");

function parseTorrent(torrentPath) {
    const torrentFile = fs.readFileSync(torrentPath);
    const torrent = bencode.decode(torrentFile);

return {
    announce: torrent.announce.toString("utf8"),
    name: torrent.info.name.toString("utf8"),
    length: torrent.info.length,
    pieceLength: torrent.info["piece length"],
    pieces: torrent.info.pieces,
    infoHash: crypto.createHash("sha1").update(bencode.encode(torrent.info)).digest()    
    };
}

module.exports = {parseTorrent};