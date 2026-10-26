import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AuthShell } from "./AuthShell";
import { ApiError } from "../../api/client";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, fullName);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_EXISTS") {
        setError("An account with this email address already exists.");
      } else if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setError(err.details?.[0]?.message ?? "Please verify your details and try again.");
      } else {
        setError("Could not create account. Please check your network or try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      heading="Create your workspace"
      sub="Join CityCare Hospital network and start clinical NLP extraction."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Full name
          </label>
          <input
            type="text"
            autoComplete="name"
            placeholder="Dr. Sarah Connor"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0E1524] px-4 py-3 text-[14px] text-white placeholder-slate-500 focus:border-[#00E599] focus:outline-hidden focus:ring-1 focus:ring-[#00E599] transition-all"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Work Email
          </label>
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="dr.sarah@citycare.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0E1524] px-4 py-3 text-[14px] text-white placeholder-slate-500 focus:border-[#00E599] focus:outline-hidden focus:ring-1 focus:ring-[#00E599] transition-all"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0E1524] px-4 py-3 text-[14px] text-white placeholder-slate-500 focus:border-[#00E599] focus:outline-hidden focus:ring-1 focus:ring-[#00E599] transition-all"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[13px] text-rose-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00E599] py-3 text-[14px] font-bold text-[#05080E] shadow-[0_0_20px_rgba(0,229,153,0.3)] hover:bg-[#00c985] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
        >
          <UserPlus className="size-4" />
          <span>{loading ? "Creating..." : "Create workspace account"}</span>
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[13px]">
        <span className="text-slate-400">Already registered?</span>
        <Link
          to="/login"
          className="inline-flex items-center gap-1 font-semibold text-[#00E599] hover:underline"
        >
          Sign in <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </AuthShell>
  );
}
