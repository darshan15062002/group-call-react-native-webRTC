import React, { useEffect, useState } from 'react';
import { Clipboard, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';

interface CallControlsProps {
  localMicOn: boolean;
  localWebcamOn: boolean;
  speakerOn: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  handleHangout: () => void;
  toggleSpeaker: () => void;
  joinLink: string;
}

const CallControls: React.FC<CallControlsProps> = ({
  localMicOn,
  localWebcamOn,
  toggleMic,
  toggleSpeaker,
  toggleCamera,
  handleHangout,
  speakerOn,
  joinLink,
}) => {
  const [showJoinLink, setShowJoinLink] = useState(false);

  const copyToClipboard = (text) => {
    Clipboard.setString(text); // Copy text to clipboard
    ToastAndroid.show("Link copied!", ToastAndroid.SHORT); // Show confirmation
  };
  return (
    <View
      style={{
        height: 100,
        width: '100%',
        position: 'absolute',
        bottom: 0,
        zIndex: 100,
        backgroundColor: 'black',
        opacity: 0.7,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
      }}>
      {showJoinLink && (
        <View
          style={{
            position: "absolute",
            top: -60,
            flexDirection: "row",
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: "#222",
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text style={{ color: "white", fontSize: 14, maxWidth: 200 }}>
            {joinLink}
          </Text>
          <TouchableOpacity
            onPress={() => {
              copyToClipboard(joinLink);
              setShowJoinLink(false)
            }}
            style={{
              padding: 6,
              backgroundColor: "#333",
              borderRadius: 8,
            }}
          >
            <Icon name="copy" size={18} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={toggleMic}>
        <Icon
          name={localMicOn ? 'microphone' : 'microphone-slash'}
          size={30}
          color="white"
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={toggleSpeaker}>
        <Feather
          name={speakerOn ? 'volume-2' : 'volume'}
          size={30}
          color="white"
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={toggleCamera}>
        <Feather
          name={localWebcamOn ? 'camera' : 'camera-off'}
          size={30}
          color="white"
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleHangout}
        style={{
          backgroundColor: 'red',
          borderRadius: 50,
          paddingVertical: 10,
          paddingHorizontal: 15,
        }}>
        <Icon name="phone" size={30} color="white" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setShowJoinLink((prev) => !prev) }}>
        <Icon name="share" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default CallControls;
