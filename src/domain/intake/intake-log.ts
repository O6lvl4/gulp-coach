/**
 * IntakeLog: IntakeEvent の集約ルート。
 * ドメインクエリ (期間合計、最古エベント等) を提供する。
 */
import { type Milliliter, Milliliter as ML } from "../shared/units.js";
import type { IntakeEvent, IntakeEventId } from "./intake-event.js";

export type IntakeLog = {
  readonly events: ReadonlyArray<IntakeEvent>;
};

export const IntakeLog = {
  empty: (): IntakeLog => ({ events: [] }),

  create: (events: ReadonlyArray<IntakeEvent>): IntakeLog => ({
    events: [...events].sort((a, b) => a.at.getTime() - b.at.getTime()),
  }),

  add: (log: IntakeLog, event: IntakeEvent): IntakeLog =>
    IntakeLog.create([...log.events, event]),

  remove: (log: IntakeLog, id: IntakeEventId): IntakeLog => ({
    events: log.events.filter((e) => e.id !== id),
  }),

  /** [since, until) の範囲合計 */
  totalBetween: (log: IntakeLog, since: Date, until: Date): Milliliter => {
    const sinceMs = since.getTime();
    const untilMs = until.getTime();
    let sum = 0;
    for (const e of log.events) {
      const t = e.at.getTime();
      if (t >= sinceMs && t < untilMs) sum += e.volume;
    }
    return ML.unsafe(sum);
  },

  /** 範囲内で最も古い event */
  oldestBetween: (
    log: IntakeLog,
    since: Date,
    until: Date,
  ): IntakeEvent | null => {
    const sinceMs = since.getTime();
    const untilMs = until.getTime();
    for (const e of log.events) {
      const t = e.at.getTime();
      if (t >= sinceMs && t < untilMs) return e;
    }
    return null;
  },

  /** 新しい順で n 件 */
  recent: (log: IntakeLog, n: number): ReadonlyArray<IntakeEvent> =>
    [...log.events].reverse().slice(0, n),
};
