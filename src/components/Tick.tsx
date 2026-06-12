import { Check } from "lucide-react";

/** Simple delivery indicator — not a double-tick chat-app pattern. */
export const Tick = ({ read = true }: { read?: boolean }) =>
  read ? (
    <Check className="w-3.5 h-3.5 text-primary inline opacity-75" strokeWidth={2.5} />
  ) : (
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-tick-sent align-middle" aria-hidden />
  );
