import type { ElevenLabsConvaiElement } from "@/lib/elevenlabs";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<
        React.HTMLAttributes<ElevenLabsConvaiElement> & {
          "agent-id"?: string;
          "branch-id"?: string;
          variant?: string;
          dismissible?: string;
          "avatar-orb-color-1"?: string;
          "avatar-orb-color-2"?: string;
        },
        ElevenLabsConvaiElement
      >;
    }
  }
}

export {};
