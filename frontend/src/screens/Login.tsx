import React, { useState } from 'react';
import {
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

function Login({ navigation }: any): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMakeConnection = (isSelf: boolean) => {
    // Validate inputs before navigating
    // if (!isSelf && !email.trim()) {
    //   alert('Please enter an email');
    //   return;
    // }

    if (!isSelf && !roomId.trim()) {
      alert('Please enter a Room ID');
      return;
    }

    const uniqueId = Math.random().toString(36).substring(2, 8);

    !isSelf && setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('VideoCall', {
        email: `user_${uniqueId}`,
        roomId: isSelf ? uniqueId : roomId,
        self: isSelf,
      });
    }, 500);
    // setTimeout(() => {
    //   setIsLoading(false);
    //   navigation.navigate('VideoCall', {
    //     email: email,
    //     roomId: roomId,
    //     self: isSelf,
    //   });
    // }, 500);

  };



  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <View style={{ height: 200, width: 200, borderRadius: 100, top: -100, position: 'absolute', backgroundColor: '#FFD65A' }} />
        <View style={styles.card}>
          <Text style={styles.title}>Join or Create a Room</Text>
          <TouchableOpacity onPress={() => handleMakeConnection(true)}>
            <View
              // colors={["#6a11cb", "#2575fc"]}
              style={styles.button}
            >

              <Text style={styles.buttonText}>Create Room</Text>
            </View>

          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20, borderBottomColor: '#fff', borderBottomWidth: 1, width: '90%' }} />


          {/* <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          /> */}

          <TextInput
            style={styles.input}
            placeholder="Enter Room ID"
            placeholderTextColor="#aaa"
            value={roomId}
            onChangeText={setRoomId}
          />

          <View style={styles.buttonContainer}>


            <TouchableOpacity onPress={() => handleMakeConnection(false)}>
              <View
                // colors={["#ff416c", "#ff4b2b"]}
                style={styles.button}
              >
                {isLoading && <ActivityIndicator size="small" color="#16C47F" animating={isLoading} />}
                <Text style={styles.buttonText}>Join Room</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 200, width: 200, borderRadius: 100, bottom: -100, right: 0, position: 'absolute', backgroundColor: '#16C47F' }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  keyboardContainer: {
    width: "100%",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    zIndex: 10,
    backgroundColor: "#454545",
    elevation: 20,
    padding: 20,
    borderRadius: 15,
    borderColor: "#454545",
    borderWidth: 1,
    alignItems: "center",


  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  input: {
    height: 50,
    width: "90%",
    borderColor: "#444",
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: "#2a2a2a",
    color: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "90%",
    marginTop: 10,
  },
  button: {
    flexDirection: "row",
    padding: 15,
    borderColor: "white",
    borderWidth: 1,
    borderRadius: 10,

  },

  buttonText: {

    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
});

export default Login;
