import { useEffect, useState } from "react";
import { BASE_URL } from "../api/client";

/** Polls the backend's unauthenticated /health endpoint so the topbar can show a
 * connection indicator without depending on any protected data being loaded. */
export function useApiHealth(intervalMs = 30000): boolean {
  const [healthy, setHealthy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(new URL("health", BASE_URL + "/"));
        if (!cancelled) setHealthy(res.ok);
      } catch {
        if (!cancelled) setHealthy(false);
      }
    };
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return healthy;
}
