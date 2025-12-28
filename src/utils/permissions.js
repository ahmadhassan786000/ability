import * as Permissions from "expo-permissions";

export const requestAudioPermission = async () => {
  const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
  return status === "granted";
};
