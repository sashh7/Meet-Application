const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // Enable CORS for all routes

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow frontend to connect
    methods: ["GET", "POST"],
  },
});

let users = {}; // Stores connected users and their socket IDs

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle new user joining the room
  socket.on("join-room", (rollNumber, callback) => {
    if (!rollNumber) {
      return callback({ error: "Roll number is required!" });
    }
    if (users[rollNumber]) {
      return callback({ error: "Roll number already exists!" });
    }

    // Add user to the users object
    users[rollNumber] = socket.id;
    socket.rollNumber = rollNumber;

    // Notify all participants about the updated list
    io.emit("update-participants", Object.keys(users));

    // Notify other participants about the new user
    socket.broadcast.emit("new-user", rollNumber);

    callback({ success: true });
  });

  // Handle WebRTC offer
  socket.on("offer", ({ to, offer }) => {
    if (users[to]) {
      io.to(users[to]).emit("offer", { from: socket.rollNumber, offer });
    } else {
      console.log(`User ${to} not found`);
    }
  });

  // Handle WebRTC answer
  socket.on("answer", ({ to, answer }) => {
    if (users[to]) {
      io.to(users[to]).emit("answer", { from: socket.rollNumber, answer });
    } else {
      console.log(`User ${to} not found`);
    }
  });

  // Handle ICE candidates
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (users[to]) {
      io.to(users[to]).emit("ice-candidate", { from: socket.rollNumber, candidate });
    } else {
      console.log(`User ${to} not found`);
    }
  });

  // Handle chat messages
  socket.on("chat-message", (msg) => {
    io.emit("chat-message", msg);
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.rollNumber) {
      delete users[socket.rollNumber];
      io.emit("update-participants", Object.keys(users)); // Notify remaining participants
    }
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});