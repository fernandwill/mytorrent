const crypto = require('crypto');

function parseMagnetLink(magnetUri) {
  try {
    console.log('Step 1: Checking magnet URI format');
    if (!magnetUri.startsWith('magnet:?')) {
      throw new Error('Invalid magnet link format');
    }

    console.log('Step 2: Parsing URL');
    const url = new URL(magnetUri);
    const params = url.searchParams;
    
    console.log('Step 3: Extracting xt parameter');
    const xt = params.get('xt');
    console.log('xt parameter:', xt);
    
    if (!xt || !xt.startsWith('urn:btih:')) {
      throw new Error('Missing or invalid info hash in magnet link');
    }
    
    console.log('Step 4: Processing hash string');
    const hashString = xt.replace('urn:btih:', '');
    console.log('Hash string:', hashString, 'Length:', hashString.length);
    
    let infoHash;
    
    console.log('Step 5: Detecting hash format');
    if (isHexString(hashString)) {
      console.log('Detected hex hash:', hashString);
      const paddedHash = hashString.padStart(40, '0');
      console.log('Padded hash:', paddedHash);
      infoHash = Buffer.from(paddedHash, 'hex');
      console.log('Created infoHash buffer, length:', infoHash.length);
    } else if (hashString.length === 32 && isBase32String(hashString)) {
      console.log('Detected base32 hash:', hashString);
      infoHash = base32Decode(hashString);
      console.log('Created infoHash buffer, length:', infoHash.length);
    } else {
      throw new Error(`Invalid info hash format: ${hashString}. Must be hex (32-40 chars) or base32 (32 chars).`);
    }

    console.log('Step 6: Extracting other parameters');
    const displayName = params.get('dn');
    console.log('Display name param:', displayName);
    
    const trackers = params.getAll('tr');
    console.log('Trackers:', trackers);
    
    const exactLength = params.get('xl');
    console.log('Exact length param:', exactLength);
    
    console.log('Step 7: Creating torrent info');
    const fileSize = exactLength ? parseInt(exactLength) : 1048576;
    console.log('File size:', fileSize);
    
    const pieceLength = 32768;
    const totalPieces = Math.ceil(fileSize / pieceLength);
    console.log('Total pieces calculated:', totalPieces);
    
    const piecesBuffer = Buffer.alloc(totalPieces * 20);
    console.log('Pieces buffer created, length:', piecesBuffer.length);
    
    const torrentInfo = {
      announce: trackers[0] || 'http://tracker.opentrackr.org:1337/announce',
      name: displayName ? decodeURIComponent(displayName.replace(/\+/g, ' ')) : 'Unknown',
      length: fileSize,
      pieceLength: pieceLength,
      pieces: piecesBuffer,
      infoHash: infoHash,
      isMagnet: true,
      trackers: trackers
    };
    
    console.log('Step 8: Torrent info created successfully');
    console.log('Final torrent info:', {
      name: torrentInfo.name,
      length: torrentInfo.length,
      piecesLength: torrentInfo.pieces.length,
      infoHashLength: torrentInfo.infoHash.length
    });
    
    return torrentInfo;
    
  } catch (error) {
    console.error('Error in parseMagnetLink:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Helper function to check if string is valid hex
function isHexString(str) {
  return /^[0-9A-Fa-f]+$/.test(str) && str.length >= 32 && str.length <= 40;
}

// Helper function to check if string is valid base32
function isBase32String(str) {
  return /^[A-Z2-7]+$/.test(str.toUpperCase());
}

// Base32 decoder
function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i].toUpperCase();
    const index = alphabet.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    bits += index.toString(2).padStart(5, '0');
  }
  
  const byteArray = [];
  for (let i = 0; i < bits.length; i += 8) {
    if (i + 8 <= bits.length) {
      byteArray.push(parseInt(bits.substr(i, 8), 2));
    }
  }
  
  return Buffer.from(byteArray);
}

module.exports = { parseMagnetLink };
