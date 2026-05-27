import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

interface Props {
  onRecorded: (audioBase64: string, mimeType: string, durationMs: number) => void;
  disabled?: boolean;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

function getSupportedMimeType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
}

export function VoiceRecorder({ onRecorded, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const blobType = mimeType || rec.mimeType || "audio/webm";
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: blobType });
        const buf = await blob.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        const dur = Date.now() - startTimeRef.current;
        stream.getTracks().forEach((t) => t.stop());
        onRecorded(b64, blobType, dur);
      };
      rec.start();
      mediaRef.current = rec;
      startTimeRef.current = Date.now();
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000) as unknown as number;
    } catch {
      alert("Microphone access denied. Please allow mic access to send voice notes.");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
  };

  if (recording) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-full">
        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-mono">{Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}</span>
        <button onClick={stop} className="p-2 rounded-full bg-destructive text-destructive-foreground hover:opacity-90">
          <Square className="w-4 h-4 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      disabled={disabled}
      className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary-dark transition disabled:opacity-50"
      aria-label="Record voice note"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
