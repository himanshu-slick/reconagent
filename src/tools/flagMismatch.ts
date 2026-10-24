import type { Decision, Flagged, Mismatch } from "../types";

// approve = accept the vendor's figure and close the item; reject = dispute it with the vendor.
export function flagMismatch(m: Mismatch, decision: Decision): Flagged {
  return { key: m.key, kind: m.kind, vendor: m.vendor, reason: m.reason, decision };
}
