import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.container}>
          <StatusBar style="light" backgroundColor="#1F2937" />
          <SafeAreaView style={styles.statusBarArea} edges={['top']}>
            <View style={styles.statusBarBackground} />
          </SafeAreaView>
          <View style={styles.content}>
            <Stack 
              screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 200, // Fast transition
                gestureEnabled: true,
                gestureDirection: 'horizontal',
              }} 
            />
          </View>
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  statusBarArea: {
    backgroundColor: '#1F2937', // Dark gray for status bar area
  },
  statusBarBackground: {
    height: 0, // SafeAreaView handles the height automatically
  },
  content: {
    flex: 1,
    backgroundColor: '#000000',
  },
});