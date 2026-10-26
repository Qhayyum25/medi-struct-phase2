import { Link } from "react-router-dom";
import {
  GitBranch,
  Layers,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";

const SECTIONS = [
  {
    to: "/analytics/association-rules",
    icon: GitBranch,
    badge: "Apriori Mining",
    title: "Association Rules",
    description:
      "Discover co-occurrence patterns between diseases, symptoms, and therapies across all completed clinical documents with support, confidence, and lift metrics.",
    bullets: ["Co-occurrence confidence", "Lift correlation index", "Entity-level granularity"],
    tone: "violet",
  },
  {
    to: "/analytics/clustering",
    icon: Layers,
    badge: "Unsupervised ML",
    title: "Patient Clustering",
    description:
      "Cluster pseudonymous patients based on multi-variate lab observation profiles (standardized z-scores) using K-Means to identify distinct clinical phenotypes.",
    bullets: ["Multi-dimensional K-Means", "Lab observation mean vectors", "Interactive cluster composition"],
    tone: "teal",
  },
  {
    to: "/analytics/cohorts",
    icon: Users,
    badge: "Cohort Discovery",
    title: "Cohort Builder",
    description:
      "Design targeted cohorts using Boolean criteria spanning diagnosis concepts, medication regimens, and numeric laboratory value ranges.",
    bullets: ["Multi-ontology filters", "Numeric lab range constraints", "Instant patient record mapping"],
    tone: "brand",
  },
];

export default function AnalyticsLandingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Clinical Analytics & Phenotyping"
        description="Machine learning and statistical discovery workspace over structured clinical knowledge extracted by Medistruct."
      />

      {/* ─── Grid of Analytics Modules ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="group">
            <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-brand-400)] hover:shadow-[var(--shadow-md)]">
              <CardBody className="flex flex-col justify-between h-full p-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-11 items-center justify-center rounded-xl border ${
                        s.tone === "violet"
                          ? "bg-violet-50 text-violet-600 border-violet-100"
                          : s.tone === "teal"
                          ? "bg-teal-50 text-teal-600 border-teal-100"
                          : "bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border-[var(--color-brand-100)]"
                      }`}
                    >
                      <s.icon className="size-5" />
                    </span>
                    <span className="rounded-full bg-[var(--color-canvas)] border border-[var(--color-line)] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--color-muted)]">
                      {s.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-[var(--color-ink)] group-hover:text-[var(--color-brand-600)] transition-colors">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-muted)]">
                    {s.description}
                  </p>

                  <ul className="mt-4 space-y-1.5 border-t border-[var(--color-line)] pt-3 text-[12px] text-[var(--color-ink-soft)]">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <span className="size-1 rounded-full bg-[var(--color-brand-600)]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between pt-3 border-t border-[var(--color-line)] text-[12px] font-semibold text-[var(--color-brand-600)]">
                  <span>Launch Module</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── Informational banner ─────────────────────────────────── */}
      <div className="flex items-start gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-xs">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-100)]">
          <Sparkles className="size-5" />
        </span>
        <div className="space-y-1">
          <h4 className="text-[14px] font-bold text-[var(--color-ink)]">
            Explainable Biomedical Analytics Guarantee
          </h4>
          <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
            All analytical aggregations operate exclusively on de-identified entity instances and laboratory observations parsed from completed records. Models use scikit-learn algorithmic backbones with full deterministic reproducibility.
          </p>
        </div>
      </div>
    </div>
  );
}
