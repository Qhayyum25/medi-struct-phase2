import { ApiError, NetworkError } from "../api/client";

/** Turns any thrown value from the API layer into one plain-language sentence.
 * Special-cases 503 MODEL_UNAVAILABLE per the product requirement: never show a raw
 * backend message for that one, always the same reassuring explanation. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      return "Clinical NLP is temporarily unavailable because the required model could not be loaded. Try again shortly, or contact your administrator if this continues.";
    }
    if (err.status === 409) return err.message || "This item is currently busy — try again in a moment.";
    if (err.status === 404) return err.message || "We couldn't find that.";
    if (err.status === 422 && err.details?.length) {
      return err.details.map((d) => d.message).join(" ");
    }
    return err.message || "Something went wrong.";
  }
  if (err instanceof NetworkError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something unexpected happened.";
}

export function errorCode(err: unknown): string | null {
  return err instanceof ApiError ? err.code : null;
}
