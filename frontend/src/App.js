import React, { useState, useEffect } from "react";
import io from "socket.io-client";

function App() {
  const [connected, setConnected] = useState(false);
  const [torrents, setTorrents] = useState([]);
  const [downloads, setDownloads] = useState({});
  const [uploadMethod, setUploadMethod] = useState("file");
  const [magnetLink, setMagnetLink] = useState("");

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 bytes";
    const k = 1024;
    const size = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + size[i];
  };

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

  const handleMagnetSubmit = async () => {
    if (!magnetLink.trim()) return;

    try {
      const response = await fetch("http://localhost:3001/api/magnet", { 
        method: "POST",
        headers: {
          "content-Type": "application/json"
        },
        bodt: JSON.stringify({magnetLink: magnetLink.trim()})
      });

      const torrentInfo = await response.json();
      console.log("Magnet added: ", torrentInfo);
      setTorrents(prev => [...prev, torrentInfo]);
      setMagnetLink(""); // This clears the input
    } catch (error) {
      console.error("Error adding magnet: ", error)
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
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
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
      borderRadius: "12px",
      padding: "2rem",
      marginBottom: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e1e8ed"
    }}>
      <h2 style={{
        margin: "0 0 1.5rem 0",
        fontSize: "1.25rem",
        fontWeight: "600",
        color: "#2c3e50"
      }}>Add New Torrent</h2>

      {/* Tab-like interface */}
      <div style={{
        display: "flex",
        marginBottom: "1.5rem",
        borderBottom: "1px solid #e1e8ed"
      }}>
        <button onClick={() => setUploadMethod("file")}
          style={{
            padding: "0.75rem 1.5rem",
            border: "none",
            backgroundColor: 
            uploadMethod === "file" ? " #3498db" : "transparent",
            color: uploadMethod === "file" ? "white" : "#64748b",
            borderRadius: "6px 6px 0 0",
            cursor: "pointer",
            fontWeight: "500",
            marginRight: "0.5rem"
          }}>📁 Torrent File</button>
        <button onClick={() => setUploadMethod("magnet")} style={{
          padding: "0.75rem",
          border: "none",
          backgroundColor: uploadMethod === "magnet" ? "#3498db" : "transparent",
          color: uploadMethod === "magnet" ? "white" : "#64748b",
          borderRadius: "6px 6px 0 0",
          cursor: "pointer",
          fontWeight: "500"
        }}>🧲 Magnet Link</button>
      </div>

      {/* File Upload */}
      {uploadMethod === "file" && (
        <div style={{
          border: "2px dashed #3498db",
          borderRadius: "8px",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#f8fafc",
          transition: "all 0.3s ease"
        }}>
          <div style={{
            fontSize: "3rem",
            marginBottom: "1rem"
          }}>📁</div>
          <p style={{
            margin: "0 0 1rem 0",
            color: "#7f8c8d",
            fontSize: "1rem"
          }}>Select a torrent file to start downloading.</p>
          <input 
            type="file"
            accept=".torrent"
            onChange={handleFileUpload}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "500"          
            }}
          />
        </div>
      )}

        {/* Magnet Link Input */}
        {uploadMethod === "magnet" && (
          <div style={{
            border: "2px dashed #e74c3c",
            borderRadius: "8px",
            padding: "2rem",
            textAlign: "center",
            backgroundColor: "#fdf2f2",
            transition: "all 0.3s ease"
          }}>
            <div style={{
              fontSize: "3rem",
              marginBottom: "1rem"
            }}>🧲</div>
            <p style={{
              margin: "0 0 1rem 0",
              color: "#7f8c8d",
              fontSize: "1rem"
            }}>Paste a magnet link to start downloading.</p>
            <div style={{
              display: "flex",
              gap: "0.5rem",
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              <input 
                type="text"
                placeholder="magnet:?xt=urn:btih..."
                value={magnetLink}
                onChange={(e) => setMagnetLink(e.target.value)}
                style={{
                  flex: "1",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "1rem"
                }}
              />
              <button
                onClick={handleMagnetSubmit}
                disabled={!magnetLink.trim()}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: magnetLink.trim() ? "#e74c3c" : "#bdc3c7",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: magnetLink.trim() ? "pointer" : "not-allowed",
                  fontSize: "1rem",
                  fontWeight: "500"
                }}
              >Add Magnet</button>
            </div>
          </div>
      )}
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

            const downloadId = torrent.downloadId;
            const downloadInfo = downloads[downloadId];

            return (
              <div key={index} style={{
                backgroundColor: "white",
                borderRadius: "0.75rem",
                padding: "0",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e1e8ed",
                overflow: "hidden"
              }}>

                {/* Card Header */}
                <div style={{
                  padding: "1.5rem 1.5rem 1rem 1.5rem",
                  borderBottom: "1px solid #f1f3f4"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.75rem"
                  }}>
                  <h3 style={{
                    margin: "0",
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#2c3e50",
                    flex: "1",
                    marginRight: "1rem"
                  }}>
                    📄 {torrent.name || "Unknown"}
                  </h3>

                  {/* Status Badge */}
                  <span style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                    backgroundColor:
                    downloadInfo?.status === 'completed' ? '#d4edda' : 
                    downloadInfo?.status === 'downloading' ? '#cce5ff' : '#f8f9fa',
                    color: 
                    downloadInfo?.status === 'completed' ? '#155724' : 
                    downloadInfo?.status === 'downloading' ? '#0066cc' : '#6c757d'
                  }}>
                    {downloadInfo?.status === "completed" ? "Completed." : downloadInfo?.status === 'downloading' ? "Downloading..." : "Ready"}
                  </span>
                </div>

                {/* File Info Row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "1rem",
                  fontSize: "0.85rem",
                  color: "#64748b"
                }}>
                  <div>
                    <span style={{ 
                      fontWeight: "500",
                      color: "#475569"
                    }}>Size: </span>{" "}
                    {formatBytes(torrent.length || 0)}
                  </div>

                  <div>
                    <span style={{
                      fontWeight: "500",
                      color: "#475569"
                    }}>Pieces: </span>{" "}
                    {torrent.pieces ? torrent.pieces.length / 20 : 0}
                    </div>
                  </div>
                </div>

                {/* Download Progress Section */}
                {downloadInfo && (
                  <div style={{
                    padding: "1rem 1.5rem",
                    backgroundColor: "#f8fafc"
                  }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem"
                  }}>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: "500",
                    color: "#374151"
                  }}>Progress: {downloadInfo.progress}%
                  </span>
                  <span style={{
                    fontSize: "0.85rem",
                    color: "#6b7280"
                  }}>
                  {downloadInfo.downloadedPieces} / {downloadInfo.totalPieces} pieces
                  </span>
                </div>

                {/* Enhanced Progress Bar */}
                <div style={{
                  width: "100%",
                  height: "8px",
                  backgroundColor: "$e5e7eb",
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginBottom: "0.75rem"
                }}>
                <div style={{
                  width: `${downloadInfo.progress}%`,
                  height: "100%",
                  backgroundColor: downloadInfo.status === "completed" ? "#10b981" : "#3b82f6",
                  borderRadius: "4px",
                  transition: "width 0.5s ease-in-out",
                  background: downloadInfo.status === "completed" ? 
                    "linear-gradient(90deg, #10b981 0%, #059669 100%)" : 
                    "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)"  
                }}></div>
              </div>

              {/* Speed and ETA */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.875rem",
                color: "#6b7280"
              }}>
                <span>{downloadInfo.downloadSpeed} KB/s</span>
                <span>{torrent.peers ? torrent.peers.length : 0} peers</span>
              </div>
            </div>
          )}

          {/* Peers Section (Collapsible) */}
          {torrent.peers && torrent.peers.length > 0 && (
            <details style={{
              borderTop: "1px solid #f1f3f4"
            }}>
              <summary style={{
                padding: "1rem 1.5rem",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#fafbfc"
              }}>View Connected Peers ({torrent.peers.length})
              </summary>
              <div style={{
                padding: "0 1.5rem 1rem 1.5rem",
                maxHeight: "120px",
                overflow: "auto",
                backgrounColor: "#fafbfc"
              }}>
              {torrent.peers.map((peer, peerIndex) => (
                <div key={peerIndex} style={{
                  padding: "0.5rem",
                  margin: "0.25rem 0",
                  backgroundColor: "white",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  color: "#4b5563",
                  border: "1px solid #e5e7eb"
                }}>
                  {peer.ip}:{peer.port}
                </div>
              ))}
            </div>
          </details>
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
