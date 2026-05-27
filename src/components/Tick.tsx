import { Check, CheckCheck } from "lucide-react";

export const Tick = ({ read = true }: { read?: boolean }) =>
  read ? <CheckCheck className="w-4 h-4 text-tick-read inline" /> : <Check className="w-4 h-4 text-tick-sent inline" />;
