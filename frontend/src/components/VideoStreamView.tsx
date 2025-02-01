import React, { useEffect, useRef, useState } from 'react';
import { MediaStream, RTCView } from 'react-native-webrtc';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';

interface VideoStreamViewProps {
  stream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  localWebcamOn: boolean;
}

const VideoStreamView: React.FC<VideoStreamViewProps> = ({
  stream,
  remoteStreams,
  localWebcamOn,
}) => {
  console.log(remoteStreams.size, 'remoteStreams.size');
  const pan = useRef(new Animated.ValueXY({ x: 50, y: 100 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
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

  return (
    <View style={styles.container}>
      <View style={{ height: 200, width: 200, borderRadius: 100, top: -100, position: 'absolute', backgroundColor: '#FFD65A' }} />
      <View style={styles.streamContainer}>
        {/* When no remote streams, show local stream full screen */}
        {remoteStreams.size === 0 && localWebcamOn && stream && (
          <View style={{ flex: 1, margin: 10 }}>
            <RTCView
              style={[styles.remoteVideo, styles.fullScreenVideo]}

              streamURL={stream.toURL()}
              objectFit={'cover'}
              mirror={true}
            />
          </View>

        )}

        {/* When there are remote streams */}
        {remoteStreams.size > 0 && (
          <View style={styles.gridContainer}>
            {/* Grid of remote streams */}
            {Array.from(remoteStreams).map(([peerId, remoteStream]) => (
              <View
                key={peerId}
                style={[
                  styles.remoteVideo, {
                    marginTop: 10, overflow: 'hidden',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: 'black',
                    borderRadius: 10,
                  },
                  remoteStreams.size === 1 && styles.fullScreenVideo,
                  remoteStreams.size === 2 && styles.halfScreen,
                  remoteStreams.size > 2 && styles.quarterScreen,
                ]}>
                <RTCView
                  streamURL={remoteStream?.toURL()}
                  style={styles.fullScreenVideo}
                  objectFit={'cover'}
                  mirror={false}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Local stream as picture-in-picture */}
      {stream && remoteStreams.size > 0 && localWebcamOn && (
        <Animated.View
          style={[styles.draggableContainer, pan.getLayout()]}
          {...panResponder.panHandlers}
        >
          <RTCView
            objectFit='cover'
            style={styles.localVideoStream}
            zOrder={1}
            mirror={true}
            streamURL={stream.toURL()}
          />
        </Animated.View>
      )}
      <View style={{ height: 200, width: 200, borderRadius: 100, bottom: -100, right: 0, position: 'absolute', backgroundColor: '#16C47F' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#212121',
    flex: 1,
    marginBottom: 100
  },
  streamContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,

  },
  draggableContainer: {
    position: "absolute",
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
  localVideoStream: {
    backgroundColor: 'black',
    borderRadius: 10,
    width: "100%",
    height: "100%",
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 10
  },
  fullScreenVideo: {
    flex: 1,
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
  remoteVideo: {
    overflow: 'hidden',
    zIndex: 1,
  },
});

export default VideoStreamView;