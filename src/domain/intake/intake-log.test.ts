import { describe, it, expect } from "vitest";
import { IntakeLog } from "./intake-log.js";
import { IntakeEventId, type IntakeEvent } from "./intake-event.js";
import { Milliliter } from "../shared/units.js";

const ev = (id: string, atIso: string, vol: number): IntakeEvent => ({
  id: IntakeEventId.unsafe(id),
  at: new Date(atIso),
  volume: Milliliter.unsafe(vol),
});

describe("IntakeLog", () => {
  it("create は時間順にソート", () => {
    const log = IntakeLog.create([
      ev("b", "2026-04-24T11:00:00", 200),
      ev("a", "2026-04-24T10:00:00", 100),
    ]);
    expect(log.events.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("add すると新しいエベントが入って時間順を保つ", () => {
    const base = IntakeLog.create([ev("a", "2026-04-24T10:00:00", 100)]);
    const added = IntakeLog.add(base, ev("b", "2026-04-24T11:00:00", 200));
    expect(added.events).toHaveLength(2);
  });

  it("remove で指定 id のみ消える", () => {
    const base = IntakeLog.create([
      ev("a", "2026-04-24T10:00:00", 100),
      ev("b", "2026-04-24T11:00:00", 200),
    ]);
    const removed = IntakeLog.remove(base, IntakeEventId.unsafe("a"));
    expect(removed.events.map((e) => e.id)).toEqual(["b"]);
  });

  it("totalBetween は半開区間 [since, until)", () => {
    const log = IntakeLog.create([
      ev("a", "2026-04-24T10:00:00", 100),
      ev("b", "2026-04-24T11:00:00", 200),
      ev("c", "2026-04-24T11:30:00", 150),
    ]);
    expect(
      IntakeLog.totalBetween(
        log,
        new Date("2026-04-24T11:00:00"),
        new Date("2026-04-24T12:00:00"),
      ),
    ).toBe(350);
    // 境界: since は含む、until は含まない
    expect(
      IntakeLog.totalBetween(
        log,
        new Date("2026-04-24T11:00:00"),
        new Date("2026-04-24T11:30:00"),
      ),
    ).toBe(200);
  });

  it("oldestBetween は範囲内の最古を返す", () => {
    const log = IntakeLog.create([
      ev("a", "2026-04-24T10:00:00", 100),
      ev("b", "2026-04-24T11:00:00", 200),
      ev("c", "2026-04-24T11:30:00", 150),
    ]);
    const o = IntakeLog.oldestBetween(
      log,
      new Date("2026-04-24T10:30:00"),
      new Date("2026-04-24T12:00:00"),
    );
    expect(o?.id).toBe("b");
  });

  it("updateAt で時刻を変更し、ソート順も再構成", () => {
    const log = IntakeLog.create([
      ev("a", "2026-04-24T10:00:00", 100),
      ev("b", "2026-04-24T11:00:00", 200),
    ]);
    const updated = IntakeLog.updateAt(
      log,
      IntakeEventId.unsafe("a"),
      new Date("2026-04-24T12:00:00"),
    );
    // a が 12:00 になったので順序は b (11:00) → a (12:00)
    expect(updated.events.map((e) => e.id)).toEqual(["b", "a"]);
    expect(updated.events.find((e) => e.id === "a")!.at.toISOString()).toBe(
      new Date("2026-04-24T12:00:00").toISOString(),
    );
  });

  it("recent は新しい順で n 件", () => {
    const log = IntakeLog.create([
      ev("a", "2026-04-24T10:00:00", 100),
      ev("b", "2026-04-24T11:00:00", 200),
      ev("c", "2026-04-24T11:30:00", 150),
    ]);
    expect(IntakeLog.recent(log, 2).map((e) => e.id)).toEqual(["c", "b"]);
  });
});
