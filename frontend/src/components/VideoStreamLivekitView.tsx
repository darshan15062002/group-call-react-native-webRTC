import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';
import {
    VideoView,
    useLocalParticipant,
    useRemoteParticipants,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

const VideoStreamLivekitView: React.FC = () => {
    // Get local participant and remote participants
    const { localParticipant } = useLocalParticipant();
    const remoteParticipants = useRemoteParticipants();

    // Pan for draggable local PiP
    const pan = useRef(new Animated.ValueXY({ x: 50, y: 100 })).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({ x: pan.x['_value'], y: pan.y['_value'] });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
            },
        })
    ).current;

    // Get local video track (camera)
    const localVideoTrack = localParticipant?.getTrackPublication(Track.Source.Camera)?.videoTrack;
    console.log(localVideoTrack, "999999999999999999999999", remoteParticipants);

    return (
        <View style={styles.container}>
            {/* Background bubbles */}
            <View style={styles.topBubble} />

            <View style={styles.streamContainer}>
                {/* No remote participants → show local video fullscreen */}
                {remoteParticipants.length === 0 && localVideoTrack && (
                    <View style={{ ...styles.videoWrapper, ...styles.fullScreen, }}>
                        <VideoView
                            style={{ ...styles.video }}
                            videoTrack={localVideoTrack}
                            mirror
                        />
                    </View>
                )}

                {/* Remote participants grid */}
                {remoteParticipants.length > 0 && (
                    <View style={styles.grid}>
                        {remoteParticipants.map((participant) => {
                            const remoteTrack = participant.getTrackPublication(Track.Source.Camera)?.videoTrack;
                            if (!remoteTrack) return null;

                            return (
                                <View
                                    key={participant.sid}
                                    style={[
                                        styles.videoWrapper,
                                        remoteParticipants.length === 1 && styles.fullScreen,
                                        remoteParticipants.length === 2 && styles.halfScreen,
                                        remoteParticipants.length > 2 && styles.quarterScreen,
                                    ]}
                                >
                                    <VideoView
                                        style={styles.video}
                                        videoTrack={remoteTrack}
                                        mirror={false}
                                    />
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* Local video as draggable PiP */}
            {localVideoTrack && remoteParticipants.length > 0 && (
                <Animated.View
                    style={[styles.draggable, pan.getLayout()]}
                    {...panResponder.panHandlers}
                >
                    <VideoView
                        zOrder={1}
                        style={styles.localVideo}
                        videoTrack={localVideoTrack}
                        mirror
                    />
                </Animated.View>
            )}

            <View style={styles.bottomBubble} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#212121',
        flex: 1,
        marginBottom: 100,
    },
    topBubble: {
        height: 200,
        width: 200,
        borderRadius: 100,
        top: -100,
        position: 'absolute',
        backgroundColor: '#FFD65A',
    },
    bottomBubble: {
        height: 200,
        width: 200,
        borderRadius: 100,
        bottom: -100,
        right: 0,
        position: 'absolute',
        backgroundColor: '#16C47F',
    },
    streamContainer: {
        flex: 1,
        position: 'relative',
        zIndex: 1,

        flexDirection: 'row',
        flexWrap: 'wrap',
        margin: 10,
    },
    video: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    grid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        margin: 10,
    },
    videoWrapper: {
        overflow: 'hidden',

        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'black',
    },
    fullScreen: {
        width: '100%',
        height: '100%',
    },
    halfScreen: {
        width: '100%',
        height: '50%',
    },
    quarterScreen: {
        width: '50%',
        height: '50%',
    },
    draggable: {
        position: 'absolute',
        width: 120,
        height: 160,
        zIndex: 999,
        elevation: 5,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'black',
        borderRadius: 10,
    },
    localVideo: {
        backgroundColor: 'black',
        borderRadius: 10,
        width: '100%',
        height: '100%',
    },
});

export default VideoStreamLivekitView;
