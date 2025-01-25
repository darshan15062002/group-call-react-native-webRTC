import { useCallback, useEffect, useRef, useState } from "react";
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from "react-native-webrtc";
import { io, Socket } from "socket.io-client";
import { Alert, SafeAreaView } from "react-native";
import VideoStreamView from "../components/VideoStreamView";
import CallControls from "../components/CallControls";

const configuration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'stun:stun1.l.google.com:19302',
    },
    {
      urls: 'stun:stun2.l.google.com:19302',
    },
  ],
  iceCandidatePoolSize: 10,
};

const VideoCallScreen = ({ route, navigation }: any) => {
  const { email, roomId, self } = route.params;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map()
  );
  const [localMicOn, setLocalMicOn] = useState(true);
  const [localWebcamOn, setLocalWebcamOn] = useState(true);

  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const pendingCandidates = useRef(new Map<string, RTCIceCandidate[]>());

  /** Initialize the local media stream and socket */
  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Access camera and microphone
        const newStream = await mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        setStream(newStream);

        // Connect to the signaling server
        const newSocket = io("https://group-call-react-native-webrtc.onrender.com");
        setSocket(newSocket);

        return () => {
          newSocket.close();
          newStream.getTracks().forEach((track) => track.stop());
        };
      } catch (error) {
        console.error("Error initializing call:", error);
        Alert.alert("Error", "Failed to access camera or microphone");
      }
    };

    initializeCall();
  }, []);

  /** Configure socket event listeners */
  useEffect(() => {
    if (socket) {
      socket.on("participant_joined", handleNewUserJoin);
      socket.on("incomming_call", handleIncomingCall);
      socket.on("call_accepted", handleCallAccepted);
      socket.on("call_ended", handleEndCall);
      socket.on("ice_candidate", handleIceCandidate);
      socket.on("join_error", handleJoinError);

      return () => {
        socket.off("participant_joined", handleNewUserJoin);
        socket.off("incomming_call", handleIncomingCall);
        socket.off("call_accepted", handleCallAccepted);
        socket.off("call_ended", handleEndCall);
        socket.off("ice_candidate", handleIceCandidate);
        socket.off("join_error", handleJoinError);
      };
    }
  }, [socket]);

  /** Join the call when socket is ready */
  useEffect(() => {
    if (socket && email && roomId) {
      if (self) {
        socket.emit("create_group_call", { room_id: roomId, email_id: email, self });
      } else {
        socket.emit("join_group_call", {
          room_id: roomId,
          participant_email: email,
          self,
        });
      }
    }
  }, [socket, email, roomId, self]);

  /** Create a new peer connection */
  const createPeerConnection = (remoteEmail: string) => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("ice_candidate", {
          email_id: remoteEmail,
          myEmail: email,
          room_id: roomId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => {
          const newStreams = new Map(prev);
          newStreams.set(remoteEmail, event.streams[0]);
          return newStreams;
        });
      }
    };

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    peerConnections.current.set(remoteEmail, pc);
    return pc;
  };
  const handleJoinError = (data: any) => {
    console.log(data, 'Error while joining room');
    Alert.alert(data.message);
    handleEndCall();
  };



  /** Handle a new user joining */
  // step-1 ----------------------------------
  //when a new user joins the call, the server will emit a participant_joined event
  // with the email of the new participant.
  const handleNewUserJoin = async ({ participant_email }: any) => {
    try {
      if (peerConnections.current.has(participant_email)) return;

      const pc = createPeerConnection(participant_email);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit("call_user", {
        email_id: participant_email,
        room_id: roomId,
        myEmail: email,
        offer,
      });
    } catch (error) {
      console.error("Error in handleNewUserJoin:", error);
    }
  };

  /** Handle incoming call offer */
  const handleIncomingCall = async ({ fromEmail, offer }: any) => {
    try {
      const pc = createPeerConnection(fromEmail);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit("call_accepted", {
        email_id: fromEmail,
        myEmail: email,
        room_id: roomId,
        ans: answer,
      });

      // Process any queued ICE candidates
      processPendingCandidates(fromEmail);
    } catch (error) {
      console.error("Error in handleIncomingCall:", error);
    }
  };

  /** Handle call acceptance */
  const handleCallAccepted = async ({ fromEmail, ans }: any) => {
    const pc = peerConnections.current.get(fromEmail);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(ans));
      processPendingCandidates(fromEmail);
    }
  };

  /** Handle incoming ICE candidates */
  const handleIceCandidate = async ({ fromEmail, candidate }: any) => {
    const pc = peerConnections.current.get(fromEmail);
    if (pc) {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        queueIceCandidate(fromEmail, candidate);
      }
    }
  };

  /** Queue ICE candidates for later processing */
  const queueIceCandidate = (email: string, candidate: RTCIceCandidate) => {
    const candidates = pendingCandidates.current.get(email) || [];
    candidates.push(candidate);
    pendingCandidates.current.set(email, candidates);
  };

  /** Process queued ICE candidates */
  const processPendingCandidates = async (email: string) => {
    const pc = peerConnections.current.get(email);
    const candidates = pendingCandidates.current.get(email) || [];
    for (const candidate of candidates) {
      await pc?.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidates.current.delete(email);
  };

  /** End the call */
  const handleEndCall = () => {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setRemoteStreams(new Map());

    navigation.goBack();
  };

  const toggleMic = useCallback(() => {
    setLocalMicOn((prev) => {
      stream?.getAudioTracks().forEach((track) => (track.enabled = !prev));
      return !prev;
    });
  }, [stream]);

  const toggleCamera = useCallback(() => {
    setLocalWebcamOn((prev) => {
      stream?.getVideoTracks().forEach((track) => (track.enabled = !prev));
      return !prev;
    });
  }, [stream]);

  const switchCamera = useCallback(() => {
    stream?.getVideoTracks().forEach((track) => {
      // @ts-ignore: React Native WebRTC-specific method
      track._switchCamera();
    });
  }, [stream]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <VideoStreamView
        stream={stream}
        remoteStreams={remoteStreams}
        localWebcamOn={localWebcamOn}
      />
      <CallControls
        localMicOn={localMicOn}
        localWebcamOn={localWebcamOn}
        toggleMic={toggleMic}
        toggleCamera={toggleCamera}
        handleHangout={() => {
          socket?.emit("end-call", { room_id: roomId });
          handleEndCall();
        }}
      />
    </SafeAreaView>
  );
};

export default VideoCallScreen;
