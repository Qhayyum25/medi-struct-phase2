import type { ReactNode } from "react";
import { Logo } from "../../components/layout/Logo";
import {
  ShieldCheck,
  Activity,
  ArrowRight,
  BrainCircuit,
  Building2,
  Lock,
} from "lucide-react";

export function AuthShell({
  heading,
  sub,
  children,
}: {
  heading: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#05080E] text-white overflow-hidden">
      {/* ─── Hero Left Column Matching Image 2 ──────────────────────── */}
      <div className="relative hidden w-[55%] flex-col justify-between overflow-hidden p-12 lg:flex border-r border-white/[0.06] bg-[#070B14]">
        {/* Bioluminescent green radial glow background */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full opacity-20 blur-[140px]"
          style={{ background: "radial-gradient(circle, #00E599 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-10 left-20 size-[500px] rounded-full opacity-15 blur-[120px]"
          style={{ background: "radial-gradient(circle, #00F2FE 0%, transparent 70%)" }}
        />

        {/* Top bar with Logo & Navigation links */}
        <div className="relative z-10 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-6 text-[13px] font-medium text-slate-400">
            <span className="hover:text-white cursor-pointer transition-colors">Platform</span>
            <span className="hover:text-white cursor-pointer transition-colors">Solutions</span>
            <span className="hover:text-white cursor-pointer transition-colors">Resources</span>
            <span className="hover:text-white cursor-pointer transition-colors">Company</span>
          </div>
        </div>

        {/* Hero Showcase Center matching Image 2 */}
        <div className="relative z-10 my-auto py-10 max-w-xl">
          <h1 className="text-5xl font-black tracking-tight text-white leading-[1.15] xl:text-6xl">
            Smarter Care.<br />
            <span className="text-[#00E599] drop-shadow-[0_0_35px_rgba(0,229,153,0.4)]">
              Faster Decisions.
            </span>
          </h1>

          <p className="mt-5 text-[15px] leading-relaxed text-slate-300 max-w-lg">
            AI-powered monitoring, clinical diagnostics, and hospital intelligence for modern healthcare systems.
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex items-center gap-4">
            <button className="flex items-center gap-2 rounded-xl bg-[#00E599] px-6 py-3 text-[14px] font-bold text-[#05080E] shadow-[0_0_25px_rgba(0,229,153,0.35)] hover:bg-[#00c985] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
              <span>Request Demo</span>
              <ArrowRight className="size-4" />
            </button>
            <button className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-[14px] font-semibold text-white backdrop-blur-md hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer">
              Explore Platform
            </button>
          </div>

          {/* 4 Feature Highlights matching Image 2 */}
          <div className="mt-12 grid grid-cols-2 gap-6 pt-8 border-t border-white/[0.08]">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/20">
                <BrainCircuit className="size-4.5" />
              </span>
              <div>
                <strong className="block text-[13px] font-bold text-white">AI Diagnostics</strong>
                <span className="text-[12px] text-slate-400">Smarter clinical insights</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/20">
                <Activity className="size-4.5" />
              </span>
              <div>
                <strong className="block text-[13px] font-bold text-white">Real-time Monitoring</strong>
                <span className="text-[12px] text-slate-400">Live patient tracking</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/20">
                <ShieldCheck className="size-4.5" />
              </span>
              <div>
                <strong className="block text-[13px] font-bold text-white">Risk Prediction</strong>
                <span className="text-[12px] text-slate-400">Prevent critical events</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/20">
                <Building2 className="size-4.5" />
              </span>
              <div>
                <strong className="block text-[13px] font-bold text-white">Hospital Intelligence</strong>
                <span className="text-[12px] text-slate-400">Data-driven operations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer social proof & compliance matching Image 2 */}
        <div className="relative z-10 space-y-4 pt-6 border-t border-white/[0.06]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Trusted by leading healthcare providers
          </div>
          <div className="flex items-center gap-6 text-[12px] font-semibold text-slate-400">
            <span>CityCare Hospitals</span>
            <span>·</span>
            <span>Medix Healthcare</span>
            <span>·</span>
            <span>HealthPlus Hospital</span>
            <span>·</span>
            <span>LifeLine Medical</span>
          </div>
          <div className="flex items-center gap-4 pt-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5">
              <ShieldCheck className="size-3 text-[#00E599]" /> HIPAA Compliant
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5">
              <Lock className="size-3 text-[#00E599]" /> SOC 2 Certified
            </span>
          </div>
        </div>
      </div>

      {/* ─── Form Right Column (Dark Glassmorphic Container) ───────── */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[45%] bg-[#05080E] relative">
        <div className="w-full max-w-md relative z-10">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0B101B]/90 p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-white">
                {heading}
              </h2>
              <p className="mt-1.5 text-[13px] text-slate-400">
                {sub}
              </p>
            </div>

            {children}
          </div>

          <div className="mt-6 text-center text-[12px] text-slate-500">
            Protected by 256-bit AES encryption · MediCore AI Clinical Portal
          </div>
        </div>
      </div>
    </div>
  );
}
