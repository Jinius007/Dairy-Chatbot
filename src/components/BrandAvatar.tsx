import { Milk } from "lucide-react";

type Size = "sm" | "md" | "lg";

const box: Record<Size, string> = {
  sm: "w-9 h-9",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const icon: Record<Size, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

/** NDDB-styled app avatar — rounded square, not a chat-app circle. */
export function BrandAvatar({
  size = "md",
  variant = "surface",
  className = "",
}: {
  size?: Size;
  variant?: "header" | "surface" | "primary";
  className?: string;
}) {
  const styles =
    variant === "header"
      ? "bg-white/15 border border-white/25 text-white"
      : variant === "primary"
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-accent text-primary border border-primary/15";

  return (
    <div
      className={`${box[size]} rounded-xl flex items-center justify-center shrink-0 ${styles} ${className}`}
      aria-hidden
    >
      <Milk className={icon[size]} strokeWidth={2.25} />
    </div>
  );
}
