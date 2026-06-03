import { CheckCircle2, Mic } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import type { AnimalFormData, AnimalStatus } from "@/lib/ration-advisory-session";
import { isAnimalFilled } from "@/lib/ration-advisory-session";
import { getAnimalFieldLabels, localizedStatusLabel } from "@/lib/ration-advisory-labels";
import { applyStatusMilkDefaults } from "@/lib/parse-animal-voice";
import type { RationLine } from "@/lib/ration-calculator";

interface Props {
  data: AnimalFormData;
  onChange: (patch: Partial<AnimalFormData>) => void;
  onVoice: (b64: string, mime: string) => void;
  transcribing?: boolean;
  readOnly?: boolean;
  showRation?: RationLine[];
  dailyCost?: number;
  lang?: string | null;
}

export function HerdAnimalBlock({
  data,
  onChange,
  onVoice,
  transcribing = false,
  readOnly = false,
  showRation,
  dailyCost,
  lang,
}: Props) {
  const L = getAnimalFieldLabels(lang);
  const filled = isAnimalFilled(data);
  const milkDisabled = data.status !== "in_milk";

  const statusOptions: { value: AnimalStatus; label: string }[] = [
    { value: "in_milk", label: L.stageInMilk },
    { value: "dry", label: L.stageDry },
    { value: "pregnant", label: L.stagePregnant },
    { value: "heifer", label: L.stageHeifer },
  ];

  const handleStatusChange = (status: AnimalStatus) => {
    onChange({
      status,
      milkLitres: applyStatusMilkDefaults(status, data.milkLitres),
    });
  };

  return (
    <div className={`rounded-lg border bg-card shadow-sm overflow-hidden ${filled ? "border-emerald-500/50" : "border-border"}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-800/10 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm text-emerald-900 dark:text-emerald-100">
            {L.animal(data.index)}
          </span>
          {filled && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Details filled" />}
        </div>
        {!readOnly && (
          <div className="shrink-0 flex items-center gap-1">
            {transcribing ? (
              <span className="text-xs text-muted-foreground animate-pulse px-2">{L.listening}</span>
            ) : (
              <VoiceRecorder
                onRecorded={(b64, mime) => onVoice(b64, mime)}
                disabled={transcribing}
              />
            )}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2.5 text-sm" lang={lang ?? undefined}>
        {!readOnly && (
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <Mic className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {L.micHint}
          </p>
        )}

        {data.voiceTranscript && !readOnly && (
          <p className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
            {L.heard}: &ldquo;{data.voiceTranscript.slice(0, 120)}{data.voiceTranscript.length > 120 ? "…" : ""}&rdquo;
          </p>
        )}

        <Field label={L.breed}>
          {readOnly ? (
            <span>{data.breed || "—"}</span>
          ) : (
            <input
              value={data.breed}
              onChange={(e) => onChange({ breed: e.target.value })}
              placeholder={L.breedPh}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </Field>

        <Field label={L.age}>
          {readOnly ? (
            <span>{data.ageYears ? `${data.ageYears}` : "—"}</span>
          ) : (
            <input
              value={data.ageYears}
              onChange={(e) => onChange({ ageYears: e.target.value })}
              placeholder={L.agePh}
              inputMode="decimal"
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </Field>

        <Field label={L.stage}>
          {readOnly ? (
            <span>{localizedStatusLabel(data.status, lang)}</span>
          ) : (
            <select
              value={data.status}
              onChange={(e) => handleStatusChange(e.target.value as AnimalStatus)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{L.stageSelect}</option>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </Field>

        <Field label={L.gaabhinCount}>
          {readOnly ? (
            <span>{data.lactationNumber || "—"}</span>
          ) : (
            <input
              value={data.lactationNumber}
              onChange={(e) => onChange({ lactationNumber: e.target.value })}
              placeholder={L.gaabhinPh}
              inputMode="numeric"
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </Field>

        <Field label={L.milk}>
          {readOnly ? (
            <span>{data.status === "in_milk" ? `${data.milkLitres} L` : L.milkZeroNote}</span>
          ) : (
            <input
              value={milkDisabled ? "0" : data.milkLitres}
              onChange={(e) => onChange({ milkLitres: e.target.value })}
              disabled={milkDisabled}
              placeholder={milkDisabled ? L.milkZeroNote : L.milkPh}
              inputMode="decimal"
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          )}
        </Field>

        {showRation && showRation.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1.5">
              {L.dailyShare}
            </p>
            <ul className="space-y-0.5 text-xs">
              {showRation.map((r) => (
                <li key={r.key} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="font-medium tabular-nums">{r.asFeKg} kg</span>
                </li>
              ))}
            </ul>
            {dailyCost != null && (
              <p className="text-xs text-muted-foreground mt-1.5">≈ ₹{dailyCost.toFixed(0)}/day</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</label>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
