# Magnet Links Support

## What are Magnet Links?
Magnet links are URIs that identify files by their content hash rather than location. They allow BitTorrent clients to download files without needing a .torrent file first.

## Magnet Link Structure
A typical magnet link looks like:
```
magnet:?xt=urn:btih:HASH&dn=FILENAME&tr=TRACKER_URL
```

### Key Parameters:
- `xt` (exact topic) - The file hash, usually SHA-1 in base32
- `dn` (display name) - Human-readable filename
- `tr` (tracker) - Tracker URLs (can have multiple)
- `xl` (exact length) - File size in bytes
- `as` (acceptable source) - Web seed URLs

## Example Magnet Link:
```
magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a&dn=Example+File&tr=http://tracker.example.com:8080/announce
```

## Implementation Plan
1. **Add magnet input field** - Text input for pasting magnet links
2. **Parse magnet links** - Extract hash, name, trackers from URI
3. **Convert to torrent info** - Create torrent-like object from magnet data
4. **DHT support simulation** - Since we can't do real DHT, we'll simulate peer discovery
5. **Update UI** - Show magnet-based torrents alongside file-based ones

## Parsing Strategy
- Use URL parsing to extract parameters
- Decode base32 hash to get info hash
- Handle multiple tracker parameters
- Validate magnet link format

## Challenges
- No piece information initially (would need DHT/PEX in real implementation)
- We'll simulate this by creating mock piece data
- Tracker communication works the same way

## Next Steps
We'll add magnet link input to the UI and implement parsing in the backend.