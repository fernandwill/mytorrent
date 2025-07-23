const bencode = require("bncode");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Create a simple test file
const testContent = "Hello MyTorrent! This is a test file for our client.";
const testFilename = "test.txt";
const testFilepath = path.join(__dirname, testFilename);

// Write the test file
fs.writeFileSync(testFilepath, testContent);

// Calculate file info
const fileBuffer = fs.readFileSync(testFilepath);
const pieceLength = 32768; // 32kB pieces (small for testing)
const pieces = [];

// Split file into pieces and hash each piece
for (let i = 0; i < fileBuffer.length; i += pieceLength) {
    const piece = fileBuffer.slice(i, i + pieceLength);
    const hash = crypto.createHash("sha1").update(piece).digest(); 
    pieces.push(hash);
}

// Create torrent structure
const torrent = {
    announce: Buffer.from("http://tracker.opentrackr.org:1337/announce"),
    
    info: {
        name: Buffer.from(testFilename),
        length: fileBuffer.length,
        "piece length": pieceLength,
        pieces: Buffer.concat(pieces)
    }
};

// Encode and save torrent file
const torrentData = bencode.encode(torrent);
fs.writeFileSync("test.torrent", torrentData);

console.log("Created test.torrent and test.txt");
console.log("File size: ", fileBuffer.length, "bytes");
console.log("Pieces: ", pieces.length);