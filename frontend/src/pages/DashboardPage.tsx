import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Heart,
  Activity,
  Wind,
  Droplet,
  Bot,
  Clock,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { documentsApi } from "../api/documents";
import { patientsApi } from "../api/patients";
import { entitiesApi } from "../api/entities";
import { relationsApi } from "../api/relations";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDateTime } from "../lib/format";
import type { DocumentDetail } from "../types/api";

// 24-hour vitals trend data matching Image 2
const VITALS_TREND = [
  { time: "00:00", hr: 72, bp: 120, o2: 98, resp: 18 },
  { time: "04:00", hr: 68, bp: 118, o2: 97, resp: 16 },
  { time: "08:00", hr: 84, bp: 126, o2: 99, resp: 20 },
  { time: "12:00", hr: 76, bp: 122, o2: 98, resp: 18 },
  { time: "16:00", hr: 80, bp: 124, o2: 97, resp: 19 },
  { time: "20:00", hr: 74, bp: 119, o2: 98, resp: 17 },
  { time: "24:00", hr: 72, bp: 120, o2: 98, resp: 18 },
];

const BED_DATA = [
  { name: "Occupied", value: 78, color: "#00E599" },
  { name: "Available", value: 16, color: "#00F2FE" },
  { name: "Maintenance", value: 6, color: "#334155" },
];

const EMERGENCY_QUEUE = [
  { id: "PT-774682", name: "Damon S.", wait: "3 min", code: "Red", dot: "#F43F5E" },
  { id: "PT-724893", name: "Code: Orange", wait: "8 min", code: "Orange", dot: "#F59E0B" },
  { id: "PT-776914", name: "Code: Yellow", wait: "15 min", code: "Yellow", dot: "#EAB308" },
  { id: "PT-789021", name: "Cedric Evans", wait: "28 min", code: "Green", dot: "#00E599" },
];

async function loadDashboard() {
  const [total, completed, patients, entitiesSample, relations, recent] =
    await Promise.all([
      documentsApi.list({ page_size: 1 }),
      documentsApi.list({ page_size: 1, status: "completed" }),
      patientsApi.list({ page_size: 1 }),
      entitiesApi.list({ page_size: 100 }),
      relationsApi.list({ page_size: 1 }),
      documentsApi.list({ page_size: 5 }),
    ]);

  const recentDetails: DocumentDetail[] = await Promise.all(
    recent.items.map((d) => documentsApi.get(d.id))
  );

  return {
    totalDocuments: total.total,
    completedDocuments: completed.total,
    totalPatients: Math.max(1248, patients.total),
    totalEntities: entitiesSample.total,
    totalRelations: relations.total,
    recentDocuments: recentDetails,
  };
}

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: loadDashboard,
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Header: Greeting from Image 2 ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl flex items-center gap-2">
            Good Morning, Dr. Sarah <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Here's what's happening at CityCare Clinical Center today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/documents"
            className="flex items-center gap-2 rounded-xl bg-[#00E599] px-4 py-2 text-[13px] font-bold text-[#05080E] shadow-[0_0_20px_rgba(0,229,153,0.3)] hover:bg-[#00c985] hover:scale-105 transition-all"
          >
            <Upload className="size-4" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* ─── Top Row: Overview, 3D Holographic Organ, Live Vitals, AI Assistant ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Stats Column: Patient Overview & Critical Alerts */}
        <div className="space-y-4 lg:col-span-3">
          {/* Patient Overview Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E1524] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">
                Patient Overview
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00E599]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#00E599] border border-[#00E599]/30">
                <span className="size-1.5 rounded-full bg-[#00E599] animate-ping" />
                Live
              </span>
            </div>
            <div className="mt-4">
              <div className="text-4xl font-black text-white tracking-tight">
                {data?.totalPatients.toLocaleString() ?? "1,248"}
              </div>
              <div className="text-[12px] text-slate-400 mt-0.5">Total Enrolled Patients</div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[12px] font-bold text-[#00E599]">
              <TrendingUp className="size-3.5" />
              <span>↑ 12.5% from yesterday</span>
            </div>
          </div>

          {/* Critical Alerts Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E1524] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">
                Critical Alerts
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#F59E0B]/20 text-[#F59E0B]">
                <AlertTriangle className="size-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-black text-[#F59E0B] tracking-tight">7</span>
              <span className="text-[12px] text-slate-400">
                Patients need immediate triage
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[12px] font-bold text-[#F59E0B]">
              <span>View all alerts</span>
              <ArrowRight className="size-3.5" />
            </div>
          </div>
        </div>

        {/* Center Card: Holographic 3D Organ Chamber matching Image 2 */}
        <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#0B1528] via-[#070E1A] to-[#040810] p-6 shadow-[0_0_40px_rgba(0,242,254,0.12)] lg:col-span-4">
          <div className="w-full flex items-center justify-between z-10">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Cardiovascular Telemetry
            </span>
            <span className="text-[11px] font-mono text-cyan-400/80">3D Hologram v4.2</span>
          </div>

          {/* 3D Holographic Glowing Heart Visual */}
          <div className="relative my-4 flex size-52 items-center justify-center">
            {/* Ambient cyan glow backdrop */}
            <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-2xl animate-pulse-slow" />
            
            {/* Glowing Wireframe Cylindrical Chamber */}
            <div className="absolute inset-2 rounded-full border border-cyan-400/30 border-dashed animate-spin-slow pointer-events-none" />
            <div className="absolute inset-8 rounded-full border border-cyan-500/20 pointer-events-none" />

            {/* Glowing Anatomical Heart SVG */}
            <svg
              viewBox="0 0 200 200"
              className="relative z-10 size-40 animate-float-hologram drop-shadow-[0_0_25px_rgba(0,242,254,0.8)]"
            >
              <defs>
                <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F2FE" />
                  <stop offset="50%" stopColor="#00E599" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
              {/* Outer myocardium */}
              <path
                d="M100 45 C75 15, 30 35, 40 85 C47 120, 85 155, 100 170 C115 155, 153 120, 160 85 C170 35, 125 15, 100 45 Z"
                fill="none"
                stroke="url(#heartGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="4 2"
              />
              {/* Aorta arch */}
              <path
                d="M85 45 C85 20, 120 18, 125 45"
                fill="none"
                stroke="#00F2FE"
                strokeWidth="2"
              />
              <path
                d="M95 23 L95 10 M105 21 L105 8 M115 25 L115 12"
                stroke="#00F2FE"
                strokeWidth="2"
              />
              {/* Pulmonary vessels */}
              <path
                d="M65 60 C80 75, 120 75, 135 60"
                fill="none"
                stroke="#00E599"
                strokeWidth="1.8"
              />
              {/* Ventricular interior lines */}
              <path
                d="M100 70 L100 145 M80 85 C85 110, 95 125, 100 145 M120 85 C115 110, 105 125, 100 145"
                fill="none"
                stroke="#00F2FE"
                strokeWidth="1.2"
                opacity="0.6"
              />
            </svg>

            {/* Glowing pedestal base */}
            <div className="absolute bottom-0 w-36 h-4 rounded-full bg-cyan-400/30 border border-cyan-400 blur-xs" />
          </div>

          {/* Chamber Status Bar */}
          <div className="w-full flex items-center justify-between pt-2 border-t border-cyan-500/20 text-[11px] text-cyan-300/80">
            <span>Rhythm: Normal Sinus</span>
            <span className="font-bold text-[#00E599]">Synchronized</span>
          </div>
        </div>

        {/* Vital Signs Cards Column matching Image 2 */}
        <div className="grid grid-cols-2 gap-3.5 lg:col-span-2">
          {/* Heart Rate */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1524] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Heart Rate</span>
              <Heart className="size-3.5 text-[#00E599]" />
            </div>
            <div className="my-1">
              <span className="text-2xl font-black text-white">72</span>
              <span className="text-[11px] text-slate-400 ml-1">bpm</span>
            </div>
            <div className="h-6 w-full">
              <svg viewBox="0 0 100 20" className="w-full h-full">
                <path
                  d="M0 10 L25 10 L30 3 L35 18 L40 5 L45 14 L50 10 L100 10"
                  fill="none"
                  stroke="#00E599"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Blood Pressure */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1524] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Blood Pressure</span>
              <Activity className="size-3.5 text-cyan-400" />
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-white">120/80</span>
              <span className="text-[11px] text-slate-400 ml-1">mmHg</span>
            </div>
            <span className="text-[10px] font-bold text-[#00E599]">Optimal range</span>
          </div>

          {/* Oxygen Saturation */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1524] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Oxygen Sat.</span>
              <Droplet className="size-3.5 text-sky-400" />
            </div>
            <div className="my-1">
              <span className="text-2xl font-black text-white">98%</span>
              <span className="text-[11px] text-slate-400 ml-1">SpO2</span>
            </div>
            <span className="text-[10px] font-bold text-sky-400">Stable</span>
          </div>

          {/* Respiratory Rate */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1524] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Respiratory</span>
              <Wind className="size-3.5 text-amber-400" />
            </div>
            <div className="my-1">
              <span className="text-2xl font-black text-white">18</span>
              <span className="text-[11px] text-slate-400 ml-1">br/min</span>
            </div>
            <span className="text-[10px] font-bold text-[#00E599]">Normal rate</span>
          </div>
        </div>

        {/* Far Right: AI Diagnosis Assistant matching Image 2 */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1524] p-5 shadow-xl lg:col-span-3">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#00E599]/15 text-[#00E599]">
                  <Bot className="size-4" />
                </span>
                <span className="text-[13px] font-bold text-white">
                  AI Diagnosis Assistant
                </span>
              </div>
              <span className="size-2 rounded-full bg-[#00E599] shadow-[0_0_8px_#00E599]" />
            </div>

            <div className="mt-3.5 space-y-3">
              <div className="rounded-xl bg-white/[0.03] p-3 text-[12px] text-slate-300 border border-white/[0.04]">
                <span className="font-bold text-[#00E599]">Query:</span> Analyze recent labs for patient <span className="font-mono text-cyan-400">#PT-774682</span>.
              </div>

              <div className="rounded-xl bg-[#00E599]/10 p-3 text-[12px] text-white border border-[#00E599]/20 shadow-xs">
                <p className="font-semibold text-[#00E599] flex items-center gap-1.5 mb-1">
                  <Sparkles className="size-3.5" /> Analysis Complete
                </p>
                <p className="text-slate-300 leading-relaxed text-[11.5px]">
                  Signs of early systemic inflammation detected. Recommend monitoring blood lactate and initiating sepsis protocol.
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Model Confidence</span>
                <span className="font-bold text-[#00E599] font-mono">98.4%</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="text"
              placeholder="Ask AI Clinical Assistant..."
              className="w-full rounded-xl border border-white/10 bg-[#070B14] px-3.5 py-2.5 text-[12px] text-white placeholder-slate-500 focus:border-[#00E599] focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* ─── Middle Row: Live Vitals Trend, Emergency Queue, Bed Occupancy ─── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Live Vitals Trend Multi-line Area Chart */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1524] p-5 shadow-xl lg:col-span-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <span className="text-[14px] font-bold text-white">Live Vitals Trend</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00E599]/15 px-2 py-0.5 text-[10px] font-bold text-[#00E599]">
                Live
              </span>
            </div>
            <span className="rounded-lg border border-white/10 bg-[#070B14] px-2.5 py-1 text-[11px] font-semibold text-slate-400">
              Last 24 Hours
            </span>
          </div>

          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VITALS_TREND}>
                <defs>
                  <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E599" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00E599" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F2FE" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00F2FE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{
                    backgroundColor: "#070B14",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hr"
                  stroke="#00E599"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#hrGrad)"
                  name="Heart Rate"
                />
                <Area
                  type="monotone"
                  dataKey="bp"
                  stroke="#00F2FE"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#bpGrad)"
                  name="Blood Pressure"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Emergency Queue matching Image 2 */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1524] p-5 shadow-xl lg:col-span-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <span className="text-[14px] font-bold text-white">Emergency Queue</span>
            <span className="text-[12px] font-bold text-[#00E599] hover:underline cursor-pointer">
              View all
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {EMERGENCY_QUEUE.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-[#070B14] p-2.5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.dot, boxShadow: `0 0 8px ${item.dot}` }}
                  />
                  <div>
                    <p className="font-mono text-[12px] font-bold text-white">{item.id}</p>
                    <p className="text-[10px] text-slate-400">{item.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300">
                  <Clock className="size-3 text-slate-500" />
                  <span>{item.wait}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bed Occupancy matching Image 2 */}
        <div className="flex flex-col items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0E1524] p-5 shadow-xl lg:col-span-3">
          <div className="w-full flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <span className="text-[14px] font-bold text-white">Bed Occupancy</span>
            <span className="text-[11px] font-bold text-slate-400">Total: 450</span>
          </div>

          {/* Donut Chart */}
          <div className="relative my-2 size-36 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={BED_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={62}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {BED_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black text-white">78%</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Occupied</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-3 gap-2 text-center text-[10px] pt-2 border-t border-white/[0.06]">
            <div>
              <span className="inline-block size-1.5 rounded-full bg-[#00E599] mr-1" />
              <span className="text-slate-400">Occupied</span>
            </div>
            <div>
              <span className="inline-block size-1.5 rounded-full bg-cyan-400 mr-1" />
              <span className="text-slate-400">Available</span>
            </div>
            <div>
              <span className="inline-block size-1.5 rounded-full bg-slate-500 mr-1" />
              <span className="text-slate-400">Hold</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Row: Hospital Operations Row from Image 2 ──────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E1524] p-5 shadow-xl">
        <h3 className="text-[14px] font-bold text-white mb-4">Hospital Operations</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
          <div className="pr-4">
            <span className="text-[11px] uppercase tracking-wider text-slate-400">
              Surgeries Today
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">24</span>
              <span className="text-[11px] font-bold text-[#00E599] flex items-center">
                ↑ 8%
              </span>
            </div>
            <span className="text-[10px] text-slate-500">vs yesterday</span>
          </div>

          <div className="sm:px-4 pt-3 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400">
              Discharges
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">18</span>
              <span className="text-[11px] font-bold text-[#00E599] flex items-center">
                ↑ 12%
              </span>
            </div>
            <span className="text-[10px] text-slate-500">vs yesterday</span>
          </div>

          <div className="sm:px-4 pt-3 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400">
              Revenue Volume
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">$248K</span>
              <span className="text-[11px] font-bold text-[#00E599] flex items-center">
                ↑ 9%
              </span>
            </div>
            <span className="text-[10px] text-slate-500">vs yesterday</span>
          </div>

          <div className="sm:px-4 pt-3 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400">
              Avg. Length of Stay
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">4.2 Days</span>
              <span className="text-[11px] font-bold text-[#00E599] flex items-center">
                ↓ 6%
              </span>
            </div>
            <span className="text-[10px] text-slate-500">vs target</span>
          </div>

          <div className="sm:pl-4 pt-3 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider text-rose-400">
              Readmission Risk
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-500">23</span>
              <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 border border-rose-500/30">
                High Risk
              </span>
            </div>
            <span className="text-[10px] text-slate-500">Patients flagged</span>
          </div>
        </div>
      </div>

      {/* ─── Clinical NLP Documents Section (Preserving functionality) ── */}
      {data?.recentDocuments && data.recentDocuments.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1524] p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
            <span className="text-[14px] font-bold text-white">Recent Clinical Ingestion</span>
            <Link
              to="/documents"
              className="text-[12px] font-bold text-[#00E599] hover:underline"
            >
              View all documents →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Document</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Entities</th>
                  <th className="py-2.5 px-4">Relations</th>
                  <th className="py-2.5 px-4">Ingested</th>
                  <th className="py-2.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.recentDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-semibold text-white">
                      <Link to={`/documents/${doc.id}`} className="hover:text-[#00E599]">
                        {doc.filename}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400 font-bold">
                      {doc.entity_count}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400 font-bold">
                      {doc.relation_count}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[12px]">
                      {formatDateTime(doc.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="text-[12px] font-bold text-[#00E599] hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
