import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import jsPDF from "jspdf";

const socket = io("http://localhost:5000");

const App = () => {
  const [rollNumber, setRollNumber] = useState("");
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState({});
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localStream = useRef(null);
  const peerConnections = useRef({});

  useEffect(() => {
    if (!rollNumber) return;

    // Clean up existing listeners
    socket.off("update-participants");
    socket.off("new-user");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("chat-message");

    // Set up listeners
    socket.on("update-participants", (users) => {
      console.log("Updated participants list:", users);
      setActiveParticipants(users);

      users.forEach((user) => {
        if (user !== rollNumber && !peerConnections.current[user]) {
          console.log(`Setting up peer connection with ${user}`);
          setupPeerConnection(user, rollNumber < user);
        }
      });

      Object.keys(peerConnections.current).forEach((user) => {
        if (!users.includes(user) && user !== rollNumber) {
          console.log(`Participant left: ${user}`);
          peerConnections.current[user].close();
          delete peerConnections.current[user];

          setParticipants((prev) => {
            const updated = { ...prev };
            delete updated[user];
            return updated;
          });
        }
      });
    });

    socket.on("new-user", (newUser) => {
      console.log("New user joined:", newUser);
      if (newUser !== rollNumber && !peerConnections.current[newUser]) {
        setupPeerConnection(newUser, rollNumber < newUser);
      }
    });

    socket.on("offer", async ({ from, offer }) => {
      console.log(`Received offer from: ${from}`);
      if (!peerConnections.current[from]) {
        setupPeerConnection(from, false);
      }
      const pc = peerConnections.current[from];
      if (pc.signalingState === "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { to: from, answer });
      }
    });

    socket.on("answer", async ({ from, answer }) => {
      console.log(`Received answer from: ${from}`);
      const pc = peerConnections.current[from];
      if (pc && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      console.log(`Received ICE candidate from: ${from}`);
      const pc = peerConnections.current[from];
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("update-participants");
      socket.off("new-user");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("chat-message");
    };
  }, [rollNumber]);

  const setupPeerConnection = (id, initiateOffer = false) => {
    console.log(`Setting up connection with ${id}, initiateOffer: ${initiateOffer}`);

    if (peerConnections.current[id]) {
      console.log(`Connection with ${id} already exists`);
      return;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
      ],
    });

    peerConnections.current[id] = pc;

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setParticipants((prev) => {
          const updated = { ...prev, [id]: event.streams[0] };
          console.log("Updated participants state:", updated);
          return updated;
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: id, candidate: event.candidate });
      }
    };

    pc.onnegotiationneeded = async () => {
      if (initiateOffer) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { to: id, offer: pc.localDescription });
        } catch (err) {
          console.error(`Error during negotiation with ${id}:`, err);
        }
      }
    };

    if (initiateOffer) {
      setTimeout(async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { to: id, offer: pc.localDescription });
        } catch (err) {
          console.error(`Error creating offer for ${id}:`, err);
        }
      }, 1000);
    }
  };

  const joinMeet = () => {
    if (!rollNumber.trim()) {
      alert("Please enter your roll number to join");
      return;
    }

    socket.emit("join-room", rollNumber, (response) => {
      if (response.error) {
        alert(response.error);
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream.current = stream;
          setParticipants((prev) => ({ ...prev, [rollNumber]: stream }));
          setJoined(true);
          socket.emit("new-user", rollNumber);
        })
        .catch((error) => {
          console.error("Error accessing media devices:", error);
          alert("Could not access camera or microphone. Please check permissions.");
        });
    });
  };

  const sendMessage = () => {
    if (message.trim()) {
      const messageData = {
        rollNumber,
        message,
        timestamp: new Date().toISOString(),
      };
      socket.emit("chat-message", messageData);
      setMessage("");
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTracks = localStream.current.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = !track.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTracks = localStream.current.getVideoTracks();
      videoTracks.forEach((track) => (track.enabled = !track.enabled));
      setIsVideoOff(!isVideoOff);
    }
  };

  const leaveRoom = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};

    setParticipants({});
    setJoined(false);
    setMessages([]);

    socket.disconnect();
    socket.connect();
  };

  const downloadAttendance = () => {
    const doc = new jsPDF();

    // Set the title
    doc.setFontSize(18);
    doc.text("Attendance List", 10, 10);

    // Set the font size for the content
    doc.setFontSize(12);

    // Add the list of attendees
    const attendees = Object.keys(participants);
    attendees.forEach((attendee, index) => {
      doc.text(`${index + 1}. ${attendee}`, 10, 20 + (index * 10));
    });

    // Save the PDF
    doc.save("attendance.pdf");
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Video Chat Room</h1>

      {!joined ? (
        <div style={styles.joinContainer}>
          <h2 style={styles.joinTitle}>Join Meeting</h2>
          <div style={styles.joinForm}>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter Roll Number"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && joinMeet()}
            />
            <button style={styles.joinButton} onClick={joinMeet}>
              Join Room
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.mainContainer}>
          <div style={styles.videoContainer}>
            <div style={styles.videoHeader}>
              <h2 style={styles.videoTitle}>Participants ({Object.keys(participants).length})</h2>
              <div style={styles.controls}>
                <button
                  style={{ ...styles.controlButton, backgroundColor: isMuted ? "#ef4444" : "#4b5563" }}
                  onClick={toggleMute}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
                <button
                  style={{ ...styles.controlButton, backgroundColor: isVideoOff ? "#ef4444" : "#4b5563" }}
                  onClick={toggleVideo}
                >
                  {isVideoOff ? "Turn Video On" : "Turn Video Off"}
                </button>
                <button style={{ ...styles.controlButton, backgroundColor: "#dc2626" }} onClick={leaveRoom}>
                  Leave
                </button>
                <button
                  style={{ ...styles.controlButton, backgroundColor: "#10b981" }}
                  onClick={downloadAttendance}
                >
                  Download Attendance
                </button>
              </div>
            </div>

            <div style={styles.videoGrid}>
              {Object.entries(participants).map(([id, stream]) => (
                <div key={id} style={styles.videoWrapper}>
                  <video
                    style={styles.video}
                    autoPlay
                    playsInline
                    muted={id === rollNumber}
                    ref={(el) => {
                      if (el && stream) {
                        el.srcObject = stream;
                      }
                    }}
                  />
                  <div style={styles.videoOverlay}>
                    <div style={styles.videoInfo}>
                      <span style={styles.videoId}>{id === rollNumber ? `Your ID: (${id})` : id}</span>
                      {id === rollNumber && (
                        <div style={styles.videoStatus}>
                          {isMuted && <span style={styles.statusBadge}>Muted</span>}
                          {isVideoOff && <span style={styles.statusBadge}>No Video</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.chatContainer}>
            <h2 style={styles.chatTitle}>Chat</h2>
            <div style={styles.chatMessages}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.message,
                    alignSelf: msg.rollNumber === rollNumber ? "flex-end" : "flex-start",
                    backgroundColor: msg.rollNumber === rollNumber ? "#dbeafe" : "#f3f4f6",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
  <span style={styles.messageSender}>{msg.rollNumber === rollNumber ? "You" : msg.rollNumber}</span>
  <span style={{ marginLeft: "10px", color: "#6b7280" }}> {/* Add spacing here */}
    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
  </span>
</div>

                  <p style={styles.messageText}>{msg.message}</p>
                </div>
              ))}
            </div>

            <div style={styles.chatInputContainer}>
              <input
                style={styles.chatInput}
                type="text"
                placeholder="Type a message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button style={styles.sendButton} onClick={sendMessage}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "bold",
    textAlign: "center",
    color: "#1e40af",
    marginBottom: "20px",
  },
  joinContainer: {
    maxWidth: "400px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  joinTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "20px",
    color: "#1e40af",
  },
  joinForm: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  input: {
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #d1d5db",
    outline: "none",
    fontSize: "1rem",
  },
  joinButton: {
    padding: "10px",
    borderRadius: "4px",
    backgroundColor: "#1e40af",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
  },
  mainContainer: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "20px",
  },
  videoContainer: {
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  videoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  videoTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#1e40af",
  },
  controls: {
    display: "flex",
    gap: "10px",
  },
  controlButton: {
    padding: "8px 12px",
    borderRadius: "4px",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "600",
  },
  videoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
  },
  videoWrapper: {
    position: "relative",
    backgroundColor: "#000000",
    borderRadius: "8px",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  videoOverlay: {
    position: "absolute",
    bottom: "0",
    left: "0",
    right: "0",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: "8px",
  },
  videoInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#ffffff",
  },
  videoId: {
    fontSize: "0.875rem",
    fontWeight: "600",
  },
  videoStatus: {
    display: "flex",
    gap: "4px",
  },
  statusBadge: {
    fontSize: "0.75rem",
    backgroundColor: "#ef4444",
    padding: "2px 4px",
    borderRadius: "4px",
  },
  chatContainer: {
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
  },
  chatTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: "20px",
  },
  chatMessages: {
    flex: "1",
    overflowY: "auto",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  message: {
    padding: "10px",
    borderRadius: "8px",
    maxWidth: "80%",
  },
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.75rem",
    color: "#6b7280",
    marginBottom: "4px",
  },
  messageSender: {
    fontWeight: "600",
  },
  messageTime: {
    fontStyle: "italic",
  },
  messageText: {
    fontSize: "0.875rem",
  },
  chatInputContainer: {
    display: "flex",
    gap: "10px",
  },
  chatInput: {
    flex: "1",
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #d1d5db",
    outline: "none",
    fontSize: "1rem",
  },
  sendButton: {
    padding: "10px 20px",
    borderRadius: "4px",
    backgroundColor: "#1e40af",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
  },
};

export default App;