import { useState } from "react";
import {
  Heart,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ChevronDown,
} from "lucide-react";

interface TargetNode {
  id: string;
  label: string;
  type: "drug" | "gene" | "protein" | "kinase";
  x: number;
  y: number;
  size: number;
  val?: number;
  color: string;
  glow: string;
}

const NODES: TargetNode[] = [
  // Central Hexagon Node matching Image 1 Cetuximab [8]
  { id: "center", label: "Cetuximab", type: "drug", x: 420, y: 380, size: 54, val: 8, color: "#3B82F6", glow: "#60A5FA" },
  // Connected Gene/Kinase Nodes matching Image 1
  { id: "kras", label: "KRAS", type: "gene", x: 340, y: 140, size: 26, color: "#10B981", glow: "#34D399" },
  { id: "egfr", label: "EGFR", type: "kinase", x: 280, y: 290, size: 28, color: "#F59E0B", glow: "#FBBF24" },
  { id: "stk11", label: "STK11", type: "gene", x: 260, y: 220, size: 20, color: "#10B981", glow: "#34D399" },
  { id: "braf", label: "BRAF", type: "kinase", x: 310, y: 175, size: 24, color: "#F59E0B", glow: "#FBBF24" },
  { id: "pi3k", label: "PIK3CA", type: "protein", x: 285, y: 205, size: 28, color: "#EC4899", glow: "#F472B6" },
  { id: "node_seq1", label: "4", type: "drug", x: 320, y: 360, size: 20, val: 4, color: "#6366F1", glow: "#818CF8" },
  { id: "node_seq2", label: "1", type: "protein", x: 290, y: 360, size: 16, color: "#06B6D4", glow: "#22D3EE" },
  { id: "node_seq3", label: "2", type: "protein", x: 265, y: 360, size: 16, color: "#EC4899", glow: "#F472B6" },
  { id: "node_seq4", label: "3", type: "protein", x: 240, y: 360, size: 14, color: "#06B6D4", glow: "#22D3EE" },
  { id: "node_seq5", label: "4", type: "protein", x: 220, y: 360, size: 12, color: "#10B981", glow: "#34D399" },
];

export function KnowledgeMap({
  patientLabel = "Cetuximab",
}: {
  patientLabel?: string;
  documents?: unknown[];
  entitiesByDoc?: unknown;
  relations?: unknown[];
  height?: number;
}) {
  const [selectedTarget, setSelectedTarget] = useState(patientLabel || "Cetuximab");
  const [liked, setLiked] = useState(false);
  const [filterDrugs, setFilterDrugs] = useState(true);
  const [filterGenes, setFilterGenes] = useState(true);
  const [filterProteins, setFilterProteins] = useState(true);
  const [filterKinases, setFilterKinases] = useState(true);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative flex flex-col xl:flex-row items-stretch gap-6 select-none bg-[#05080E] text-white">
      {/* ─── Center/Left: Large Bioluminescent Lens Canvas matching Image 1 ─── */}
      <div className="relative flex-1 rounded-3xl border border-white/[0.08] bg-[#070B14] overflow-hidden p-6 shadow-2xl flex flex-col justify-between min-h-[640px]">
        {/* Top bar over the lens: Organ thumbnail preview matching Image 1 */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1 text-[13px] font-bold text-slate-300 hover:text-white transition-colors">
              <span>‹ Back</span>
            </button>
            <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-[#0E1524] p-1 shadow-lg">
              <svg viewBox="0 0 100 100" className="size-9 drop-shadow-[0_0_8px_rgba(0,229,153,0.5)]">
                {/* Micro organ preview icon */}
                <path
                  d="M30 30 C15 50, 20 80, 45 80 C48 80, 48 50, 45 40 Z"
                  fill="#00E599"
                  opacity="0.8"
                />
                <path
                  d="M70 30 C85 50, 80 80, 55 80 C52 80, 52 50, 55 40 Z"
                  fill="#00E599"
                  opacity="0.8"
                />
                <circle cx="45" cy="45" r="4" fill="#FFF" />
                <circle cx="65" cy="60" r="3" fill="#00F2FE" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-mono text-cyan-400">
              Interactive Target Space
            </span>
          </div>
        </div>

        {/* ─── Center Giant Bioluminescent Blue Lens / Sphere ──────── */}
        <div className="relative my-auto flex items-center justify-center py-4">
          <svg
            viewBox="0 0 640 520"
            className="w-full max-w-[640px] overflow-visible"
            style={{ transform: `scale(${zoom})`, transition: "transform 200ms ease" }}
          >
            <defs>
              {/* Outer sphere glow gradient */}
              <radialGradient id="sphereLens" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0B1A3A" stopOpacity="0.4" />
                <stop offset="60%" stopColor="#09142A" stopOpacity="0.85" />
                <stop offset="85%" stopColor="#0284C7" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
              </radialGradient>

              {/* Central Hexagon Gradient */}
              <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="50%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#1E40AF" />
              </linearGradient>

              {/* Glowing filter */}
              <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Glowing Celestial Sphere Lens matching Image 1 */}
            <circle
              cx="320"
              cy="260"
              r="230"
              fill="url(#sphereLens)"
              stroke="#0284C7"
              strokeWidth="2"
              className="drop-shadow-[0_0_50px_rgba(2,132,199,0.5)]"
            />
            {/* Inner faint grid lines */}
            <circle cx="320" cy="260" r="170" fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <circle cx="320" cy="260" r="100" fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

            {/* Starry particle nodes & network lines in background */}
            <g stroke="#1E3A8A" strokeWidth="0.8" opacity="0.6">
              <line x1="320" y1="260" x2="420" y2="120" />
              <line x1="420" y1="120" x2="480" y2="150" />
              <line x1="420" y1="120" x2="440" y2="70" />
              <line x1="320" y1="260" x2="460" y2="280" />
              <line x1="460" y1="280" x2="520" y2="260" />
              <line x1="320" y1="260" x2="220" y2="180" />
              <line x1="220" y1="180" x2="160" y2="240" />
              <line x1="320" y1="260" x2="250" y2="380" />
            </g>

            {/* Main network lines connecting to Cetuximab */}
            <g stroke="#38BDF8" strokeWidth="1.4" opacity="0.8">
              {NODES.filter((n) => n.id !== "center").map((n) => (
                <line
                  key={`line-${n.id}`}
                  x1="420"
                  y1="380"
                  x2={n.x}
                  y2={n.y}
                  stroke="#38BDF8"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
              ))}
            </g>

            {/* Connected nodes matching Image 1 */}
            {NODES.filter((n) => n.id !== "center").map((n) => (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                className="cursor-pointer group"
                onClick={() => setSelectedTarget(n.label)}
              >
                <circle
                  r={n.size / 2 + 4}
                  fill="none"
                  stroke={n.color}
                  strokeWidth="1"
                  opacity="0.4"
                  className="animate-pulse"
                />
                <circle
                  r={n.size / 2}
                  fill={n.color}
                  filter="url(#glowCyan)"
                  className="transition-transform group-hover:scale-125"
                />
                <text
                  y={4}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="Inter, sans-serif"
                >
                  {n.val ?? ""}
                </text>
                <rect
                  x="-35"
                  y={n.size / 2 + 5}
                  width="70"
                  height="16"
                  rx="8"
                  fill="#070B14"
                  stroke="rgba(255,255,255,0.15)"
                />
                <text
                  y={n.size / 2 + 16}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {n.label}
                </text>
              </g>
            ))}

            {/* Central Giant Hexagon Node: Cetuximab [8] matching Image 1 */}
            <g
              transform="translate(420, 380)"
              className="cursor-pointer group"
              onClick={() => setSelectedTarget("Cetuximab")}
            >
              {/* Outer layered glowing concentric hex rings */}
              <polygon
                points="0,-48 42,-24 42,24 0,48 -42,24 -42,-24"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="1.5"
                opacity="0.3"
                className="animate-pulse"
              />
              <polygon
                points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20"
                fill="none"
                stroke="#60A5FA"
                strokeWidth="1.8"
                opacity="0.6"
              />
              {/* Core solid hex */}
              <polygon
                points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16"
                fill="url(#hexGrad)"
                className="drop-shadow-[0_0_20px_rgba(59,130,246,0.9)] transition-transform group-hover:scale-105"
              />
              <text y={4} textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="900">
                8
              </text>
              {/* Label pill */}
              <rect
                x="-45"
                y="42"
                width="90"
                height="20"
                rx="10"
                fill="#070B14"
                stroke="#3B82F6"
                strokeWidth="1"
              />
              <text y="55.5" textAnchor="middle" fill="#93C5FD" fontSize="10.5" fontWeight="bold">
                Cetuximab
              </text>
            </g>

            {/* 3D Spatial Gimbal Compass at bottom matching Image 1 */}
            <g transform="translate(320, 480)">
              <ellipse cx="0" cy="0" rx="36" ry="12" fill="#040810" stroke="#00F2FE" strokeWidth="1.2" opacity="0.8" />
              <circle cx="0" cy="0" r="18" fill="none" stroke="#00E599" strokeWidth="1" strokeDasharray="3 3" />
              {/* 3D wireframe cube */}
              <path
                d="M0 -12 L10 -6 L10 6 L0 12 L-10 6 L-10 -6 Z M0 -12 L0 12 M-10 -6 L10 6 M10 -6 L-10 6"
                fill="none"
                stroke="#00F2FE"
                strokeWidth="1"
              />
            </g>
          </svg>
        </div>

        {/* ─── Bottom Floating Glass Legend matching Image 1 ────────── */}
        <div className="relative z-10 flex items-end justify-between pt-4">
          <div className="rounded-2xl border border-white/10 bg-[#0E1524]/90 p-3.5 backdrop-blur-xl shadow-xl w-48 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="size-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_6px_#3B82F6]" />
                <span>Drugs</span>
              </label>
              <input
                type="checkbox"
                checked={filterDrugs}
                onChange={() => setFilterDrugs(!filterDrugs)}
                className="accent-[#00E599]"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="size-2.5 rounded-full bg-[#EC4899] shadow-[0_0_6px_#EC4899]" />
                <span>Genes</span>
              </label>
              <input
                type="checkbox"
                checked={filterGenes}
                onChange={() => setFilterGenes(!filterGenes)}
                className="accent-[#00E599]"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="size-2.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
                <span>Proteins</span>
              </label>
              <input
                type="checkbox"
                checked={filterProteins}
                onChange={() => setFilterProteins(!filterProteins)}
                className="accent-[#00E599]"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="size-2.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]" />
                <span>Kinases</span>
              </label>
              <input
                type="checkbox"
                checked={filterKinases}
                onChange={() => setFilterKinases(!filterKinases)}
                className="accent-[#00E599]"
              />
            </div>

            <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>Targets</span>
              <ChevronDown className="size-3" />
            </div>
          </div>

          {/* Zoom controls matching Image 1 */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-[#0E1524] text-slate-300 hover:text-white hover:border-[#00E599] transition-all"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-[#0E1524] text-slate-300 hover:text-white hover:border-[#00E599] transition-all"
            >
              <ZoomOut className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Right Sidebar: Target & Protein Structure matching Image 1 ─ */}
      <div className="w-full xl:w-[380px] rounded-3xl border border-white/[0.08] bg-[#0E1524] p-6 shadow-2xl flex flex-col justify-between space-y-6">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <h2 className="text-xl font-black text-white tracking-tight">{selectedTarget}</h2>
            <button
              onClick={() => setLiked(!liked)}
              className="flex size-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <Heart
                className={`size-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`}
              />
            </button>
          </div>

          {/* 3D Protein Structure Preview Window matching Image 1 */}
          <div className="relative my-4 h-48 w-full overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#070B14] p-3 flex items-center justify-center shadow-inner">
            <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent opacity-50" />
            
            {/* Protein ribbon wireframe SVG */}
            <svg viewBox="0 0 160 120" className="size-36 drop-shadow-[0_0_15px_rgba(0,242,254,0.6)]">
              <path
                d="M20 60 Q40 20 70 50 T120 40 T140 80 T90 90 T40 80 Z"
                fill="none"
                stroke="#00E599"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M30 40 Q60 10 90 40 T130 60 T110 95 T60 85 Z"
                fill="none"
                stroke="#00F2FE"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.8"
              />
              <path
                d="M50 70 L110 50 M40 50 L100 80"
                stroke="#38BDF8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </svg>

            {/* Bounding bracket markers */}
            <span className="absolute top-2 left-2 size-2 border-t-2 border-l-2 border-cyan-400" />
            <span className="absolute bottom-2 left-2 size-2 border-b-2 border-l-2 border-cyan-400" />
            <span className="absolute bottom-2 right-2 size-2 border-b-2 border-r-2 border-cyan-400" />
          </div>

          {/* Drug Basic Information matching Image 1 */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-400">
              Drug Basic Information
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Target</span>
                <span className="font-semibold text-white">Cetuximab</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Generic Name</span>
                <span className="font-semibold text-white">Erbitux</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Brand Name</span>
                <span className="font-semibold text-white">Cetuximab</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Group</span>
                <span className="font-semibold text-[#00E599]">Approved</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Mechanism of Action</span>
                <span className="font-semibold text-white">Monoclonal Antibody</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Administration</span>
                <span className="font-semibold text-white">Intravenous</span>
              </div>
            </div>
            <div className="text-[12px] pt-1">
              <span className="text-slate-500 block text-[10px] uppercase">Combined With</span>
              <span className="font-medium text-slate-300">
                Leucovorin, Fluorouracil, and Irinotecan
              </span>
            </div>
          </div>

          {/* Drug Physiochemical Property matching Image 1 */}
          <div className="space-y-3 pt-4 border-t border-white/[0.06] mt-4">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-400">
              Drug Physiochemical Property
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px] uppercase">Chemical Formula</span>
                <span className="font-mono text-[11px] text-cyan-300 break-all">
                  C6484H10042N1732O2023S36
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Protein Avg. Weight</span>
                <span className="font-mono font-semibold text-white">145781.6 Da</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Estimated Clearance</span>
                <span className="font-mono font-semibold text-white">0.103 L/h</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Half Life</span>
                <span className="font-mono font-semibold text-white">112 hours</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Protein Binding</span>
                <span className="font-mono font-semibold text-white">NA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pathway CTA Button matching Image 1 */}
        <div className="pt-4 border-t border-white/[0.06]">
          <button className="w-full flex items-center justify-between rounded-xl bg-[#00E599] px-5 py-3 text-[14px] font-bold text-[#05080E] shadow-[0_0_20px_rgba(0,229,153,0.35)] hover:bg-[#00c985] hover:scale-[1.01] transition-all cursor-pointer">
            <span>Pathway</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
