import { useMemo, useState } from "react";
import type { EntityRead, RelationRead } from "../../types/api";
import { entityStyle } from "../../lib/entityTypes";
import { titleCase } from "../../lib/format";
import { GraphCanvas } from "./GraphCanvas";

interface Props {
  relations: RelationRead[];
  height?: number;
}

interface Node {
  entity: EntityRead;
  x: number;
  y: number;
}

const WIDTH = 760;

/**
 * Interactive network graph of clinical entities and relations:
 * Ring layout with directed semantic assertions. Click a node to inspect connected relationships.
 */
export function RelationGraph({ relations, height = 440 }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const relationTypes = useMemo(
    () => Array.from(new Set(relations.map((r) => r.relation_type))).sort(),
    [relations]
  );

  const filtered =
    typeFilter === "all"
      ? relations
      : relations.filter((r) => r.relation_type === typeFilter);

  const { nodes, edges } = useMemo(() => {
    const byId = new Map<string, EntityRead>();
    filtered.forEach((r) => {
      byId.set(r.subject_entity.id, r.subject_entity);
      byId.set(r.object_entity.id, r.object_entity);
    });
    const list = Array.from(byId.values());
    const cx = WIDTH / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 75;
    const nodeMap = new Map<string, Node>();
    list.forEach((entity, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, list.length) - Math.PI / 2;
      nodeMap.set(entity.id, {
        entity,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    });
    return { nodes: Array.from(nodeMap.values()), edges: filtered };
  }, [filtered, height]);

  if (relations.length === 0) return null;

  const nodeAt = (id: string) => nodes.find((n) => n.entity.id === id);

  return (
    <div className="space-y-3">
      {/* Type filter toolbar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-semibold text-[var(--color-ink-soft)] mr-1">
          Relation Predicate:
        </span>
        <button
          onClick={() => setTypeFilter("all")}
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
            typeFilter === "all"
              ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] shadow-xs"
              : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)]"
          }`}
        >
          All Predicates ({relations.length})
        </button>
        {relationTypes.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
              typeFilter === t
                ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] shadow-xs"
                : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)]"
            }`}
          >
            {titleCase(t)}
          </button>
        ))}
      </div>

      <GraphCanvas width={WIDTH} height={height}>
        <defs>
          <marker
            id="rel-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,1 L8,5 L0,9 z" fill="var(--color-brand-600)" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((r) => {
          const a = nodeAt(r.subject_entity.id);
          const b = nodeAt(r.object_entity.id);
          if (!a || !b) return null;
          const dim = selected && selected !== a.entity.id && selected !== b.entity.id;
          const isHighlighted = selected && (selected === a.entity.id || selected === b.entity.id);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;

          return (
            <g
              key={r.id}
              opacity={dim ? 0.12 : 1}
              className="transition-opacity duration-200"
            >
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isHighlighted ? "var(--color-brand-600)" : "var(--color-brand-300)"}
                strokeWidth={isHighlighted ? 2.2 : 1.4}
                markerEnd="url(#rel-arrow)"
              />
              <rect
                x={mx - 38}
                y={my - 10}
                width={76}
                height={20}
                rx={10}
                fill="var(--color-surface)"
                stroke="var(--color-brand-200)"
                strokeWidth={1}
                className="shadow-xs"
              />
              <text
                x={mx}
                y={my + 3.5}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight={600}
                fill="var(--color-brand-700)"
                fontFamily="IBM Plex Sans, sans-serif"
              >
                {titleCase(r.relation_type)}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const style = entityStyle(n.entity.entity_type);
          const dim = selected && selected !== n.entity.id;
          const isSelected = selected === n.entity.id;

          return (
            <g
              key={n.entity.id}
              transform={`translate(${n.x} ${n.y})`}
              opacity={dim ? 0.25 : 1}
              onClick={() => setSelected(isSelected ? null : n.entity.id)}
              className="cursor-pointer transition-all"
            >
              <circle
                r={28}
                fill={style.bg}
                stroke={style.dot}
                strokeWidth={isSelected ? 3 : 1.8}
                className="transition-all hover:scale-105"
              />
              <text
                textAnchor="middle"
                y={4}
                fontSize="10"
                fontWeight={700}
                fill={style.text}
                fontFamily="IBM Plex Sans, sans-serif"
              >
                {truncate(n.entity.entity_text, 10)}
              </text>
              <text
                textAnchor="middle"
                y={42}
                fontSize="9.5"
                fontWeight={600}
                fill="var(--color-muted)"
                fontFamily="IBM Plex Sans, sans-serif"
              >
                {n.entity.entity_type}
              </text>
            </g>
          );
        })}
      </GraphCanvas>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
