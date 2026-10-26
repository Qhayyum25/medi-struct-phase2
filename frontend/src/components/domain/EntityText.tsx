import { Fragment, useMemo } from "react";
import type { EntityRead } from "../../types/api";
import { entityStyle } from "../../lib/entityTypes";
import { Popover } from "../ui/Popover";
import { ConfidenceMeter } from "../ui/ConfidenceMeter";
import { titleCase } from "../../lib/format";

interface Props {
  text: string;
  entities: EntityRead[];
  onSelectRelated?: (entityId: string) => void;
}

/** Renders `text` with every entity span highlighted in its type's color. Clicking a
 * span opens an inspector with the entity's text, type, confidence and offsets — this is
 * the "read the document the way Medistruct read it" view described in the brief. */
export function EntityText({ text, entities }: Props) {
  const segments = useMemo(() => {
    const sorted = [...entities]
      .filter((e) => e.start_position >= 0 && e.end_position <= text.length && e.end_position > e.start_position)
      .sort((a, b) => a.start_position - b.start_position);

    const out: Array<{ text: string; entity?: EntityRead }> = [];
    let cursor = 0;
    for (const e of sorted) {
      if (e.start_position < cursor) continue; // skip any overlap defensively
      if (e.start_position > cursor) out.push({ text: text.slice(cursor, e.start_position) });
      out.push({ text: text.slice(e.start_position, e.end_position), entity: e });
      cursor = e.end_position;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor) });
    return out;
  }, [text, entities]);

  return (
    <p className="whitespace-pre-wrap text-[14px] leading-[1.85] text-ink-soft">
      {segments.map((seg, i) =>
        seg.entity ? (
          <Fragment key={i}>
            <EntitySpan entity={seg.entity} text={seg.text} />
          </Fragment>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </p>
  );
}

function EntitySpan({ entity, text }: { entity: EntityRead; text: string }) {
  const style = entityStyle(entity.entity_type);
  return (
    <Popover
      trigger={
        <mark
          className="cursor-pointer rounded-[3px] px-0.5 py-[1px] font-medium no-underline decoration-2 transition-[filter] hover:brightness-95"
          style={{ background: style.bg, color: style.text, boxShadow: `inset 0 -1.5px 0 ${style.dot}` }}
        >
          {text}
        </mark>
      }
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: style.dot }} />
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: style.text }}>
            {entity.entity_type}
          </span>
        </div>
        <p className="text-[13px] font-medium text-ink">{entity.entity_text}</p>
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Confidence</span>
          <ConfidenceMeter value={entity.confidence} />
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2 text-[11px] text-muted">
          <span>Offset</span>
          <span className="font-mono tabular">{entity.start_position}–{entity.end_position}</span>
        </div>
        {entity.model_name && (
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Model</span>
            <span className="font-mono">{titleCase(entity.model_name.split("/").pop() ?? entity.model_name)}</span>
          </div>
        )}
      </div>
    </Popover>
  );
}
