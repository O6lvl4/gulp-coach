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

// 60kg → emptyingRate 9 mL/min, dailyTarget 2100
const profile = Profile.create(Kilogram.unsafe(60), Year.unsafe(30), Sex.Male);

const NOW = new Date("2026-04-24T12:00:00");

describe("HydrationStatus.compute (pool model)", () => {
  it("空ログ: pool 0、即 ok で sessionMax 400 まで", () => {
    const s = HydrationStatus.compute(IntakeLog.empty(), profile, NOW);
    expect(s.currentPool).toBe(0);
    expect(s.advice.kind).toBe("ok");
    if (s.advice.kind === "ok") expect(s.advice.canDrinkUpTo).toBe(400);
  });

  it("emptyingRate と stomachLimit が status に出る", () => {
    const s = HydrationStatus.compute(IntakeLog.empty(), profile, NOW);
    expect(s.emptyingRate).toBe(9);
    expect(s.stomachLimit).toBe(500);
  });

  it("ちょうど飲んだ300mL: pool 300、空き 200 → ok 200", () => {
    const log = IntakeLog.create([ev("a", "2026-04-24T12:00:00", 300)]);
    const s = HydrationStatus.compute(log, profile, NOW);
    expect(s.currentPool).toBe(300);
    expect(s.advice.kind).toBe("ok");
    if (s.advice.kind === "ok") expect(s.advice.canDrinkUpTo).toBe(200);
  });

  it("胃満タン (500): canDrink 0 → wait", () => {
    const log = IntakeLog.create([ev("a", "2026-04-24T12:00:00", 500)]);
    const s = HydrationStatus.compute(log, profile, NOW);
    expect(s.currentPool).toBe(500);
    expect(s.advice.kind).toBe("wait");
    if (s.advice.kind === "wait") {
      // pool が 400 (limit - minMeaningful) まで下がる: 100mL drain @ 9 mL/min = 11.11min → ceil 12
      expect(s.advice.waitMinutes).toBe(12);
    }
  });

  it("時間経過で pool が減衰: 30分前に300mL なら pool ≈ 30 (300-30*9=30)", () => {
    const at = new Date(NOW.getTime() - 30 * 60_000);
    const log = IntakeLog.create([
      { ...ev("a", "", 300), at },
    ]);
    const s = HydrationStatus.compute(log, profile, NOW);
    expect(s.currentPool).toBe(30);
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

  it("飲んでから十分経てば pool 0 で ok", () => {
    const at = new Date(NOW.getTime() - 60 * 60_000); // 1h前
    const log = IntakeLog.create([{ ...ev("a", "", 300), at }]);
    const s = HydrationStatus.compute(log, profile, NOW);
    expect(s.currentPool).toBe(0);
    expect(s.advice.kind).toBe("ok");
  });
});
