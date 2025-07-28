const crypto = require('crypto');
const bencode = require('bncode');
const UDPTracker = require('./udp-tracker');

class TrackerClient {
  constructor() {
    this.peerId = this.generatePeerId();
    this.port = 6881;
    this.udpTracker = new UDPTracker();
  }

  generatePeerId() {
    const prefix = '-MT0001-';
    const random = crypto.randomBytes(12).toString('hex');
    return Buffer.from(prefix + random);
  }

  async announceToTracker(torrent) {
    const trackerUrl = torrent.announce;
    
    if (trackerUrl.startsWith('udp://')) {
      console.log('Using UDP tracker protocol');
      return await this.udpTracker.announceToUDPTracker(trackerUrl, torrent);
    } else if (trackerUrl.startsWith('http://') || trackerUrl.startsWith('https://')) {
      console.log('Using HTTP tracker protocol');
      return await this.announceToHTTPTracker(torrent);
    } else {
      throw new Error(`Unsupported tracker protocol: ${trackerUrl}`);
    }
  }

  async announceToHTTPTracker(torrent) {
    try {
      const url = this.buildTrackerUrl(torrent);
      console.log('Contacting HTTP tracker:', torrent.announce);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'MyTorrent/0.0.1'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP tracker responded with status: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      const trackerResponse = bencode.decode(Buffer.from(buffer));
      
      return this.parseTrackerResponse(trackerResponse);
    } catch (error) {
      console.error('HTTP tracker communication failed:', error.message);
      throw error;
    }
  }

  buildTrackerUrl(torrent, event = 'started') {
    const params = new URLSearchParams();
    params.append('info_hash', torrent.infoHash.toString('binary'));
    params.append('peer_id', this.peerId.toString('binary'));
    params.append('port', this.port.toString());
    params.append('uploaded', '0');
    params.append('downloaded', '0');
    params.append('left', torrent.length.toString());
    params.append('compact', '1');
    params.append('event', event);

    return `${torrent.announce}?${params}`;
  }

  parseTrackerResponse(response) {
    const result = {
      interval: response.interval || 1800,
      complete: response.complete || 0,
      incomplete: response.incomplete || 0,
      peers: []
    };

    if (response.peers) {
      if (Buffer.isBuffer(response.peers)) {
        for (let i = 0; i < response.peers.length; i += 6) {
          if (i + 6 <= response.peers.length) {
            const ip = Array.from(response.peers.slice(i, i + 4)).join('.');
            const port = response.peers.readUInt16BE(i + 4);
            result.peers.push({ ip, port });
          }
        }
      }
    }

    console.log(`HTTP tracker found ${result.peers.length} peers`);
    return result;
  }
}

module.exports = TrackerClient;
