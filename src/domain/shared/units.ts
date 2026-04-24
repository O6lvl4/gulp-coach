/**
 * 単位 Value Object 群。Brand型でコンパイル時に意味を区別する。
 * 構築は `<Type>.of(n)` で範囲検証つき (Result 返り)。
 * 信頼できる入力 (テスト・LocalStorage 復元等) は `.unsafe()`。
 */
import type { Brand } from "./brand.js";
import { type Result, ok, err } from "./result.js";

// ─── 体積 (mL) ──────────────────────────────────
export type Milliliter = Brand<number, "Milliliter">;
export const Milliliter = {
  of: (n: number): Result<Milliliter, string> =>
    Number.isFinite(n) && n >= 0 && n <= 10_000
      ? ok(n as Milliliter)
      : err(`Milliliter out of range: ${n}`),
  unsafe: (n: number): Milliliter => n as Milliliter,
  zero: 0 as Milliliter,
  add: (a: Milliliter, b: Milliliter): Milliliter => (a + b) as Milliliter,
  sub: (a: Milliliter, b: Milliliter): Milliliter =>
    Math.max(0, a - b) as Milliliter,
  min: (a: Milliliter, b: Milliliter): Milliliter => Math.min(a, b) as Milliliter,
};

// ─── 体重 (kg) ──────────────────────────────────
export type Kilogram = Brand<number, "Kilogram">;
export const Kilogram = {
  of: (n: number): Result<Kilogram, string> =>
    Number.isFinite(n) && n >= 20 && n <= 250
      ? ok(n as Kilogram)
      : err(`Kilogram out of range: ${n}`),
  unsafe: (n: number): Kilogram => n as Kilogram,
};

// ─── 年齢 ────────────────────────────────────────
export type Year = Brand<number, "Year">;
export const Year = {
  of: (n: number): Result<Year, string> =>
    Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 130
      ? ok(n as Year)
      : err(`Year out of range: ${n}`),
  unsafe: (n: number): Year => n as Year,
};

// ─── 速度 (mL/min) ──────────────────────────────
/**
 * 胃排出速度。生理学上の典型値は水で約 10 mL/min (持続可能)、
 * 上限 ~16 mL/min (Noakes 低Na血症基準)。
 */
export type MlPerMin = Brand<number, "MlPerMin">;
export const MlPerMin = {
  of: (n: number): Result<MlPerMin, string> =>
    Number.isFinite(n) && n >= 1 && n <= 30
      ? ok(n as MlPerMin)
      : err(`MlPerMin out of range: ${n}`),
  unsafe: (n: number): MlPerMin => n as MlPerMin,
};

// ─── 分 (待機時間用) ────────────────────────────
export type Minute = Brand<number, "Minute">;
export const Minute = {
  of: (n: number): Minute => Math.max(0, Math.ceil(n)) as Minute,
};

// ─── ごく (gulp / swallow) ──────────────────────
/**
 * 1ごく = 30mL (成人の平均的な一口の体積、文献値の中央)。
 * 摂取の「直感的な単位」として mL と相互変換できる Value Object。
 */
export const ML_PER_GULP = 30 as const;

export type Gulp = Brand<number, "Gulp">;
export const Gulp = {
  of: (n: number): Result<Gulp, string> =>
    Number.isFinite(n) && n >= 0 && n <= 200
      ? ok(n as Gulp)
      : err(`Gulp out of range: ${n}`),
  unsafe: (n: number): Gulp => n as Gulp,
  toMl: (g: Gulp): Milliliter => Milliliter.unsafe(Math.round(g * ML_PER_GULP)),
  /** mL → ごく数 (整数に丸める。表示用) */
  fromMl: (m: Milliliter): Gulp => Math.round(m / ML_PER_GULP) as Gulp,
};
