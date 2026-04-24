import { describe, it, expect } from "vitest";
import { CaffeineStatus } from "./status.js";
import { IntakeLog } from "../intake/intake-log.js";
import { IntakeEventId, type IntakeEvent } from "../intake/intake-event.js";
import { Beverage } from "../intake/beverage.js";
import { Milliliter } from "../shared/units.js";

const ev = (id: string, atIso: string, vol: number, beverage: Beverage): IntakeEvent => ({
  id: IntakeEventId.unsafe(id),
  at: new Date(atIso),
  volume: Milliliter.unsafe(vol),
  beverage,
});

const NOW = new Date("2026-04-24T18:00:00");

describe("CaffeineStatus.compute", () => {
  it("空ログ: 0mg / level=ok", () => {
    const s = CaffeineStatus.compute(IntakeLog.empty(), NOW);
    expect(s.totalTodayMg).toBe(0);
    expect(s.level).toBe("ok");
    expect(s.lastIntakeAt).toBeNull();
  });

  it("水だけならカフェインゼロ", () => {
    const log = IntakeLog.create([ev("a", "2026-04-24T10:00:00", 500, Beverage.Water)]);
    const s = CaffeineStatus.compute(log, NOW);
    expect(s.totalTodayMg).toBe(0);
  });

  it("コーヒー200mLは80mg", () => {
    const log = IntakeLog.create([ev("a", "2026-04-24T09:00:00", 200, Beverage.Coffee)]);
    const s = CaffeineStatus.compute(log, NOW);
    expect(s.totalTodayMg).toBe(80);
    expect(s.lastIntakeAt?.toISOString()).toBe(
      new Date("2026-04-24T09:00:00").toISOString(),
    );
  });

  it("複数飲み物の合算", () => {
    const log = IntakeLog.create([
      ev("a", "2026-04-24T08:00:00", 200, Beverage.Coffee), // 80
      ev("b", "2026-04-24T11:00:00", 250, Beverage.GreenTea), // 30
      ev("c", "2026-04-24T13:00:00", 240, Beverage.BlackTea), // 48
    ]);
    const s = CaffeineStatus.compute(log, NOW);
    expect(s.totalTodayMg).toBe(80 + 30 + 48);
    expect(s.lastIntakeAt?.toISOString()).toBe(
      new Date("2026-04-24T13:00:00").toISOString(),
    );
  });

  it("レベル境界 (default 400mg)", () => {
    const mk = (mg: number) =>
      CaffeineStatus.compute(
        IntakeLog.create([
          ev("a", "2026-04-24T10:00:00", Math.round(mg / 0.4), Beverage.Coffee),
        ]),
        NOW,
      );
    expect(mk(0).level).toBe("ok");
    expect(mk(199).level).toBe("ok");
    expect(mk(200).level).toBe("moderate");
    expect(mk(299).level).toBe("moderate");
    expect(mk(300).level).toBe("warn");
    expect(mk(400).level).toBe("warn");
    expect(mk(401).level).toBe("over");
  });

  it("dailyLimitMg を変えれば妊娠時 200mg にできる", () => {
    const log = IntakeLog.create([ev("a", "2026-04-24T10:00:00", 500, Beverage.Coffee)]);
    const s = CaffeineStatus.compute(log, NOW, 200);
    expect(s.totalTodayMg).toBe(200);
    expect(s.level).toBe("warn");
  });

  it("前日のイベントは無視", () => {
    const log = IntakeLog.create([ev("a", "2026-04-23T20:00:00", 200, Beverage.Coffee)]);
    const s = CaffeineStatus.compute(log, NOW);
    expect(s.totalTodayMg).toBe(0);
  });
});
