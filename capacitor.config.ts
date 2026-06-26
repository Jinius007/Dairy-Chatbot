import type { CapacitorConfig } from "@capacitor/core";

/** Android shell — build with VITE_CATALYST_API_URL set; app loads bundled dist (Catalyst Slate + Sarvam backend). */
const config: CapacitorConfig = {
  appId: "in.coop.pashumitra",
  appName: "Pashu Mitra",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};

export default config;
