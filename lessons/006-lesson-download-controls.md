# Download Controls: Pause/Resume

## Download States
A BitTorrent download can have several states:
- **downloading** - Actively downloading pieces
- **paused** - User paused the download
- **completed** - All pieces downloaded
- **error** - Download failed
- **queued** - Waiting to start

## Implementation Plan
1. **Backend Changes**:
   - Add pause/resume methods to DownloadManager
   - Track download state and allow state transitions
   - Stop/start simulation timers based on state
   - Add API endpoints for pause/resume actions

2. **Frontend Changes**:
   - Add pause/resume buttons to torrent cards
   - Update UI based on download state
   - Handle button states (disabled when appropriate)
   - Show different icons/colors for different states

## State Transitions
- downloading → paused (user clicks pause)
- paused → downloading (user clicks resume)
- downloading → completed (download finishes)
- Any state → error (if something goes wrong)

## UI Design
- **Pause button**: ⏸️ when downloading
- **Resume button**: ▶️ when paused
- **Completed indicator**: ✅ when done
- **Progress bar colors**: Different colors for different states

## Technical Considerations
- Clear intervals when pausing
- Resume from current progress (don't restart)
- Emit state changes via WebSocket
- Handle multiple downloads independently

## Next Steps
We'll modify the DownloadManager to support pause/resume, then add the UI controls.