import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const COLORS = {
  accent: "#4DE1FF",
  ink: "#0A1630",
  text: "#FFFFFF",
} as const;

const montserrat = loadMontserrat("normal", { weights: ["900"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["800"], subsets: ["latin"] });

export const fonts = {
  display: montserrat.fontFamily,
  body: inter.fontFamily,
} as const;
