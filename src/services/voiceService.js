import { AudioRecorder } from "expo-audio";
import * as Speech from "expo-speech";

export const speak = (text) => {
  Speech.speak(text);
};

export const recordVoice = async () => {
  const permission = await AudioRecorder.requestPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Permission denied");

  const recording = new AudioRecorder();
  await recording.prepareAsync();
  await recording.startAsync();

  return recording;
};

export const stopRecording = async (recording) => {
  await recording.stopAsync();
  const uri = recording.getURI();
  return uri;
};
