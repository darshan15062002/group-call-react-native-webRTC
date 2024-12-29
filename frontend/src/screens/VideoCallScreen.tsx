import {useEffect, useRef, useState} from 'react';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import {io, Socket} from 'socket.io-client';

import {Alert, SafeAreaView} from 'react-native';
import VideoStreamView from '../components/VideoStreamView';
import CallControls from '../components/CallControls';
import {useUser} from '../hook/useUser';

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
};
const VideoCallScreen = ({route, navigation}: any) => {
  const {user} = useUser();
  const {email, roomId, self} = route.params;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomJoin, setRoomJoin] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteEmailId, setRemoteEmailId] = useState<String>();
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [EventMessage, setEventMessage] = useState<String>('');
  const [localMicOn, setlocalMicOn] = useState(true);
  const [localWebcamOn, setlocalWebcamOn] = useState(true);

  const peerConnections = useRef(new Map<string, RTCPeerConnection>());

  const handleJoinError = (data: any) => {
    console.log(data, 'Error while joining room');
    Alert.alert(data.message);
    handleEndCall();
  };

  // create socket connection and emit with email and code
  const handleMakeConnection = async (
    email: string,
    roomId: string,
    self: boolean = true,
  ) => {
    try {
      let _socket = socket;

      if (!_socket) {
        _socket = io('http://192.168.0.105:8000');
        console.log(_socket, 'Initialized socket');
        setSocket(_socket);
      }

      setEventMessage('Connecting...');
      console.log(roomId, email, self);

      // Use _socket to emit the event
      if (!self) {
        _socket.emit('join_group_call', {
          room_id: roomId,
          participant_email: email,
          self,
        });
      } else {
        _socket.emit('create_group_call', {
          room_id: roomId,
          email_id: email,
          self,
        });
      }
    } catch (error) {
      console.log(error, 'Error while making connection');
    }
  };

  // --------------------------------------------------------------------------------
  // when there is new user with same code on server this even trigger
  // we create offer and send buy socket newly arrived user
  const createOffer = async (pc: any) => {
    if (!peerConnections.current) return;
    try {
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);

      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      // Handle error appropriately
    }
  };

  const handleNewUserJoin = async ({participant_email}: any) => {
    const pc = new RTCPeerConnection(configuration);
    peerConnections.current.set(participant_email, pc);

    // Add local tracks
    stream?.getTracks().forEach(track => pc.addTrack(track, stream));

    if (socket) {
      const offer = await createOffer(pc);
      console.log('new USer Arrive ');
      socket.emit('call_user', {
        participant_email,
        room_id: roomId,
        myEmail: email,
        offer,
      });
      setRemoteEmailId(participant_email);
    }
  };
  // --------------------------------------------------------------------------------------

  // --------------------------------------------------------------------------------------
  // when  newly arrive user receive offer he create ans
  // and send back to user who start calling
  const createAns = async (offer: any, pc: any) => {
    if (!pc) return;
    try {
      // console.log('offer recived to peer', offer);
      const offerDescription = new RTCSessionDescription(offer);
      await pc.setRemoteDescription(offerDescription);
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      return answerDescription;
    } catch (error) {
      console.error('Error creating ans:', error);
    }
  };
  const handleIncommingCall = async (data: any) => {
    if (socket) {
      const {fromEmail, offer} = data;
      const pc = new RTCPeerConnection(configuration);
      peerConnections.current.set(fromEmail, pc);

      // Add local tracks
      stream?.getTracks().forEach(track => pc.addTrack(track, stream));

      const ans = await createAns(offer, pc);

      socket.emit('call_accepted', {
        email_id: fromEmail,
        myEmail: email,
        room_id: roomId,
        ans,
      });
      setRemoteEmailId(fromEmail);
    }
  };
  // --------------------------------------------------------------------------------------

  // --------------------------------------------------------------------------------------
  // when call accepted user Receive the ans of offer
  // set to there remote description
  const handleCallAccepted = async ({ans, fromEmail}: any) => {
    if (peerConnections?.current.get(fromEmail)) {
      try {
        const answerDescription = new RTCSessionDescription(ans);
        peerConnections.current
          .get(fromEmail)
          ?.setRemoteDescription(answerDescription);
      } catch (error) {
        console.error('Error setting setRemoteDescription:', error);
      }
    }
  };
  // --------------------------------------------------------------------------------------

  // --------------------------------------------------------------------------------------
  // when user get connected  with socket by  code and email
  // we get joined_room Event
  // than we start camera and set Room join
  useEffect(() => {
    if (socket) {
      const startStream = async () => {
        try {
          const _stream = await mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
            },
            audio: true,
          });

          setStream(_stream);
        } catch (error) {
          console.error('Error accessing media devices.', error);
        }
      };

      const handleRoomJoined = (data: RoomJoinedData) => {
        setRoomJoin(data.room_id);
        setEventMessage('');
        startStream();
      };

      socket.on('joined_room', handleRoomJoined);

      return () => {
        socket.off('joined_room', handleRoomJoined);
        socket.disconnect(); // Ensure proper disconnection
      };
    }
  }, [socket]);
  // --------------------------------------------------------------------------------------

  useEffect(() => {
    if (socket) {
      socket.on('participant_joined', handleNewUserJoin);
      socket.on('incomming_call', handleIncommingCall);
      socket.on('call_accepted', handleCallAccepted);
      socket.on('call_ended', handleEndCall);
      socket.on('ice_candidate', handleIceCandidate);
      socket.on('join_error', handleJoinError);

      socket.on('group_call_created', (data: any) => {
        console.log(data.room_id, 'group_call_created');
      });

      return () => {
        socket.off('participant_joined', handleNewUserJoin);
        socket.off('incomming_call', handleIncommingCall);
        socket.off('call_accepted', handleCallAccepted);
        socket.off('call_ended', handleEndCall);
        socket.off('ice_candidate', handleIceCandidate);
        socket.off('join_error', handleJoinError);
      };
    }
  }, [socket]);

  const handleIceCandidate = async ({myEmail, fromEmail, candidate}: any) => {
    try {
      if (candidate && peerConnections.current) {
        await peerConnections.current
          .get(fromEmail)
          ?.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding received ICE candidate', error);
    }
  };

  const handleEndCall = () => {
    console.log('call ended');

    // Close the peer connection
    if (peerConnections.current) {
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      stream?.getTracks().forEach(track => track.stop());
    }

    // Stop all local media tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // Reset state variables
    setStream(null);
    setRemoteStream(null);
    setRoomJoin('');

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Login');
    }
  };

  useEffect(() => {
    if (socket && peerConnections.current) {
      for (const [emailOfPeers, pc] of peerConnections.current) {
        pc.onicecandidate = event => {
          if (event.candidate && remoteEmailId) {
            socket.emit('ice_candidate', {
              email_id: emailOfPeers,
              myEmail: email,
              rood_id: roomId,
              candidate: event.candidate,
            });
          }
        };

        pc.ontrack = event => {
          const [remoteStream] = event.streams;

          if (remoteStream) {
            setRemoteStreams(
              prev => new Map(prev.set(emailOfPeers, remoteStream)),
            );
          }
        };

        pc.onconnectionstatechange = () => {
          const connectionState = pc.connectionState;

          if (connectionState === 'connected') {
            console.log('Peers connected');
          } else if (
            connectionState === 'disconnected' ||
            connectionState === 'failed'
          ) {
            console.log('Connection failed or disconnected');
          }
        };
      }
    }
  }, [socket, peerConnections.current]);

  useEffect(() => {
    // const _socket = io('https://ice-server-socket.onrender.com');
    const _socket = io('http://192.168.0.105:8000');
    // _socket.emit('set-status', {code});
    setSocket(_socket);
  }, []);

  function toggleMic() {
    if (stream) {
      setlocalMicOn(prev => !prev);
      stream.getAudioTracks().forEach(track => {
        localMicOn ? (track.enabled = false) : (track.enabled = true);
      });
    }
  }

  // Switch Camera
  // function switchCamera() {
  //   localStream.getVideoTracks().forEach((track) => {
  //     track._switchCamera();
  //   });
  // }

  // Enable/Disable Camera
  function toggleCamera() {
    if (stream) {
      setlocalWebcamOn(prev => !prev);
      stream.getVideoTracks().forEach(track => {
        localWebcamOn ? (track.enabled = false) : (track.enabled = true);
      });
    }
  }

  function switchCamera() {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track._switchCamera();
      });
    }
  }

  useEffect(() => {
    email && roomId && handleMakeConnection(email, roomId, self);
  }, [email, roomId, self]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: 'black',
      }}>
      <VideoStreamView
        stream={stream}
        remoteStream={remoteStream}
        localWebcamOn={localWebcamOn}
      />

      {(remoteStream || stream) && (
        <CallControls
          localMicOn={localMicOn}
          localWebcamOn={localWebcamOn}
          toggleMic={toggleMic}
          toggleCamera={toggleCamera}
          handleHangout={handleHagout}
        />
      )}
    </SafeAreaView>
  );
};

export default VideoCallScreen;
