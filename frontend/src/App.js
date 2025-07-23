import React, {useState, useEffect} from "react";
import io from "socket.io-client";

function App() {
    const [connected, setConnected] = useState(false);
    const [socket, setSocket] = useState(null);

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

        setSocket(newSocket);

        return () => newSocket.close();
 }, []);

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
            onChange={(e) => console.log("File selected:", e.target.files[0])}
            />
        </div>
    </div>
    );
}

export default App;