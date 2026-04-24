/**
 * Beverage: 飲み物の種別 VO。
 * 各種別ごとに表示メタ (絵文字・日本語名) とカフェイン含有量 (mg/mL) を持つ。
 *
 * カフェイン含有量はメーカー・抽出条件で大きく変わるため、保守的な平均値を採用:
 *   コーヒー (drip): ~95mg / 240mL ≈ 0.40 mg/mL
 *   紅茶:           ~47mg / 240mL ≈ 0.20 mg/mL
 *   緑茶:           ~28mg / 240mL ≈ 0.12 mg/mL
 */
import type { Milliliter } from "../shared/units.js";

export const Beverage = {
  Water: "water",
  Coffee: "coffee",
  GreenTea: "green-tea",
  BlackTea: "black-tea",
  Other: "other",
} as const;

export type Beverage = (typeof Beverage)[keyof typeof Beverage];

export type BeverageMeta = {
  readonly emoji: string;
  readonly label: string;
  readonly caffeineMgPerMl: number;
};

const META: Record<Beverage, BeverageMeta> = {
  water: { emoji: "💧", label: "水", caffeineMgPerMl: 0 },
  coffee: { emoji: "☕", label: "コーヒー", caffeineMgPerMl: 0.4 },
  "green-tea": { emoji: "🍵", label: "緑茶", caffeineMgPerMl: 0.12 },
  "black-tea": { emoji: "🫖", label: "紅茶", caffeineMgPerMl: 0.2 },
  other: { emoji: "🧃", label: "その他", caffeineMgPerMl: 0 },
};

export const beverageMeta = (b: Beverage): BeverageMeta => META[b];

export const allBeverages = (): ReadonlyArray<Beverage> =>
  Object.keys(META) as Beverage[];

/** 量 (mL) と種別からカフェイン量 (mg) を算出 (整数丸め) */
export const caffeineMgFor = (b: Beverage, volume: Milliliter): number =>
  Math.round(META[b].caffeineMgPerMl * volume);

export const isCaffeinated = (b: Beverage): boolean =>
  META[b].caffeineMgPerMl > 0;
