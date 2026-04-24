/**
 * CaffeineStatus: 当日のカフェイン累計と上限管理。
 * デフォルト上限 400mg/day は FDA / EFSA の成人向け推奨値。
 * 妊娠中など上限変更が必要な場合は dailyLimitMg を引数で差し替える。
 */
import { startOfDay } from "../shared/clock.js";
import type { IntakeLog } from "../intake/intake-log.js";
import { caffeineMgFor } from "../intake/beverage.js";

export const DEFAULT_CAFFEINE_LIMIT_MG = 400;

export type CaffeineLevel = "ok" | "moderate" | "warn" | "over";

export type CaffeineStatus = {
  readonly totalTodayMg: number;
  readonly lastIntakeAt: Date | null;
  readonly dailyLimitMg: number;
  readonly remainingMg: number;
  readonly progressRatio: number;
  readonly level: CaffeineLevel;
};

export const CaffeineStatus = {
  compute: (
    log: IntakeLog,
    now: Date,
    dailyLimitMg: number = DEFAULT_CAFFEINE_LIMIT_MG,
  ): CaffeineStatus => {
    const today = startOfDay(now);
    let total = 0;
    let last: Date | null = null;

    for (const e of log.events) {
      if (e.at < today || e.at > now) continue;
      const mg = caffeineMgFor(e.beverage, e.volume);
      if (mg <= 0) continue;
      total += mg;
      if (!last || e.at > last) last = e.at;
    }

    const remaining = Math.max(0, dailyLimitMg - total);
    const ratio = dailyLimitMg > 0 ? total / dailyLimitMg : 0;
    const level: CaffeineLevel =
      ratio > 1 ? "over" : ratio >= 0.75 ? "warn" : ratio >= 0.5 ? "moderate" : "ok";

    return {
      totalTodayMg: total,
      lastIntakeAt: last,
      dailyLimitMg,
      remainingMg: remaining,
      progressRatio: ratio,
      level,
    };
  },
};
