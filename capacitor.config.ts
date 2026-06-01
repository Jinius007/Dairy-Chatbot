import type { CapacitorConfig } from "@capacitor/core";

/** Loads the live Vercel site — same backend/APIs as the website, no duplicate deploy. */
const config: CapacitorConfig = {
  appId: "in.coop.pashumitra",
  appName: "Pashu Mitra",
  webDir: "dist",
  server: {
    url: "https://dairy-mitr.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
