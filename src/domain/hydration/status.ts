/**
 * HydrationStatus: 「今どれだけ飲めるか / 何時まで待つか」のドメイン状態。
 *
 * モデル: 直近60分のローリング合計が `Profile.maxHourlyRate` を超えないように制御する。
 *   availableNow = max(0, maxRate - sumLast60min)
 *   canDrinkUpTo = min(availableNow, sessionMax)
 *   minimumMeaningful 未満なら、最古エベントが窓を抜けるタイミングまで待機推奨
 */
import { type Milliliter, Milliliter as ML, Minute } from "../shared/units.js";
import { startOfDay } from "../shared/clock.js";
import type { IntakeLog } from "../intake/intake-log.js";
import { IntakeLog as Log } from "../intake/intake-log.js";
import type { Profile } from "../profile/profile.js";
import { Profile as Pr } from "../profile/profile.js";
import { type HydrationPolicy, DEFAULT_HYDRATION_POLICY } from "./policy.js";

const HOUR_MS = 3_600_000;

export type HydrationDrinkAdvice =
  | { readonly kind: "ok"; readonly canDrinkUpTo: Milliliter }
  | { readonly kind: "wait"; readonly until: Date; readonly waitMinutes: Minute };

export type HydrationStatus = {
  readonly observedAt: Date;
  readonly consumedLastHour: Milliliter;
  readonly consumedToday: Milliliter;
  readonly dailyTarget: Milliliter;
  readonly dailyProgressRatio: number;
  readonly maxHourlyRate: Milliliter; // mL/h を mL として比較するため数値同型
  readonly advice: HydrationDrinkAdvice;
};

export const HydrationStatus = {
  compute: (
    log: IntakeLog,
    profile: Profile,
    now: Date,
    policy: HydrationPolicy = DEFAULT_HYDRATION_POLICY,
  ): HydrationStatus => {
    const oneHourAgo = new Date(now.getTime() - HOUR_MS);
    const consumedLastHour = Log.totalBetween(log, oneHourAgo, now);
    const consumedToday = Log.totalBetween(log, startOfDay(now), now);
    const dailyTarget = Pr.recommendedDailyIntake(profile);
    const maxRate = Pr.maxHourlyRate(profile);

    const availableNow = Math.max(0, maxRate - consumedLastHour);
    const canDrinkUpTo = Math.min(availableNow, policy.sessionMax);

    const advice: HydrationDrinkAdvice =
      canDrinkUpTo >= policy.minimumMeaningful
        ? { kind: "ok", canDrinkUpTo: ML.unsafe(canDrinkUpTo) }
        : computeWaitAdvice(log, oneHourAgo, now, maxRate, policy);

    return {
      observedAt: now,
      consumedLastHour,
      consumedToday,
      dailyTarget,
      dailyProgressRatio: dailyTarget > 0 ? consumedToday / dailyTarget : 0,
      maxHourlyRate: ML.unsafe(maxRate),
      advice,
    };
  },
};

/**
 * 待機時間を計算する: 直近1h窓のうち、古い順にエベントを「抜けさせて」いき、
 * 「`minimumMeaningful` 以上飲める空き」が確保される最初のタイミングを返す。
 */
const computeWaitAdvice = (
  log: IntakeLog,
  oneHourAgo: Date,
  now: Date,
  maxRate: number,
  policy: HydrationPolicy,
): HydrationDrinkAdvice => {
  const inWindow = log.events
    .filter((e) => {
      const t = e.at.getTime();
      return t >= oneHourAgo.getTime() && t < now.getTime();
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const consumed = inWindow.reduce((s, e) => s + e.volume, 0);
  // 必要な空き = minimumMeaningful まで飲めるようにする
  const needed = consumed - (maxRate - policy.minimumMeaningful);

  let freed = 0;
  for (const e of inWindow) {
    freed += e.volume;
    if (freed >= needed) {
      const until = new Date(e.at.getTime() + HOUR_MS);
      return {
        kind: "wait",
        until,
        waitMinutes: Minute.of((until.getTime() - now.getTime()) / 60_000),
      };
    }
  }
  // ここに来るのは数学的にはありえないが、安全側で now を返す
  return { kind: "wait", until: now, waitMinutes: Minute.of(0) };
};
