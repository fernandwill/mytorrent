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
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
   <div style={{
    minHeight:"100vh",
    backgroundColor: "#f5f7fa",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
   }}>

    {/* Header */}
    <header style={{
      backgroundColor: "#2c3e50",
      color: "white",
      padding: "1rem 2rem",
      boxShadow: "0 0.1rem 0.25rem rgba(0, 0, 0, 0.1)"
    }}>
      <h1 style={{
        margin: 0,
        fontSize: "1.5rem",
        fontWeight: "600"
      }}>
        MyTorrent
      </h1>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem"
      }}>
        <span style={{
          padding: "0.5rem 1rem",
          borderRadius: "20px",
          backgroundColor: connected ? "#27ae60" : "#e74c3c",
          fontSize: "0.875rem",
          fontWeight: "500"
        }}>
          {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </span>
      </div>
  </header>

  {/* Main Content */}
  <main style={{
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem"
  }}>
    
    {/* Main Content */}
    <section style={{
      backgroundColor: "white",
      borderRadius: "0.75rem",
      padding: "2rem",
      marginBottom: "2rem",
      boxShadow: "0 0.1rem 0.25rem rgba(0, 0, 0, 0.1)",
      border: "1px solid #e1e8ed"
    }}>
      
      <h2 style={{
        margin: "0 0 1.5rem 0",
        fontSize: "1.25rem",
        fontWeight: "600",
        color: "#2c3e50"
      }}>Add New Torrent</h2>

      <div style={{
        border: "2px dashed #3498db",
        borderRadius: "8px",
        padding: "2rem",
        textAlign: "center",
        backgroundColor: "#f8fafc",
        transition: "all 0.3s ease"
      }}>
        
        <div style={{
          fontSizze: "3rem",
          marginBottom: "1rem"
        }}>
           📁
        </div>

        <p style={{
          margin: "0 0 1rem 0",
          color: "#7f8c8d",
          fontSize: "1rem"
        }}>
          Select a torrent file to start downloading
        </p>

        <input 
          type="file"
          accept=".torrent"
          onChange={handleFileUpload}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#3498db",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500"
          }}
        />
      </div>
    </section>

    {/* Torrent Section */}
    {torrents && torrents.length > 0 && (
      <section>
        <h2 style={{
          margin: "0 0 1.5rem 0",
          fontSize: "1.25rem",
          fontWeight: "600",
          color: "#2c3e50"
        }}>
          Active Downloads ({torrents.length})
        </h2>

        <div style={{
          display: "grid",
          gap: "1.5rem"
        }}>
          {torrents.map((torrent, index) => {
            if (!torrent) return null;

            return (
              <div key={index} style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "1.5rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e1e8ed"
              }}>

                <h3 style={{
                  margin: "0 0 1rem 0",
                  color: "#2c3e50"
                }}>
                  {torrent.name || "Unknown"}
                </h3>
                <p>Size: {torrent.length || 0} bytes</p>
                <p>Pieces {torrent.pieces ? torrent.pieces.length / 20 : 0}</p>
                <p>Tracker {torrent.announce || "Unknown"}</p>

                {(torrent.seeders !== undefined || torrent.peers || downloads[torrent.downloadId]) && (
                  <div style={{
                    marginTop: "0.75rem"
                  }}>
                    <p>Seeders: {torrent.seeders !== undefined ? torrent.seeders : "N/A"} | Leechers: {torrent.leechers !== undefined ? torrent.leechers: "N/A"}</p>
                    <p>Peers found: {torrent.peers ? torrent.peers.length : 0}</p>

                {(() => {
                  const downloadId = torrent.downloadId;
                  const downloadInfo = downloads[downloadId];

                  return downloadInfo && (
                    <div style={{
                      marginTop: "0.75rem",
                      padding: "0.5rem",
                      backgroundColor: "#f5f5f5"
                    }}>
                      <h4>Download Progress</h4>
                      <div style={{
                        width: "100%",
                        backgroundColor: "#ddd",
                        borderRadius: "2.5rem"
                      }}>
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
              )}
            </div>
            );
          })}
        </div>
      </section>
    )}
  </main>
</div>
)};

export default App;
