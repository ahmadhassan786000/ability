export const formatTimestamp = (ts) => {
  const date = new Date(ts);
  return `${date.getHours()}:${date.getMinutes()}`;
};
