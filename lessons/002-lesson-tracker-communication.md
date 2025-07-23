# BitTorrent Tracker Communication

## What are Trackers?
Trackers are servers that help BitTorrent clients find each other. They maintain lists of peers (other clients) that are downloading or seeding the same torrent.

## The Tracker Protocol
Trackers use HTTP GET requests with specific parameters:

### Required Parameters:
- `info_hash` - 20-byte SHA1 hash of the torrent's info dictionary
- `peer_id` - 20-byte string identifying our client
- `port` - Port number our client is listening on
- `uploaded` - Total bytes uploaded so far
- `downloaded` - Total bytes downloaded so far
- `left` - Bytes left to download (0 if seeding)

### Optional Parameters:
- `event` - Can be "started", "completed", or "stopped"
- `compact` - Request compact peer format (saves bandwidth)
- `numwant` - Number of peers we want (default 50)

## Tracker Response
Trackers respond with bencode data containing:
- `interval` - How often to contact tracker (seconds)
- `peers` - List of peer information (IP addresses and ports)
- `complete` - Number of seeders
- `incomplete` - Number of leechers

## Our Implementation Plan
1. Generate a unique peer ID for our client
2. Build tracker request URLs with proper parameters
3. Make HTTP requests to trackers
4. Parse tracker responses to get peer lists
5. Display peer information in our React frontend

## Next Steps
We'll implement tracker communication and display the peer list in our UI.