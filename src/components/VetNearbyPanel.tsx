import type { VetProfessional } from "@/lib/vet-types";
import {
  formatPhoneDisplay,
  locationLabel,
  telUrl,
  whatsAppUrl,
} from "@/lib/vet-types";
import { MapPin, Phone, Stethoscope, UserRound, Video } from "lucide-react";

interface Props {
  vets: VetProfessional[];
  loading?: boolean;
  lang?: string;
  onRetry?: () => void;
}

const labels = {
  hi: {
    title: "आपके पास के पशु चिकित्सक / पैरावेट",
    vet: "पशु चिकित्सक",
    paravet: "पैरावेट",
    exp: "अनुभव",
    years: "वर्ष",
    km: "किमी दूर",
    waCall: "WhatsApp कॉल",
    waVideo: "WhatsApp वीडियो",
    phone: "फ़ोन",
    none: "कोई पास में नहीं मिला। कृपया जिला पशु अस्पताल से संपर्क करें।",
    loading: "नज़दीकी डॉक्टर खोज रहे हैं…",
  },
  en: {
    title: "Nearest vets & paravets near you",
    vet: "Veterinarian",
    paravet: "Paravet",
    exp: "Experience",
    years: "years",
    km: "km away",
    waCall: "WhatsApp Call",
    waVideo: "WhatsApp Video",
    phone: "Phone",
    none: "No professionals found nearby. Contact your district veterinary hospital.",
    loading: "Finding nearest doctors…",
  },
};

function L(lang: string | undefined) {
  return lang === "en" ? labels.en : labels.hi;
}

export function VetNearbyPanel({ vets, loading, lang, onRetry }: Props) {
  const t = L(lang);

  if (loading) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        {t.loading}
      </div>
    );
  }

  if (!vets.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {t.none}
        {onRetry && (
          <button type="button" onClick={onRetry} className="block mt-2 underline text-primary">
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-primary flex items-center gap-2">
        <Stethoscope className="w-4 h-4" />
        {t.title}
      </div>
      {vets.map((v) => {
        const waText =
          lang === "en"
            ? `Hello ${v.name}, I need help with my animal's health via PashuMitra.`
            : `नमस्ते ${v.name}, PashuMitra से मेरे पशु की समस्या के लिए सलाह चाहिए।`;
        return (
          <div
            key={v.id}
            className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-foreground">{v.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <UserRound className="w-3 h-3" />
                  {v.type === "vet" ? t.vet : t.paravet}
                  {v.distanceKm != null && (
                    <span className="ml-2 text-primary">• {v.distanceKm} {t.km}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>{v.qualification} • {t.exp}: {v.yearsExperience} {t.years}</div>
              <div className="flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{locationLabel(v)}</span>
              </div>
              <div>{formatPhoneDisplay(v.phone)}</div>
              <div className="opacity-75">Reg: {v.registrationNumber}</div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={whatsAppUrl(v.phone, waText)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] text-white px-3 py-1.5 text-xs font-medium hover:opacity-90"
              >
                <Phone className="w-3.5 h-3.5" />
                {t.waCall}
              </a>
              <a
                href={whatsAppUrl(v.phone, `${waText} (video consult)`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#128C7E] text-white px-3 py-1.5 text-xs font-medium hover:opacity-90"
              >
                <Video className="w-3.5 h-3.5" />
                {t.waVideo}
              </a>
              <a
                href={telUrl(v.phone)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Phone className="w-3.5 h-3.5" />
                {t.phone}
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
