import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

type Step = (state: any) => Promise<Record<string, unknown>> | Record<string, unknown>;

const summarize = (update: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(update).map(([k, v]) => [k, Array.isArray(v) ? `${v.length} items` : typeof v === "object" && v ? Object.keys(v).length + " keys" : v]));

// Appends one JSON line per completed node: name, duration, and what it changed.
export function makeTracer(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  return (node: string, step: Step): Step =>
    async (state) => {
      const t0 = Date.now();
      const update = await step(state);
      appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), node, ms: Date.now() - t0, update: summarize(update) }) + "\n");
      return update;
    };
}
