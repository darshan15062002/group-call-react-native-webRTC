import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Login from './src/screens/Login';
import VideoCallScreen from './src/screens/VideoCallScreen';

import notifee, { AndroidImportance } from '@notifee/react-native';


const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName={'Login'}>
      <Stack.Screen name="Login" component={Login} options={{
        headerShown: false,
      }} />
      <Stack.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{
          headerShown: false,
        }}
        // Ensure email and roomId are passed as route params
        initialParams={{ email: '', roomId: '' }}
      />
    </Stack.Navigator>
  );
}

const linking = {
  prefixes: ['videocall://', 'https://videocall.com'],
  config: {
    screens: {
      VideoCall: 'video-call/:email/:roomId',
    },
  },
};

function App(): React.JSX.Element {
  useEffect(() => {
    async function createChannel() {
      await notifee.createChannel({
        id: 'call',
        name: 'Incoming Call Channel',
        sound: 'ringtone',
        importance: AndroidImportance.HIGH,
      });
    }
    createChannel();
  }, []);

  useEffect(() => {
    async function requestPermission() {
      await notifee.requestPermission();
    }
    requestPermission();
  }, []);

  return (


    <NavigationContainer linking={linking}>
      <AppNavigator />
    </NavigationContainer>

  );
}

export default App;
