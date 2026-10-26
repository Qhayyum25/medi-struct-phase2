import { Link } from "react-router-dom";
import { Compass, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-28 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/30 shadow-[0_0_20px_rgba(0,229,153,0.15)]">
        <Compass className="size-7" />
      </span>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Clinical Resource Not Found
        </h1>
        <p className="mt-1 text-[13px] text-slate-400 max-w-sm">
          The requested clinical view, document, or patient record does not exist or has been removed.
        </p>
      </div>
      <Link to="/" className="mt-2">
        <Button variant="primary">
          Return to Dashboard <ArrowRight className="size-3.5" />
        </Button>
      </Link>
    </div>
  );
}
