/**
 * Hydration Policy: 飲水アドバイスの境界値。
 * デフォルト値は生理学的な保守的目安に基づく。
 */
import { type Milliliter, Milliliter as ML } from "../shared/units.js";

export type HydrationPolicy = {
  /** 胃の快適容量上限 (mL)。pool がこれを超えないよう調整 */
  readonly stomachLimit: Milliliter;
  /** 1回の摂取で胃に負担をかけない上限 (mL) */
  readonly sessionMax: Milliliter;
  /** 「飲める」とアドバイスする最小単位 (mL)。これ未満なら待機推奨 */
  readonly minimumMeaningful: Milliliter;
};

export const DEFAULT_HYDRATION_POLICY: HydrationPolicy = {
  stomachLimit: ML.unsafe(500),
  sessionMax: ML.unsafe(400),
  minimumMeaningful: ML.unsafe(100),
};
