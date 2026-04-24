import { describe, it, expect } from "vitest";
import { HydrationStatus } from "./status.js";
import { IntakeLog } from "../intake/intake-log.js";
import { IntakeEventId, type IntakeEvent } from "../intake/intake-event.js";
import { Profile } from "../profile/profile.js";
import { Sex } from "../profile/sex.js";
import { Kilogram, Year, Milliliter } from "../shared/units.js";
import { Beverage } from "../intake/beverage.js";

const ev = (id: string, atIso: string, vol: number): IntakeEvent => ({
  id: IntakeEventId.unsafe(id),
  at: new Date(atIso),
  volume: Milliliter.unsafe(vol),
  beverage: Beverage.Water,
});

const profile = Profile.create(Kilogram.unsafe(60), Year.unsafe(30), Sex.Male);
// → maxHourlyRate = 600, dailyTarget = 2100

const NOW = new Date("2026-04-24T12:00:00");

describe("HydrationStatus.compute", () => {
  it("空ログ: 即 ok で sessionMax まで飲める", () => {
    const s = HydrationStatus.compute(IntakeLog.empty(), profile, NOW);
    expect(s.advice.kind).toBe("ok");
    if (s.advice.kind === "ok") expect(s.advice.canDrinkUpTo).toBe(400);
  });

  it("直近1hで300mL摂取済み: 残り300mLだが sessionMax 400 とは min", () => {
    const log = IntakeLog.create([ev("a", "2026-04-24T11:30:00", 300)]);
    const s = HydrationStatus.compute(log, profile, NOW);
    expect(s.advice.kind).toBe("ok");
    if (s.advice.kind === "ok") expect(s.advice.canDrinkUpTo).toBe(300);
  });

  it("直近1hで600mL満タン: wait に遷移", () => {
    const log = IntakeLog.create([
      ev("a", "2026-04-24T11:30:00", 300),
      ev("b", "2026-04-24T11:50:00", 300),
    ]);
    const s = HydrationStatus.compute(log, profile, NOW);
    expect(s.advice.kind).toBe("wait");
    if (s.advice.kind === "wait") {
      // 11:30 のエベントが 12:30 に窓を抜ける → そこで 300mL free → minMeaningful 100 以上 ok
      expect(s.advice.until.toISOString()).toBe(
        new Date("2026-04-24T12:30:00").toISOString(),
      );
      expect(s.advice.waitMinutes).toBe(30);
    }
  });

  it("当日合計と進捗率が出る", () => {
    const log = IntakeLog.create([
      ev("a", "2026-04-24T08:00:00", 500),
      ev("b", "2026-04-24T11:00:00", 400),
    ]);
    const s = HydrationStatus.compute(log, profile, NOW);
    expect(s.consumedToday).toBe(900);
    expect(s.dailyTarget).toBe(2100);
    expect(s.dailyProgressRatio).toBeCloseTo(900 / 2100, 5);
  });

  it("1h前ちょうどのエベントは window 内 (since 側を含む半開区間)", () => {
    const log = IntakeLog.create([ev("a", "2026-04-24T11:00:00", 600)]);
    const s = HydrationStatus.compute(log, profile, NOW);
    expect(s.consumedLastHour).toBe(600);
    expect(s.advice.kind).toBe("wait");
    if (s.advice.kind === "wait") {
      // until は 11:00 + 1h = 12:00、now と同時刻なので 0分待ち (即可能)
      expect(s.advice.waitMinutes).toBe(0);
    }
  });

  it("503mL ちょうど摂取で残り97mL → minimumMeaningful 100未満 → wait", () => {
    const log = IntakeLog.create([ev("a", "2026-04-24T11:30:00", 503)]);
    const s = HydrationStatus.compute(log, profile, NOW);
    expect(s.advice.kind).toBe("wait");
  });
});
