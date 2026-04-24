import { describe, it, expect } from "vitest";
import { poolAt, nextTimeAtOrBelow } from "./stomach-pool.js";
import { IntakeEventId, type IntakeEvent } from "../intake/intake-event.js";
import { Beverage } from "../intake/beverage.js";
import { Milliliter } from "../shared/units.js";

const ev = (id: string, at: Date, vol: number): IntakeEvent => ({
  id: IntakeEventId.unsafe(id),
  at,
  volume: Milliliter.unsafe(vol),
  beverage: Beverage.Water,
});

const NOW = new Date("2026-04-24T12:00:00");
const RATE = 10; // mL/min

describe("poolAt", () => {
  it("空配列で 0", () => {
    expect(poolAt([], RATE, NOW)).toBe(0);
  });

  it("飲んだ直後はそのまま (300)", () => {
    expect(poolAt([ev("a", NOW, 300)], RATE, NOW)).toBe(300);
  });

  it("10分前に300mL: 200残る (300 - 10*10)", () => {
    const at = new Date(NOW.getTime() - 10 * 60_000);
    expect(poolAt([ev("a", at, 300)], RATE, NOW)).toBe(200);
  });

  it("30分前に300mL: 0 (drain 完了)", () => {
    const at = new Date(NOW.getTime() - 30 * 60_000);
    expect(poolAt([ev("a", at, 300)], RATE, NOW)).toBe(0);
  });

  it("複数イベント合算", () => {
    const events = [
      ev("a", new Date(NOW.getTime() - 10 * 60_000), 300), // 200残
      ev("b", new Date(NOW.getTime() - 5 * 60_000), 250), // 200残
      ev("c", NOW, 100), // 100残
    ];
    expect(poolAt(events, RATE, NOW)).toBe(500);
  });
});

describe("nextTimeAtOrBelow", () => {
  it("既に下回っていたら now", () => {
    expect(nextTimeAtOrBelow([], RATE, NOW, 100)).toEqual(NOW);
  });

  it("500mLちょうど飲んだ直後、target=400 → 10分後 (100mL drain @ 10mL/min)", () => {
    const events = [ev("a", NOW, 500)];
    const r = nextTimeAtOrBelow(events, RATE, NOW, 400);
    expect((r.getTime() - NOW.getTime()) / 60_000).toBeCloseTo(10, 5);
  });

  it("750mL pool from 3 events, target=400 → ~12分待ち", () => {
    // -10:300, -5:300, 0:300 → pool = 200 + 250 + 300 = 750
    // drain rate = 3 * 10 = 30 mL/min
    // need to drain 350 → 350/30 ≈ 11.67 min
    const events = [
      ev("a", new Date(NOW.getTime() - 10 * 60_000), 300),
      ev("b", new Date(NOW.getTime() - 5 * 60_000), 300),
      ev("c", NOW, 300),
    ];
    const r = nextTimeAtOrBelow(events, RATE, NOW, 400);
    const waitMin = (r.getTime() - NOW.getTime()) / 60_000;
    expect(waitMin).toBeCloseTo(350 / 30, 4);
  });
});
