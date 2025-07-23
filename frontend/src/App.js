import React, { useState, useEffect } from "react";
import io from "socket.io-client";

function App() {
  const [connected, setConnected] = useState(false);
  const [torrents, setTorrents] = useState([]);

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
      console.log("Torrent uploaded: ", torrentInfo);
      console.log("Has seeders?: ", torrentInfo.seeders !== undefined);
      console.log("Has peers? ", torrentInfo.peers);
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

      {torrents.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2>Uploaded Torrents</h2>
          {torrents.map((torrent, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #ccc",
                padding: "0.75rem",
                margin: "0.75rem 0",
              }}
            >
              <h3>{torrent.name}</h3>
              <p>Size: {torrent.length} bytes</p>
              <p>Pieces: {torrent.pieces.length / 20}</p>
              <p>Tracker: {torrent.announce}</p>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
