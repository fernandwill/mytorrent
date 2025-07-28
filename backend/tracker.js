const crypto = require('crypto');
const bencode = require('bncode');

class TrackerClient {
  constructor() {
    // Generate a unique peer ID for our client
    this.peerId = this.generatePeerId();
    this.port = 6881; // Standard BitTorrent port
  }

  generatePeerId() {
    // Create a 20-byte peer ID starting with our client identifier
    const prefix = '-MT0001-'; // MyTorrent version 0.0.1
    const random = crypto.randomBytes(12).toString('hex');
    return Buffer.from(prefix + random);
  }

  buildTrackerUrl(torrent, event = 'started') {
    // For magnet links, we need to use the infoHash directly
    const infoHash = torrent.infoHash;
    
    const params = new URLSearchParams();
    params.append('info_hash', infoHash.toString('binary'));
    params.append('peer_id', this.peerId.toString('binary'));
    params.append('port', this.port.toString());
    params.append('uploaded', '0');
    params.append('downloaded', '0');
    params.append('left', torrent.length.toString());
    params.append('compact', '1');
    params.append('event', event);

    return `${torrent.announce}?${params}`;
  }

  async announceToTracker(torrent) {
    try {
      const url = this.buildTrackerUrl(torrent);
      console.log('Contacting tracker:', torrent.announce);
      console.log('Tracker URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'MyTorrent/0.0.1'
        },
        timeout: 15000 // 15 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Tracker responded with status: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      const trackerResponse = bencode.decode(Buffer.from(buffer));
      
      console.log('Raw tracker response keys:', Object.keys(trackerResponse));
      
      return this.parseTrackerResponse(trackerResponse);
    } catch (error) {
      console.error('Tracker communication failed:', error.message);
      throw error;
    }
  }

  parseTrackerResponse(response) {
    const result = {
      interval: response.interval || 1800,
      complete: response.complete || 0,
      incomplete: response.incomplete || 0,
      peers: []
    };

    console.log('Tracker response interval:', result.interval);
    console.log('Seeders (complete):', result.complete);
    console.log('Leechers (incomplete):', result.incomplete);

    if (response.peers) {
      // Handle compact peer format (6 bytes per peer: 4 for IP, 2 for port)
      if (Buffer.isBuffer(response.peers)) {
        console.log('Processing compact peer list, length:', response.peers.length);
        for (let i = 0; i < response.peers.length; i += 6) {
          if (i + 6 <= response.peers.length) {
            const ip = Array.from(response.peers.slice(i, i + 4)).join('.');
            const port = response.peers.readUInt16BE(i + 4);
            result.peers.push({ ip, port });
          }
        }
      } else if (Array.isArray(response.peers)) {
        // Handle dictionary peer format
        console.log('Processing dictionary peer list');
        response.peers.forEach(peer => {
          if (peer.ip && peer.port) {
            result.peers.push({
              ip: peer.ip.toString(),
              port: peer.port
            });
          }
        });
      }
    }

    console.log(`Found ${result.peers.length} peers from tracker`);
    if (result.peers.length > 0) {
      console.log('First few peers:', result.peers.slice(0, 3));
    }

    return result;
  }
}

module.exports = TrackerClient;
