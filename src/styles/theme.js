import { Colors } from "./colors";
import { Fonts } from "./fonts";

export const createTheme = (mode = "light") => {
  const palette = Colors[mode];

  return {
    mode,
    colors: palette,
    fonts: Fonts,

    spacing: (value) => value * 8,

    radius: {
      sm: 6,
      md: 12,
      lg: 20,
    },
  };
};
