/**
 * Profile: 個人情報の集約。
 * 推奨1日量と1時間あたり摂取上限はここから導出する。
 *
 * - 1日推奨量 = 体重 × 35 mL/kg/day をベースに、性別・年齢で軽補正
 * - 1時間上限 = 体重 × 10 mL/h をベースに [400, 800] にクランプ
 *   (腎臓の自由水排出能力 ~16 mL/min ≒ 960 mL/h に対する保守値)
 */
import { type Kilogram, type Year, type MlPerHour, type Milliliter, MlPerHour as MPH, Milliliter as ML } from "../shared/units.js";
import type { Sex } from "./sex.js";

export type Profile = {
  readonly weight: Kilogram;
  readonly age: Year;
  readonly sex: Sex;
  /** ユーザーが任意に上書きする 1h 上限 (mL/h) */
  readonly customMaxHourlyRate?: MlPerHour;
};

export const Profile = {
  create: (
    weight: Kilogram,
    age: Year,
    sex: Sex,
    customMaxHourlyRate?: MlPerHour,
  ): Profile => ({ weight, age, sex, customMaxHourlyRate }),

  /** 1日推奨摂取量 (mL) */
  recommendedDailyIntake: (p: Profile): Milliliter => {
    const base = p.weight * 35;
    const sexAdj = p.sex === "female" ? 0.95 : 1.0;
    const ageAdj = p.age >= 65 ? 0.9 : p.age <= 14 ? 0.8 : 1.0;
    return ML.unsafe(Math.round(base * sexAdj * ageAdj));
  },

  /** 1時間あたり安全な摂取上限 (mL/h) */
  maxHourlyRate: (p: Profile): MlPerHour => {
    if (p.customMaxHourlyRate != null) return p.customMaxHourlyRate;
    const base = p.weight * 10;
    return MPH.unsafe(Math.min(800, Math.max(400, Math.round(base))));
  },
};
