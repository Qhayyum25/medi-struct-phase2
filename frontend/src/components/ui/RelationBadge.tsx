import { ArrowRight } from "lucide-react";
import { titleCase } from "../../lib/format";

export function RelationBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-violet-100 bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-600">
      {titleCase(type)}
      <ArrowRight className="size-3" />
    </span>
  );
}
