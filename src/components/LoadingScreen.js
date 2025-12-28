import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4e8cff" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  text: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
});