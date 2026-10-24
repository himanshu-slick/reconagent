import dataset from "../data/statements.json";

export type Line = { vendor: string; ref: string; date: string; description: string; amount: number };
export type VendorStatement = { code: string; name: string; period: string; lines: Line[] };

export const statements = (dataset as { vendors: VendorStatement[] }).vendors;

export const findStatement = (code: string) =>
  statements.find((s) => s.code.toLowerCase() === code.toLowerCase());
