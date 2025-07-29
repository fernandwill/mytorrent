import React, { useState, useEffect } from "react";
import io from "socket.io-client";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [connected, setConnected] = useState(false);
  const [torrents, setTorrents] = useState([]);
  const [downloads, setDownloads] = useState({});
  const [uploadMethod, setUploadMethod] = useState("file");
  const [magnetLink, setMagnetLink] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ show: false, downloadId: null, torrentName: ""});

  const lightTheme = {
    background: "#f5f7fa",
    cardBackground: "white",
    headerBackground: "#2c3e50",
    headerText: "white",
    textPrimary: "#2c3e50",
    textSecondary: "#64748b",
    textMuted: "#7f8c8d",
    uploadBorder: "#3498db",
    uploadBackground: "#f8fafc",
    progressBackground: "#f8fafc",
    border: "#e2e8f0",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
  };

  const darkTheme = {
    background: "#1a1a1a",
    cardBackground: "#2d2d2d",
    headerBackground: "#1e1e1e",
    headerText: "white",
    textPrimary: "#ffffff",
    textSecondary: "#b0b0b0",
    textMuted: "#888888",
    uploadBorder: "#4a9eff",
    uploadBackground: "#333333",
    progressBackground: "#333333",
    border: "#404040",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.3)"
  };

  const theme = darkMode ? darkTheme : lightTheme;

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

    newSocket.on("download-paused", (data) => {
      console.log("Download paused: ", data);
      setDownloads(prev => ({
        ...prev,
        [data.downloadId]: {...prev[data.downloadId], status: "paused"}
      }));
    });

    newSocket.on("download-waiting", (data) => {
      console.log("Download waiting: ", data);
      setDownloads(prev => ({
        ...prev,
        [data.downloadId]: {
          ...prev[data.downloadId],
          status: "waiting_for_peers",
          message: data.message
        }
      }));
    });

    newSocket.on("download-resumed", (data) => {
      console.log("Download resumed: ", data);
      setDownloads(prev => ({
        [data.downloadId]: {...prev[data.downloadId], status: "downloading"}
      }));
    });

    newSocket.on("download-removed", (data) => {
      console.log("Download removed: ", data);
      setDownloads(prev => {
        const updated = {...prev};
        delete updated[data.downloadId];
        return updated;
      });
      setTorrents(prev => prev.filter(torrent => torrent.downloadId !== data.downloadId));
    });
    
      newSocket.on("download-error", (data) => {
        console.log("Download error: ", data);
        setDownloads(prev => ({
          ...prev,
          [data.downloadId]: {
            status: "error",
            error: data.error
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

    console.log("Sending magnet link: ", magnetLink.trim());

    try {
      const response = await fetch("http://localhost:3001/api/magnet", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({magnetLink: magnetLink.trim()})
      });

      const torrentInfo = await response.json();
      console.log("Magnet added: ", torrentInfo);
      setTorrents(prev => [...prev, torrentInfo]);
      setMagnetLink(""); // This clears the input
    } catch (error) {
      console.error("Error adding magnet: ", error)
    }
  };

  const handlePauseDownload = async (downloadId) => {
      try {
        const response = await fetch(`http://localhost:3001/api/download/${downloadId}/pause`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error("Failed to pause download.");
        }

        console.log("Download paused.");
      } catch (error) {
        console.error("Error pausing download", error);
      }
  };

  const handleResumeDownload = async (downloadId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/download/${downloadId}/resume`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to resume download.");
      }

      console.log("Download resumed.");
    } catch (error) {
      console.error("Error resuming download.", error);
    }
  };

  const showRemoveConfirmation = (downloadId, torrentName) => {
    setConfirmDialog({
      show: true,
      downloadId,
      torrentName
    });
  };

    const handleRemoveDownload = async () => {
      const {downloadId} = confirmDialog;

      try {
        const response = await fetch(`http://localhost:3001/api/download/${downloadId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error("Failed to remove download.");
        }

        console.log("Download removed.");
      } catch (error) {
        console.error("Error removing download: ", error);
      } finally {
        setConfirmDialog({show: false, downloadId: null, torrentName: ""});
      }
    };

  return (
   <div style={{
    minHeight:"100vh",
    backgroundColor: theme.background,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: "background-color 0.3s ease"
   }}>

    {/* Header */}
    <header style={{
      backgroundColor: theme.headerBackground,
      color: theme.headerText,
      padding: "1rem 2rem",
      boxShadow: theme.shadow,
      transition: "all 0.3s ease"
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

        {/* Toggle Theme */}
        <div 
          onClick={() => setDarkMode(!darkMode)}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: darkMode ? "#4a5568" : "#e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "1rem",
            transition: "all 0.3s ease",
            border: `2px solid ${darkMode ? "#718096" : "#cbd5e0"}`,
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
          }}
          title= {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? "☀️" : "🌙"}
        </div>
      </div>
    </div>
  </header>

  {/* Main Content */}
  <main style={{
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem"
  }}>
    
    {/* Upload Section */}
    <section style={{
      backgroundColor: theme.cardBackground,
      borderRadius: "12px",
      padding: "2rem",
      marginBottom: "2rem",
      boxShadow: theme.shadow,
      border: `1px solid ${theme.border}`,
      transition: "all 0.3s ease"
    }}>
      <h2 style={{
        margin: "0 0 1.5rem 0",
        fontSize: "1.25rem",
        fontWeight: "600",
        color: theme.textPrimary
      }}>Add New Torrent</h2>

      {/* Tab-like interface */}
      <div style={{
        display: "flex",
        marginBottom: "1.5rem",
        borderBottom: `1px solid ${theme.border}`
      }}>
        <button onClick={() => setUploadMethod("file")}
          style={{
            padding: "0.75rem 1.5rem",
            border: "none",
            backgroundColor:
            uploadMethod === "file" ? "#3498db" : "transparent",
            color: uploadMethod === "file" ? "white" : theme.textSecondary,
            borderRadius: "6px 6px 0 0",
            cursor: "pointer",
            fontWeight: "500",
            marginRight: "0.5rem",
            transition: "all 0.3s ease"
          }}>📁 Torrent File</button>
        <button onClick={() => setUploadMethod("magnet")} style={{
          padding: "0.75rem",
          border: "none",
          backgroundColor: uploadMethod === "magnet" ? "#3498db" : "transparent",
          color: uploadMethod === "magnet" ? "white" : theme.textSecondary,
          borderRadius: "6px 6px 0 0",
          cursor: "pointer",
          fontWeight: "500",
          transition: "all 0.3s ease"
        }}>🧲 Magnet Link</button>
      </div>

      {/* File Upload */}
      {uploadMethod === "file" && (
        <div style={{
          border: `2px dashed ${theme.uploadBorder}`,
          borderRadius: "8px",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: theme.uploadBackground,
          transition: "all 0.3s ease"
        }}>
          <div style={{
            fontSize: "3rem",
            marginBottom: "1rem"
          }}>📁</div>
          <p style={{
            margin: "0 0 1rem 0",
            color: theme.textMuted,
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
            backgroundColor: theme.uploadBackground,
            transition: "all 0.3s ease"
          }}>
            <div style={{
              fontSize: "3rem",
              marginBottom: "1rem"
            }}>🧲</div>
            <p style={{
              margin: "0 0 1rem 0",
              color: theme.textMuted,
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
                  border: `1px solid ${theme.border}`,
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: theme.cardBackground,
                  color: theme.textPrimary,
                  transition: "all 0.3s ease"
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
          color: theme.textPrimary
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
                backgroundColor: theme.cardBackground,
                borderRadius: "0.75rem",
                padding: "0",
                boxShadow: theme.shadow,
                border: `1px solid ${theme.border}`,
                overflow: "hidden",
                transition: "all 0.3s ease"
              }}>

                {/* Card Header */}
                <div style={{
                  padding: "1.5rem 1.5rem 1rem 1.5rem",
                  borderBottom: `1px solid ${theme.border}`
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
                    color: theme.textPrimary,
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
                    downloadInfo?.status === 'completed' ? '#d4edda' : downloadInfo?.status === 'downloading' ? '#cce5ff' : 
                    downloadInfo?.status === 'waiting_for_peers' ? '#fff3cd' :
                    downloadInfo?.status === 'error' ? '#f8d7da' : '#f8f9fa',
                    color: 
                    downloadInfo?.status === 'completed' ? '#155724' : 
                    downloadInfo?.status === 'downloading' ? '#0066cc' :
                    downloadInfo?.status === 'waiting_for_peers' ? '#856404' :
                    downloadInfo?.status === 'error' ? '#721c24' : '#6c757d'
                  }}>
                    {downloadInfo?.status === "completed" ? "Completed." : downloadInfo?.status === 'downloading' ? "Downloading..." :
                    downloadInfo?.status === 'waiting_for_peers' ? "Waiting for peers..." : 
                    downloadInfo?.status === 'error' ? "Error" : "Ready"}
                  </span>
                </div>

                {/* File Info Row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "1rem",
                  fontSize: "0.85rem",
                  color: theme.textSecondary
                }}>

                  <div>
                    <span style={{ 
                      fontWeight: "500",
                      color: theme.textSecondary
                    }}>Size: </span>{" "}
                    {formatBytes(torrent.length || 0)}
                  </div>

                  <div>
                    <span style={{
                      fontWeight: "500",
                      color: theme.textPrimary
                    }}>Pieces: </span>{" "}
                    {torrent.pieces ? torrent.pieces.length / 20 : 0}
                    </div>
                  </div>

                <div>
                    <span style={{
                      fontWeight: "500",
                      color: theme.textPrimary
                    }}>Seeders: </span>{" "}
                    {torrent.seeders !== undefined ? torrent.seeders : "N/A"}
                    </div>

                <div>
                    <span style={{
                      fontWeight: "500",
                      color: theme.textPrimary
                    }}>Leechers: </span>{" "}
                    {torrent.leechers !== undefined ? torrent.leechers : "N/A"}
                    </div>
                  </div>

                {/* Download Progress Section */}
                {downloadInfo && (
                  <div style={{
                    padding: "1rem 1.5rem",
                    backgroundColor: theme.progressBackground
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
                    color: theme.textPrimary
                  }}>Progress: {downloadInfo.progress}%
                  </span>
                  <span style={{
                    fontSize: "0.85rem",
                    color: theme.textSecondary
                  }}>
                  {downloadInfo.downloadedPieces} / {downloadInfo.totalPieces} pieces
                  </span>
                </div>

                {/* Enhanced Progress Bar */}
                <div style={{
                  width: "100%",
                  height: "8px",
                  backgroundColor: darkMode ? "#404040" : "#e5e7eb",
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

              {/* Download Controls */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem"
              }}>
                <div style={{
                  display: "flex",
                  gap: "0.5rem"
                }}>
                  {downloadInfo.status === "downloading" && (
                    <button
                      onClick={() => handlePauseDownload(downloadId)}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem"
                      }}>
                        Pause Download
                      </button>
                  )}

                  {downloadInfo.status === "paused" && (
                    <button
                      onClick={() => handleResumeDownload(downloadId)}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem"
                      }}>
                        Resume Download
                      </button>
                  )}

                  {downloadInfo.status === "completed" && (
                    <span style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#d4edda",
                      color: "#155724",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}>Completed</span>
                  )}

              {/* Remove Button */}
              <button
                onClick={() => showRemoveConfirmation(downloadId, torrent.name || "Unknown")}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}>
                  Remove Torrent
                </button>
              </div>

              <span style={{
                fontSize: "0.85rem",
                color: theme.textSecondary,
                fontWeight: "500"
              }}>
                {downloadInfo.status === "paused" ? "Download Paused" :
                downloadInfo.status === "completed" ? "Download Completed" : "Downloading"}
              </span>
            </div>

              {/* Speed and ETA */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.875rem",
                color: theme.textSecondary
              }}>
                <span>{downloadInfo.downloadSpeed} KB/s</span>
                <span>{torrent.peers ? torrent.peers.length : 0} peers</span>
              </div>
            </div>
          )}

          {/* Peers Section (Collapsible) */}
          {torrent.peers && torrent.peers.length > 0 && (
            <details style={{
              borderTop: `1px solid ${theme.border}`
            }}>
              <summary style={{
                padding: "1rem 1.5rem",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: theme.textPrimary,
                backgroundColor: theme.progressBackground
              }}>View Connected Peers ({torrent.peers.length})
              </summary>
              <div style={{
                padding: "0 1.5rem 1rem 1.5rem",
                maxHeight: "120px",
                overflow: "auto",
                backgroundColor: theme.progressBackground
              }}>
              {torrent.peers.map((peer, peerIndex) => (
                <div key={peerIndex} style={{
                  padding: "0.5rem",
                  margin: "0.25rem 0",
                  backgroundColor: theme.cardBackground,
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  color: theme.textSecondary,
                  border: `1px solid ${theme.border}`
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
  
  {/* Confirmation Dialog */}
  {confirmDialog.show && (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.cardBackground,
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        maxWidth: "500px",
        width: "90%",
        border: `1px solid ${theme.border}`,
        transition: "all 0.3s ease"
      }}>
        <h3 style={{
          margin: "0 0 1rem 0",
          color: theme.textPrimary
        }}>Confirm Removal</h3>
        <p style={{
          margin: "0 0 1.5rem 0",
          color: theme.textSecondary
        }}>
          Are you sure you want to remove "{confirmDialog.torrentName}"? This action cannot be undone.
        </p>
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "1rem"
        }}>
          <button
            onClick={() => setConfirmDialog({ show: false, downloadId: null, torrentName: "" })}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleRemoveDownload}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500"
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )}
</div>
);
}

export default App;
