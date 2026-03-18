// VideoCallScreen.livekit.tsx
import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, View, Alert, PermissionsAndroid, Platform } from 'react-native';
import { createLocalAudioTrack, createLocalVideoTrack, Room } from 'livekit-client';
import { useRoom, VideoView, AudioSession, registerGlobals, log, RoomContext } from '@livekit/react-native';
import { Track } from 'livekit-client';
import CallControls from '../components/CallControls';
import inCallManager from 'react-native-incall-manager';
import VideoStreamLivekitView from '../components/VideoStreamLivekitView';

// IMPORTANT: registerGlobals() should already be called in index.js
// registerGlobals();

const BACKEND_TOKEN_ENDPOINT = 'https://group-call-react-native-webrtc.onrender.com/token'; // change

const VideoCallScreenLivekit = ({ route, navigation }: any) => {
    const { email, roomId } = route.params;
    const [room] = useState(() => new Room()); // one Room instance
    const { participants } = useRoom(room); // hook keeps participants state updated
    const [localMicOn, setLocalMicOn] = useState(true);
    const [localWebcamOn, setLocalWebcamOn] = useState(true);
    const [speakerOn, setSpeakerOn] = useState(true);
    const facingUser = useRef(true); // for switchCamera

    async function requestPermissions() {
        if (Platform.OS === 'android') {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        }
    }


    useEffect(() => {
        let mounted = true;
        const start = async () => {
            try {
                await AudioSession.startAudioSession(); // sets up native audio session
                const resp = await fetch(`${BACKEND_TOKEN_ENDPOINT}?room=${encodeURIComponent(roomId)}&identity=${encodeURIComponent(email)}`);
                // console.log('Token response:', await resp.json());
                const { token, url } = await resp.json();
                console.log('Token:', token);
                console.log('URL:', url);
                const wsUrl = url || 'wss://group-call-f04zh1cl.livekit.cloud'; // prefer server-provided url or put your project url here

                console.log('Connecting to:', wsUrl, 'with token:', token);
                await requestPermissions();

                await room.connect(wsUrl, token, { autoSubscribe: true });





                // const audioTrack = await createLocalAudioTrack();
                // const videoTrack = await createLocalVideoTrack();

                // await room.localParticipant.publishTrack(audioTrack);
                // await room.localParticipant.publishTrack(videoTrack);

                console.log('Room connected, enabling mic and camera...');


                const micResult = await room.localParticipant.setMicrophoneEnabled(true);
                console.log('Mic track created:', micResult);

                const camResult = await room.localParticipant.setCameraEnabled(true);
                console.log('Camera track created:', camResult);

                // await room.localParticipant.setMetadata(JSON.stringify({ email }));

            } catch (err) {
                console.error('LiveKit connect error', err);
                Alert.alert('Call error', 'Failed to join the room');
                navigation.goBack();
            }
        };

        start();

        return () => {
            mounted = false;
            try {
                room.disconnect();
            } catch (e) { }
            AudioSession.stopAudioSession();
        };
    }, [room, roomId, email, navigation]);

    const toggleMic = async () => {
        const newState = !localMicOn;
        await room.localParticipant.setMicrophoneEnabled(newState);
        setLocalMicOn(newState);
    };

    const toggleCamera = async () => {
        const newState = !localWebcamOn;
        await room.localParticipant.setCameraEnabled(newState);
        setLocalWebcamOn(newState);
    };

    const switchCamera = async () => {
        facingUser.current = !facingUser.current;
        // re-enable camera with facingMode (some platforms may require deviceId fallback)
        await room.localParticipant.setCameraEnabled(true, { facingMode: facingUser.current ? 'user' : 'environment' });
    };

    const toggleSpeaker = () => {
        setSpeakerOn((prev) => {
            if (prev) {
                inCallManager.stop();
                inCallManager.setSpeakerphoneOn(false);
            } else {
                inCallManager.start({ media: 'audio' });
                inCallManager.setSpeakerphoneOn(true);
            }
            return !prev;
        });
    };

    const endCall = () => {
        // gracefully disconnect
        try { room.disconnect(); } catch (e) { }
        AudioSession.stopAudioSession();
        navigation.goBack();
    };

    // Render: local participant video first, then remote participants
    const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const localVideoTrack = publication?.track;

    // const localVideoTrack = room.localParticipant?.getTrack(Track.Source.Camera)?.videoTrack;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#212121' }}>
            <RoomContext.Provider value={room}>
                <VideoStreamLivekitView
                    localParticipant={room.localParticipant}
                    remoteParticipants={Array.from(participants?.values())}
                />
                <CallControls
                    localMicOn={localMicOn}
                    localWebcamOn={localWebcamOn}
                    switchCamera={switchCamera}
                    toggleMic={toggleMic}
                    toggleCamera={toggleCamera}
                    toggleSpeaker={toggleSpeaker}
                    speakerOn={speakerOn}
                    joinLink={`https://videocall.com/video-call/${email}/${roomId}`}
                    handleHangout={endCall}
                />
            </RoomContext.Provider>
        </SafeAreaView>
    );
};

export default VideoCallScreenLivekit;
