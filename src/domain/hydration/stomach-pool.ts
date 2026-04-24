/**
 * 胃ポール (stomach pool) ドメインサービス。
 * 各 IntakeEvent は時間経過で線形に減衰し、現在の胃の中身合計が pool。
 *
 *   remaining_i(t) = max(0, volume_i - elapsed_min × emptyingRate)
 *   pool(t)        = Σ remaining_i(t)
 */
import type { IntakeEvent } from "../intake/intake-event.js";
import { type Milliliter, Milliliter as ML } from "../shared/units.js";

const MS_PER_MIN = 60_000;

/** 指定時刻における胃ポール総量を返す */
export const poolAt = (
  events: ReadonlyArray<IntakeEvent>,
  emptyingRate: number,
  at: Date,
): Milliliter => {
  const tMs = at.getTime();
  let sum = 0;
  for (const e of events) {
    const elapsedMin = (tMs - e.at.getTime()) / MS_PER_MIN;
    if (elapsedMin < 0) continue; // 未来のエベントのみ無視 (今 = まだ満タン)
    const remaining = e.volume - elapsedMin * emptyingRate;
    if (remaining > 0) sum += remaining;
  }
  return ML.unsafe(Math.round(sum));
};

/**
 * pool が `targetPool` 以下になる最短時刻を返す。
 * 既に下回っていれば `now` を返す。
 *
 * 各エベントの drain 完了タイミングをマイルストーンとして区間ごとに線形減少を追う。
 */
export const nextTimeAtOrBelow = (
  events: ReadonlyArray<IntakeEvent>,
  emptyingRate: number,
  now: Date,
  targetPool: number,
): Date => {
  // now 時点でまだドレイン中のエベントを抽出 (= remaining > 0)
  const actives = events
    .map((e) => {
      const drainMin = e.volume / emptyingRate;
      return { at: e.at, volume: e.volume, emptyAt: new Date(e.at.getTime() + drainMin * MS_PER_MIN) };
    })
    .filter((a) => a.emptyAt.getTime() > now.getTime() && a.at.getTime() <= now.getTime())
    .sort((a, b) => a.emptyAt.getTime() - b.emptyAt.getTime());

  let currentTime = now.getTime();
  let currentPool = 0;
  for (const a of actives) {
    const elapsedMin = (currentTime - a.at.getTime()) / MS_PER_MIN;
    currentPool += Math.max(0, a.volume - elapsedMin * emptyingRate);
  }

  if (currentPool <= targetPool) return now;

  for (let i = 0; i < actives.length; i++) {
    const numActive = actives.length - i; // i, i+1, ..., n-1 がアクティブ
    const drainRate = numActive * emptyingRate; // mL/min
    const milestoneMs = actives[i].emptyAt.getTime();
    const dtMin = (milestoneMs - currentTime) / MS_PER_MIN;
    const poolAtMilestone = currentPool - drainRate * dtMin;
    if (poolAtMilestone <= targetPool) {
      const needed = currentPool - targetPool;
      const dtToTargetMin = needed / drainRate;
      return new Date(currentTime + dtToTargetMin * MS_PER_MIN);
    }
    currentTime = milestoneMs;
    currentPool = poolAtMilestone;
  }

  // 全部 drain 完了しても下回らないケース (targetPool < 0 等) — 最後の milestone を返す
  return new Date(currentTime);
};
