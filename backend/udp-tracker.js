const dgram = require('dgram');
const crypto = require('crypto');

class UDPTracker {
  constructor() {
    this.socket = null;
    this.connectionId = null;
    this.transactionId = null;
  }

  closeSocket() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        // Socket already closed, ignore
      }
      this.socket = null;
    }
  }

  async announceToUDPTracker(trackerUrl, torrent) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(trackerUrl);
        const host = url.hostname;
        const port = parseInt(url.port) || 80;

        console.log(`Connecting to UDP tracker: ${host}:${port}`);

        this.socket = dgram.createSocket('udp4');

        // Set up global timeout
        const globalTimeout = setTimeout(() => {
          console.error('UDP tracker global timeout');
          this.closeSocket();
          reject(new Error('UDP tracker timeout'));
        }, 15000);

        // Step 1: Connect to tracker
        this.connectToTracker(host, port, torrent)
          .then(connectionId => {
            console.log('UDP tracker connection established');
            this.connectionId = connectionId;
            
            // Step 2: Send announce request
            return this.sendAnnounceRequest(host, port, torrent);
          })
          .then(announceResponse => {
            console.log('UDP tracker announce successful');
            clearTimeout(globalTimeout);
            this.closeSocket();
            resolve(announceResponse); // This was missing!
          })
          .catch(error => {
            console.error('UDP tracker error:', error.message);
            clearTimeout(globalTimeout);
            this.closeSocket();
            reject(error);
          });

        this.socket.on('error', (error) => {
          console.error('UDP socket error:', error);
          clearTimeout(globalTimeout);
          this.closeSocket();
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  connectToTracker(host, port, torrent) {
    return new Promise((resolve, reject) => {
      // Generate transaction ID
      this.transactionId = crypto.randomBytes(4).readUInt32BE(0);
  
      // Create connect request
      const connectRequest = Buffer.alloc(16);
      connectRequest.writeBigUInt64BE(0x41727101980n, 0); // Protocol ID
      connectRequest.writeUInt32BE(0, 8); // Action: connect
      connectRequest.writeUInt32BE(this.transactionId, 12); // Transaction ID
  
      console.log('Sending UDP connect request...');
  
      let isResolved = false; // Flag to prevent multiple resolves/rejects
  
      // Set up response handler
      const responseHandler = (msg, rinfo) => {
        if (isResolved) return; // Already handled
        
        try {
          console.log(`Received UDP response: ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
          
          if (msg.length >= 16) {
            const action = msg.readUInt32BE(0);
            const transactionId = msg.readUInt32BE(4);
            
            console.log(`Response action: ${action}, transaction ID: ${transactionId}, expected: ${this.transactionId}`);
            
            if (action === 0 && transactionId === this.transactionId) {
              // Connect response
              const connectionId = msg.readBigUInt64BE(8);
              console.log('Connection ID received:', connectionId.toString(16));
              
              isResolved = true;
              if (this.socket) {
                this.socket.removeListener('message', responseHandler);
              }
              resolve(connectionId);
            } else if (action === 3) {
              // Error response
              const errorMsg = msg.slice(8).toString();
              
              isResolved = true;
              if (this.socket) {
                this.socket.removeListener('message', responseHandler);
              }
              reject(new Error(`UDP connect error: ${errorMsg}`));
            }
          }
        } catch (error) {
          if (!isResolved) {
            isResolved = true;
            console.error('Error processing connect response:', error);
            reject(error);
          }
        }
      };
  
      this.socket.on('message', responseHandler);
  
      // Send connect request
      this.socket.send(connectRequest, port, host, (error) => {
        if (error) {
          console.error('Error sending connect request:', error);
          if (!isResolved) {
            isResolved = true;
            reject(error);
          }
        } else {
          console.log('Connect request sent successfully');
        }
      });
  
      // Timeout for connect
      const connectTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          if (this.socket) {
            this.socket.removeListener('message', responseHandler);
          }
          reject(new Error('UDP connect timeout - no response from tracker'));
        }
      }, 10000);
  
      // Clean up timeout if resolved early
      const originalResolve = resolve;
      const originalReject = reject;
      
      resolve = (value) => {
        clearTimeout(connectTimeout);
        originalResolve(value);
      };
      
      reject = (error) => {
        clearTimeout(connectTimeout);
        originalReject(error);
      };
    });
  }
  

  sendAnnounceRequest(host, port, torrent) {
    return new Promise((resolve, reject) => {
      // Generate new transaction ID for announce
      this.transactionId = crypto.randomBytes(4).readUInt32BE(0);
  
      // Create announce request (same as before)
      const announceRequest = Buffer.alloc(98);
      let offset = 0;
  
      // ... (all the buffer writing code stays the same) ...
  
      console.log('Sending UDP announce request...');
  
      let isResolved = false; // Flag to prevent multiple resolves/rejects
  
      // Set up response handler
      const responseHandler = (msg, rinfo) => {
        if (isResolved) return; // Already handled
        
        try {
          console.log(`Received announce response: ${msg.length} bytes`);
          
          if (msg.length >= 20) {
            const action = msg.readUInt32BE(0);
            const transactionId = msg.readUInt32BE(4);
            
            console.log(`Announce response action: ${action}, transaction ID: ${transactionId}`);
            
            if (action === 1 && transactionId === this.transactionId) {
              // Announce response
              const interval = msg.readUInt32BE(8);
              const leechers = msg.readUInt32BE(12);
              const seeders = msg.readUInt32BE(16);
              
              console.log(`UDP tracker response: ${seeders} seeders, ${leechers} leechers, interval: ${interval}s`);
              
              // Parse peers (6 bytes each: 4 IP + 2 port)
              const peers = [];
              for (let i = 20; i < msg.length; i += 6) {
                if (i + 6 <= msg.length) {
                  const ip = Array.from(msg.slice(i, i + 4)).join('.');
                  const port = msg.readUInt16BE(i + 4);
                  peers.push({ ip, port });
                }
              }
              
              console.log(`Found ${peers.length} peers from UDP tracker`);
              if (peers.length > 0) {
                console.log('First few peers:', peers.slice(0, 3));
              }
              
              isResolved = true;
              if (this.socket) {
                this.socket.removeListener('message', responseHandler);
              }
              resolve({
                interval,
                complete: seeders,
                incomplete: leechers,
                peers
              });
            } else if (action === 3) {
              // Error response
              const errorMsg = msg.slice(8).toString();
              
              isResolved = true;
              if (this.socket) {
                this.socket.removeListener('message', responseHandler);
              }
              reject(new Error(`UDP announce error: ${errorMsg}`));
            }
          }
        } catch (error) {
          if (!isResolved) {
            isResolved = true;
            console.error('Error processing announce response:', error);
            reject(error);
          }
        }
      };
  
      this.socket.on('message', responseHandler);
  
      // Send announce request
      this.socket.send(announceRequest, port, host, (error) => {
        if (error) {
          console.error('Error sending announce request:', error);
          if (!isResolved) {
            isResolved = true;
            reject(error);
          }
        } else {
          console.log('Announce request sent successfully');
        }
      });
  
      // Timeout for announce
      const announceTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          if (this.socket) {
            this.socket.removeListener('message', responseHandler);
          }
          reject(new Error('UDP announce timeout - no response from tracker'));
        }
      }, 10000);
  
      // Clean up timeout if resolved early
      const originalResolve = resolve;
      const originalReject = reject;
      
      resolve = (value) => {
        clearTimeout(announceTimeout);
        originalResolve(value);
      };
      
      reject = (error) => {
        clearTimeout(announceTimeout);
        originalReject(error);
      };
    });
  }
}  

module.exports = UDPTracker;
