# Peer-to-Peer Communication

## What is Peer Communication?
After getting peer lists from trackers, BitTorrent clients connect directly to other peers to exchange file pieces. This is the core of the BitTorrent protocol.

## The BitTorrent Peer Protocol
Peers communicate using TCP connections on the ports discovered from tracker responses.

### Connection Handshake
1. **Protocol identifier** - 19-byte string "BitTorrent protocol"
2. **Reserved bytes** - 8 bytes of flags (usually zeros)
3. **Info hash** - 20-byte SHA1 hash identifying the torrent
4. **Peer ID** - 20-byte identifier of the connecting client

### Message Types
After handshake, peers exchange these message types:

- **choke/unchoke** - Control whether peer will send data
- **interested/not interested** - Indicate if peer wants data
- **have** - Announce having a specific piece
- **bitfield** - Announce which pieces peer has (sent after handshake)
- **request** - Request a block of data from a piece
- **piece** - Send actual file data
- **cancel** - Cancel a previous request

## Piece Selection Strategy
- **Rarest first** - Download pieces that fewest peers have
- **Random first piece** - Get first piece quickly to start sharing
- **Endgame mode** - Request remaining pieces from multiple peers

## Our Implementation Plan
1. Create TCP connections to peers from tracker response
2. Implement handshake protocol
3. Handle basic message types (bitfield, have, request, piece)
4. Implement simple piece selection (random for now)
5. Update React UI to show download progress

## Challenges for Browser Implementation
- Browsers can't make raw TCP connections
- We'll simulate peer connections in our backend
- Use WebSocket to show real-time progress in React frontend

## Next Steps
We'll implement a basic peer connection manager and show download simulation in our UI.