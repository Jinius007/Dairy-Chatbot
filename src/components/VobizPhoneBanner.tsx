import { PhoneCall } from "lucide-react";
import { formatVobizPhoneDisplay, getVobizPhoneNumber, vobizTelUrl } from "@/lib/vobiz-phone";

export function VobizPhoneBanner() {
  const phone = getVobizPhoneNumber();
  if (!phone) return null;

  return (
    <a
      href={vobizTelUrl(phone)}
      className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2.5 text-sm text-foreground shadow-sm transition hover:bg-primary/12"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <PhoneCall className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight">Call on phone</span>
        <span className="block text-xs opacity-80">Speak in your language — same AI advisor</span>
      </span>
      <span className="shrink-0 font-mono text-sm font-semibold tracking-wide text-primary">
        {formatVobizPhoneDisplay(phone)}
      </span>
    </a>
  );
}
