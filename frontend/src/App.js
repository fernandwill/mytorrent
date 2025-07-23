import React, {useState, useEffect} from "react";
import io from "socket.io-client";

function App() {
    const [connected, setConnected] = useState(false);

    useEffect (() => {
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
                    body: formData
                });

                const torrentInfo = await response.json();
                console.log("Torrent uploaded: ", torrentInfo);
            } catch (error) {
                console.error("Error uploading torrent: ", error);
            }
        };

 return (
    <div style={{padding: "20px"}}>
        <h1>MyTorrent</h1>
        <div>
            Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <div style={{marginTop: "20px"}}>
            <h2>Add Torrent</h2>
            <input
            type="file"
            accept=".torrent"
            onChange={handleFileUpload}
            />
        </div>
    </div>
    );
}

export default App;