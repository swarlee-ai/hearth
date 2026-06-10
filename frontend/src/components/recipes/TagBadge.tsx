import { cn } from "@/lib/utils";
import { CUISINE_COLORS } from "@/lib/constants";

interface Props {
  tag: string;
  isCuisine?: boolean;
  className?: string;
}

export function TagBadge({ tag, isCuisine, className }: Props) {
  const color = isCuisine
    ? (CUISINE_COLORS[tag] || "bg-gray-100 text-gray-700")
    : "bg-secondary text-secondary-foreground";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", color, className)}>
      {tag}
    </span>
  );
}
