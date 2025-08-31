// VideoCallScreen.livekit.tsx
import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, View, Alert } from 'react-native';
import { Room } from 'livekit-client';
import { useRoom, VideoView, AudioSession, registerGlobals, log } from '@livekit/react-native';
import { Track } from 'livekit-client';
import CallControls from '../components/CallControls';
import inCallManager from 'react-native-incall-manager';

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

    useEffect(() => {
        let mounted = true;
        const start = async () => {
            try {
                await AudioSession.startAudioSession(); // sets up native audio session
                const resp = await fetch(`${BACKEND_TOKEN_ENDPOINT}?room=${encodeURIComponent(roomId)}&identity=${encodeURIComponent(email)}`);
                console.log('Token response:', resp);
                const { token, url } = await resp.json();
                console.log('Token:', token);
                console.log('URL:', url);
                const wsUrl = url || 'wss://group-call-f04zh1cl.livekit.cloud'; // prefer server-provided url or put your project url here

                await room.connect(wsUrl, token, { autoSubscribe: true });
                // enable mic + camera (creates and publishes tracks)
                await room.localParticipant.setMicrophoneEnabled(true);
                await room.localParticipant.setCameraEnabled(true);

                // optionally set attributes/metadata:
                await room.localParticipant.setMetadata(JSON.stringify({ email }));

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
            <View style={{ flex: 1 }}>
                {localVideoTrack ? (
                    <VideoView style={{ flex: 1 }} videoTrack={localVideoTrack} />
                ) : null}
                {participants.map((p) => {
                    // Get the remote camera publication
                    const publication = p.getTrackPublication(Track.Source.Camera);
                    const track = publication?.videoTrack;

                    return track ? (
                        <VideoView
                            key={p.identity}
                            style={{ width: 160, height: 120, margin: 5, borderRadius: 8 }}
                            videoTrack={track}
                        />
                    ) : null;
                })}


            </View>

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
        </SafeAreaView>
    );
};

export default VideoCallScreenLivekit;
