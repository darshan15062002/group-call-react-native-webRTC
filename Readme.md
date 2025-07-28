# 📞 Group Video Call - Signaling & WebRTC Flow


<img width="1308" height="2227" alt="diagram-export-7-28-2025-3_50_56-PM" src="https://github.com/user-attachments/assets/81e3f391-c18e-469c-b1c7-14718a5f8573" />


This document outlines the full signaling and WebRTC flow for a group video calling application. It includes interactions between the user, client, signaling service, media devices, and remote peers.

---

## 🧠 Overview

This flow covers:

- Call initialization
- Local media access
- Signaling handshake
- WebRTC peer connection setup
- ICE candidate exchange
- Media track handling
- End-call teardown

---

## 🧩 Participants

| Component           | Role Description                      |
|---------------------|----------------------------------------|
| 👤 **User**          | End user initiating or receiving call |
| 🖥️ **Client App**     | Video call frontend interface         |
| 🖧 **Signaling Service** | Handles signaling (e.g., Socket.IO)    |
| 🌐 **WebRTC Engine**   | Manages peer connection (RTCPeerConnection) |
| 🎥 **Media Device**    | Camera and microphone devices         |
| 👤 **Remote Peer**     | Other participants in the room        |

---

## 🔄 Call Flow

### 1. **Call Screen Launch**
- **User ➝ Client App**: Opens the video call screen

### 2. **Acquire Local Media**
- **Client App ➝ Media Device**: Requests camera and microphone
- **Media Device ➝ Client App**: Returns local media stream

### 3. **Connect to Signaling Server**
- **Client App ➝ Signaling Service**: Establishes connection
- **Signaling Service ➝ Client App**: Acknowledges connection

---

## 🚪 Join or Create Room

### 🏷️ Host Flow:
- **Client App ➝ Signaling Service**: Create new room
- **Signaling Service ➝ Client App**: Returns room ID

### 👥 Participant Flow:
- **Client App ➝ Signaling Service**: Join existing room
- If room exists:
  - **Signaling Service ➝ Client App**: Join successful
- If room doesn't exist:
  - **Signaling Service ➝ Client App**: Room not found
  - **Client App ➝ User**: Show error and abort

---

## 🌐 WebRTC Peer Connection Setup

### Initialization
- **Client App ➝ WebRTC Engine**: Initialize peer connection

### ICE & SDP Exchange (in parallel)
- **Loop – ICE Gathering**:
  - WebRTC discovers ICE candidates
  - Sends to signaling
  - Signaling forwards to peer
- **SDP Exchange**:
  - Send SDP Offer ➝ Remote Peer
  - Receive SDP Answer ⬅ Remote Peer

### Attach Media Tracks
- **WebRTC Engine ➝ Media Device**: Attach local tracks
- **Media Device ➝ WebRTC Engine**: Confirm success

---

## 📺 Remote Media Handling

### ✅ Call Connected
- **Remote Peer ➝ Client App**: Sends first media frame
- **Client App ➝ User**: Displays video

### ❌ Call Failure
- **Remote Peer ➝ Client App**: Signaling timeout
- **Client App ➝ User**: Show retry option

---

## 🔚 End Call Flow

- **User ➝ Client App**: Tap "End Call"
- **Client App ➝ Signaling Service**: Emit end-call event
- **Signaling Service ➝ Remote Peer**: Notify termination
- **Remote Peer ➝ Client App**: Acknowledge call end
- **Client App ➝ Media Device**: Stop all media tracks
- **Client App ➝ User**: Return to home screen

---

## 📌 Notes

- Signaling uses WebSocket/Socket.IO or similar protocol.
- Media devices use WebRTC APIs: `getUserMedia`, `RTCPeerConnection`.
- TURN/STUN servers are assumed but not shown here.

---

## 🛠 Technologies Used

- **Frontend:** React / React Native / Flutter
- **Backend:** Node.js / Socket.IO / Express
- **WebRTC Engine:** Native WebRTC API
- **Optional Media Server:** Mediasoup / Jitsi / Janus (for scalability)

---

> 📚 This flow helps both frontend and backend developers understand how components interact during a group video call.
