import React from 'react';
import {MediaStream, RTCView} from 'react-native-webrtc';
import {View, StyleSheet} from 'react-native';

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


  return (
    <View style={styles.container}>
      {/* When no remote streams, show local stream full screen */}
      {remoteStreams.size === 0 && localWebcamOn && stream && (
        <RTCView
          style={styles.fullScreenVideo}
          streamURL={stream.toURL()}
          objectFit={'cover'}
          mirror={true}
        />
      )}

      {/* When there are remote streams */}
      {remoteStreams.size > 0 && (
        <View style={styles.gridContainer}>
          {/* Grid of remote streams */}
          {Array.from(remoteStreams).map(([peerId, remoteStream]) => (
            <View
              key={peerId}
              style={[
                styles.remoteVideo,
                // Adjust grid layout based on number of participants
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

          {/* Local stream as picture-in-picture */}
          {stream && localWebcamOn && (
            <RTCView
              streamURL={stream.toURL()}
              style={styles.localVideoOverlay}
              objectFit="cover"
              mirror={true}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fullScreenVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  halfScreen: {
    width: '50%',
    height: '50%',
  },
  quarterScreen: {
    width: '50%',
    height: '50%',
  },
  remoteVideo: {
    overflow: 'hidden',
  },
  localVideoOverlay: {
    height: 150,
    width: 100,
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default VideoStreamView;
