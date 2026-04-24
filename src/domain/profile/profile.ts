/**
 * Profile: 個人情報の集約。
 * 推奨1日量と胃排出速度はここから導出する。
 *
 * - 1日推奨量 = 体重 × 35 mL/kg/day をベースに、性別・年齢で軽補正
 * - 胃排出速度 = 体重 × 0.15 mL/min/kg をベースに [8, 14] mL/min にクランプ
 *   (典型的な水の胃排出速度は ~10 mL/min、上限は腎自由水排出 ~16 mL/min)
 */
import {
  type Kilogram,
  type Year,
  type Milliliter,
  type MlPerMin,
  Milliliter as ML,
  MlPerMin as MPM,
} from "../shared/units.js";
import type { Sex } from "./sex.js";

export type Profile = {
  readonly weight: Kilogram;
  readonly age: Year;
  readonly sex: Sex;
  /** ユーザーが任意に上書きする胃排出速度 (mL/min) */
  readonly customEmptyingRate?: MlPerMin;
};

export const Profile = {
  create: (
    weight: Kilogram,
    age: Year,
    sex: Sex,
    customEmptyingRate?: MlPerMin,
  ): Profile => ({ weight, age, sex, customEmptyingRate }),

  /** 1日推奨摂取量 (mL) */
  recommendedDailyIntake: (p: Profile): Milliliter => {
    const base = p.weight * 35;
    const sexAdj = p.sex === "female" ? 0.95 : 1.0;
    const ageAdj = p.age >= 65 ? 0.9 : p.age <= 14 ? 0.8 : 1.0;
    return ML.unsafe(Math.round(base * sexAdj * ageAdj));
  },

  /** 胃排出速度 (mL/min) */
  emptyingRate: (p: Profile): MlPerMin => {
    if (p.customEmptyingRate != null) return p.customEmptyingRate;
    const base = p.weight * 0.15;
    return MPM.unsafe(Math.min(14, Math.max(8, Math.round(base * 10) / 10)));
  },
};
