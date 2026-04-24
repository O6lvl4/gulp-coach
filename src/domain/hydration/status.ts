/**
 * HydrationStatus: 「今どれだけ飲めるか / 何分待つか」のドメイン状態。
 *
 * モデル: 胃ポール (stomach pool) ベース。
 *   pool         = poolAt(events, emptyingRate, now)
 *   canDrinkUpTo = min(sessionMax, max(0, stomachLimit - pool))
 *   minimumMeaningful 未満なら、pool が (stomachLimit - minimumMeaningful) まで下がる時刻を待つ
 */
import {
  type Milliliter,
  type MlPerMin,
  Milliliter as ML,
  Minute,
} from "../shared/units.js";
import { startOfDay } from "../shared/clock.js";
import type { IntakeLog } from "../intake/intake-log.js";
import { IntakeLog as Log } from "../intake/intake-log.js";
import type { Profile } from "../profile/profile.js";
import { Profile as Pr } from "../profile/profile.js";
import { type HydrationPolicy, DEFAULT_HYDRATION_POLICY } from "./policy.js";
import { poolAt, nextTimeAtOrBelow } from "./stomach-pool.js";

export type HydrationDrinkAdvice =
  | { readonly kind: "ok"; readonly canDrinkUpTo: Milliliter }
  | { readonly kind: "wait"; readonly until: Date; readonly waitMinutes: Minute };

export type HydrationStatus = {
  readonly observedAt: Date;
  readonly currentPool: Milliliter;
  readonly stomachLimit: Milliliter;
  readonly emptyingRate: MlPerMin;
  readonly consumedToday: Milliliter;
  readonly dailyTarget: Milliliter;
  readonly dailyProgressRatio: number;
  readonly advice: HydrationDrinkAdvice;
};

export const HydrationStatus = {
  compute: (
    log: IntakeLog,
    profile: Profile,
    now: Date,
    policy: HydrationPolicy = DEFAULT_HYDRATION_POLICY,
  ): HydrationStatus => {
    const rate = Pr.emptyingRate(profile);
    const pool = poolAt(log.events, rate, now);
    const consumedToday = Log.totalBetween(log, startOfDay(now), now);
    const dailyTarget = Pr.recommendedDailyIntake(profile);

    const availableInStomach = Math.max(0, policy.stomachLimit - pool);
    const canDrinkUpTo = Math.min(availableInStomach, policy.sessionMax);

    const advice: HydrationDrinkAdvice =
      canDrinkUpTo >= policy.minimumMeaningful
        ? { kind: "ok", canDrinkUpTo: ML.unsafe(canDrinkUpTo) }
        : computeWaitAdvice(log, rate, now, policy);

    return {
      observedAt: now,
      currentPool: pool,
      stomachLimit: policy.stomachLimit,
      emptyingRate: rate,
      consumedToday,
      dailyTarget,
      dailyProgressRatio: dailyTarget > 0 ? consumedToday / dailyTarget : 0,
      advice,
    };
  },
};

const computeWaitAdvice = (
  log: IntakeLog,
  rate: MlPerMin,
  now: Date,
  policy: HydrationPolicy,
): HydrationDrinkAdvice => {
  const target = policy.stomachLimit - policy.minimumMeaningful;
  const until = nextTimeAtOrBelow(log.events, rate, now, target);
  return {
    kind: "wait",
    until,
    waitMinutes: Minute.of((until.getTime() - now.getTime()) / 60_000),
  };
};
