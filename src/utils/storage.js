import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveData = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const getData = async (key) => {
  const val = await AsyncStorage.getItem(key);
  return val ? JSON.parse(val) : null;
};

export const removeData = async (key) => {
  await AsyncStorage.removeItem(key);
};
