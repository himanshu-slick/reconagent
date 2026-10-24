import type { TruthItem } from "../src/types";

export type Score = { truePositives: number; falsePositives: string[]; falseNegatives: string[]; precision: number; recall: number };

export function scoreDetection(predictedKeys: string[], truth: TruthItem[]): Score {
  const predicted = new Set(predictedKeys);
  const expected = new Set(truth.map((t) => t.key));
  const truePositives = [...predicted].filter((k) => expected.has(k)).length;
  return {
    truePositives,
    falsePositives: [...predicted].filter((k) => !expected.has(k)),
    falseNegatives: [...expected].filter((k) => !predicted.has(k)),
    precision: predicted.size ? truePositives / predicted.size : 1,
    recall: expected.size ? truePositives / expected.size : 1,
  };
}
