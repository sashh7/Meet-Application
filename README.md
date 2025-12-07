# Video Chat Room Application

A real-time video conferencing application built with React, WebRTC, and Socket.IO that enables multiple participants to join a video meeting, share their camera/audio, and communicate via chat.

## Features

- **Real-time Video Conferencing**: Connect multiple participants using WebRTC peer connections
- **Audio & Video Controls**: Toggle microphone and camera on/off during calls
- **Live Chat**: Send and receive messages in real-time with timestamps
- **Participant Management**: Track active participants in the meeting
- **Attendance Tracking**: Download attendance list as PDF
- **Responsive Design**: Grid-based video layout that adapts to any number of participants
- **Session Management**: Join and leave meetings with roll number identification

## Tech Stack

**Frontend:**
- React 19.0.0
- Socket.IO Client 4.8.1
- jsPDF 3.0.1
- WebRTC API

**Backend:**
- Node.js
- Express 4.21.2
- Socket.IO 4.8.1
- CORS enabled

## Project Structure

```
.
├── frontend/
│   ├── src/
│   │   ├── App.js              # Main application component
│   │   ├── App.css             # Application styling
│   │   ├── App.test.js         # Jest unit tests
│   │   ├── index.js            # React entry point
│   │   ├── index.css           # Global styles
│   │   ├── setupTests.js       # Test configuration
│   │   └── reportWebVitals.js  # Performance monitoring
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── package.json
│   ├── jest.setup.js
│   └── README.md
├── backend/
│   ├── server.js               # Express server & Socket.IO setup
│   └── package.json
└── package.json                # Root package configuration
```

## Installation

### Prerequisites
- Node.js 14+ 
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
node server.js
```

The server will start on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The application will open at `http://localhost:3000`

## Usage

1. **Join a Meeting**:
   - Enter your roll number in the input field
   - Click "Join Room" or press Enter
   - Allow browser permission for camera and microphone

2. **Video Controls** (after joining):
   - **Mute/Unmute**: Toggle your microphone
   - **Turn Video On/Off**: Toggle your camera
   - **Leave**: Exit the meeting

3. **Chat**:
   - Type messages in the chat input
   - Press Enter or click Send
   - Messages include timestamp and sender identification

4. **Download Attendance**:
   - Click "Download Attendance" to generate a PDF with all participants

## How It Works

### WebRTC Connection
- Uses peer-to-peer connections between participants
- STUN/TURN servers for NAT traversal
- Automatic connection establishment when users join

### Socket.IO Events
- `join-room`: User joins the meeting
- `update-participants`: Broadcast participant list updates
- `new-user`: Notify others of a new participant
- `offer/answer`: WebRTC signaling
- `ice-candidate`: ICE candidate exchange
- `chat-message`: Real-time messaging

### State Management
- React hooks for local state
- useRef for media stream and peer connection tracking
- useEffect for socket event listeners

## Testing

Run the test suite:

```bash
cd frontend
npm test
```

The test suite includes:
- Component rendering tests
- User interaction tests
- Media control tests (audio/video toggle)
- Chat functionality tests
- Join/Leave meeting tests
- PDF download tests

## API Endpoints

### Socket.IO Events

**Client to Server:**
- `join-room(rollNumber, callback)` - Join meeting
- `new-user(rollNumber)` - Announce new user
- `offer({to, offer})` - Send WebRTC offer
- `answer({to, answer})` - Send WebRTC answer
- `ice-candidate({to, candidate})` - Send ICE candidate
- `chat-message(messageData)` - Send chat message

**Server to Client:**
- `update-participants(users[])` - Participant list update
- `new-user(rollNumber)` - New participant joined
- `offer({from, offer})` - Receive WebRTC offer
- `answer({from, answer})` - Receive WebRTC answer
- `ice-candidate({from, candidate})` - Receive ICE candidate
- `chat-message(messageData)` - Receive chat message

## Browser Support

- Chrome/Edge 60+
- Firefox 55+
- Safari 11+
- Opera 47+

(Requires WebRTC support)

## Dependencies

### Frontend
- `react` - UI library
- `socket.io-client` - Real-time communication
- `jspdf` - PDF generation
- `@testing-library/react` - Testing utilities

### Backend
- `express` - Web framework
- `socket.io` - Real-time communication
- `cors` - Cross-origin resource sharing

## Troubleshooting

**Camera/Microphone access denied**
- Check browser permissions
- Ensure HTTPS is used (or localhost)
- Verify device permissions in OS settings

**Connection issues**
- Ensure backend server is running
- Check firewall settings
- Verify CORS configuration

**Video not displaying**
- Check WebRTC support in browser
- Verify peer connection status in console
- Check ICE candidate exchange

## Future Enhancements

- Screen sharing capabilities
- Recording functionality
- Meeting scheduling
- User authentication
- Admin controls
- Virtual backgrounds
- Breakout rooms

## License

This project is open source and available under the ISC License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Support

For issues or questions, please open an issue in the repository.
