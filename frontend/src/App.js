import React, { useState, useEffect } from "react";
import io from "socket.io-client";

function App() {
  const [connected, setConnected] = useState(false);
  const [torrents, setTorrents] = useState([]);
  const [downloads, setDownloads] = useState({});

  useEffect(() => {
    const newSocket = io("http://localhost:3001");

    newSocket.on("connect", () => {
      console.log("Connected to backend.");
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from backend.");
      setConnected(false);
    });

    newSocket.on("download-progress", (data) => {
        console.log("Download progress received: ", data);
        console.log("Current download state: ", downloads);
        setDownloads(prev => {
            const updated = {
            ...prev,
            [data.downloadId]: data
            };

            console.log("Updated download state: ", updated);
            return updated;
        });
    });

    newSocket.on("download-complete", (data) => {
        console.log("Download complete.", data);
        setDownloads(prev => ({
            ...prev,
            [data.downloadId]: {
                ...prev[data.downloadId], status: "completed"
            }
        }));
    });

    return () => newSocket.close();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("torrent", file);

    try {
      const response = await fetch("http://localhost:3001/api/torrent", {
        method: "POST",
        body: formData,
      });

      const torrentInfo = await response.json();
      console.log("Full torrent response: ", JSON.stringify(torrentInfo, null, 2));
      console.log("Has seeders?: ", torrentInfo.seeders !== undefined);
      console.log("Has peers? ", torrentInfo.peers);
      console.log("Has downloadId? ", torrentInfo.downloadId);
      setTorrents((prev) => [...prev, torrentInfo]);
    } catch (error) {
      console.error("Error uploading torrent: ", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>MyTorrent</h1>
      <div>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</div>
      <div style={{ marginTop: "20px" }}>
        <h2>Add Torrent</h2>
        <input type="file" accept=".torrent" onChange={handleFileUpload} />
      </div>

      {torrents && torrents.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2>Uploaded Torrents</h2>
          {torrents.map((torrent, index) => {
            // Safety check for torrent object
            if (!torrent) return null;
            
            return (
            <div
              key={index}
              style={{
                border: "1px solid #ccc",
                padding: "0.75rem",
                margin: "0.75rem 0",
              }}
            >
              <h3>{torrent.name || "Unknown"}</h3>
              <p>Size: {torrent.length || 0} bytes</p>
              <p>Pieces: {torrent.pieces ? torrent.pieces.length / 20 : 0}</p>
              <p>Tracker: {torrent.announce || "Unknown"}</p>

{(torrent.seeders !== undefined || torrent.peers || downloads[torrent.downloadId]) && (
<div style={{ marginTop: "0.75rem" }}>
 <p>
   Seeders: {torrent.seeders !== undefined ? torrent.seeders : 'N/A'} | Leechers: {torrent.leechers !== undefined ? torrent.leechers : 'N/A'}
 </p>
 <p>Peers found: {torrent.peers ? torrent.peers.length : 0}</p>

 {torrent.peers && torrent.peers.length > 0 && (
   <details>
     <summary>View Peers ({torrent.peers.length})</summary>
     <div style={{ maxHeight: "150px", overflow: "auto", marginTop: "0.3rem" }}>
       {torrent.peers.map((peer, peerIndex) => (
         <div key={peerIndex} style={{ fontSize: "0.8rem", padding: "0.25rem" }}>
           {peer.ip}:{peer.port}
         </div>
       ))}
     </div>
   </details>
 )}
</div>
)}

{/* Download progress section with safety checks */}

{(() => {
    const downloadId = torrent.downloadId; // Get the ID for a specific torrent
    const downloadInfo = downloads[downloadId]; // Get the download state of the specific torrent

    console.log("Rendering download section for: ", downloadId);
    console.log("Download info found: ", downloadInfo);

    return downloadInfo && (
        <div style={{marginTop: "0.75rem", padding: "0.5rem", backgroundColor: "#f5f5f5"}}>
            <h4>Download Progress</h4>
            <div style={{width: "100%", backgroundColor: "#ddd", borderRadius: "2.5rem"}}>
                <div style={{
                    width: `${downloadInfo.progress}%`,
                    backgroundColor: "#4caf50",
                    height: "1.5rem",
                    borderRadius: "0.25rem",
                    transition: "width 0.3s"
                }}></div>
            </div>
            <p>{downloadInfo.progress}% - {downloadInfo.downloadedPieces} / {downloadInfo.totalPieces} pieces</p>
            <p>Speed: {downloadInfo.downloadSpeed} KB/s | Status: {downloadInfo.status}</p>
        </div>
    );
})()}
            </div>
            );
        })}
        </div>
      )}
    </div>
  );
}

export default App;
