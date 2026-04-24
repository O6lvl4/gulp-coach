import { describe, it, expect, vi } from "vitest";
import {
  logIntake,
  loadDashboard,
  undoLast,
  saveProfile,
  deleteEvent,
  updateEventTime,
  type Deps,
} from "./use-cases.js";
import type {
  IntakeRepository,
  ProfileRepository,
} from "./ports.js";
import { IntakeLog } from "../domain/intake/intake-log.js";
import { IntakeEventId } from "../domain/intake/intake-event.js";
import { Profile } from "../domain/profile/profile.js";
import { Sex } from "../domain/profile/sex.js";
import { Kilogram, Year, Milliliter } from "../domain/shared/units.js";

const mkProfile = () =>
  Profile.create(Kilogram.unsafe(60), Year.unsafe(30), Sex.Male);

const inMemoryIntake = (initial = IntakeLog.empty()): IntakeRepository => {
  let state = initial;
  return {
    load: async () => state,
    save: async (l) => {
      state = l;
    },
  };
};

const inMemoryProfile = (initial: Profile | null = null): ProfileRepository => {
  let state = initial;
  return {
    load: async () => state,
    save: async (p) => {
      state = p;
    },
  };
};

const buildDeps = (overrides: Partial<Deps> = {}): Deps => ({
  intake: inMemoryIntake(),
  profile: inMemoryProfile(mkProfile()),
  clock: () => new Date("2026-04-24T12:00:00"),
  idGen: () => "evt-1",
  ...overrides,
});

describe("logIntake", () => {
  it("摂取イベントを保存する", async () => {
    const intake = inMemoryIntake();
    const deps = buildDeps({ intake });
    const e = await logIntake(deps, Milliliter.unsafe(200));
    expect(e.volume).toBe(200);
    const saved = await intake.load();
    expect(saved.events).toHaveLength(1);
  });
});

describe("undoLast", () => {
  it("最新の1件を削除", async () => {
    const initial = IntakeLog.create([
      {
        id: IntakeEventId.unsafe("a"),
        at: new Date("2026-04-24T11:00:00"),
        volume: Milliliter.unsafe(100),
      },
      {
        id: IntakeEventId.unsafe("b"),
        at: new Date("2026-04-24T11:30:00"),
        volume: Milliliter.unsafe(200),
      },
    ]);
    const intake = inMemoryIntake(initial);
    await undoLast(buildDeps({ intake }));
    const saved = await intake.load();
    expect(saved.events.map((e) => e.id)).toEqual(["a"]);
  });

  it("空ログでも安全 (no-op)", async () => {
    const intake = inMemoryIntake();
    await undoLast(buildDeps({ intake }));
    expect((await intake.load()).events).toHaveLength(0);
  });
});

describe("loadDashboard", () => {
  it("profile 未設定なら null", async () => {
    const r = await loadDashboard(buildDeps({ profile: inMemoryProfile(null) }));
    expect(r).toBeNull();
  });

  it("profile 有: status と log を返す", async () => {
    const r = await loadDashboard(buildDeps());
    expect(r).not.toBeNull();
    expect(r!.status.advice.kind).toBe("ok");
    expect(r!.profile.weight).toBe(60);
  });
});

describe("deleteEvent", () => {
  it("指定 id を削除", async () => {
    const initial = IntakeLog.create([
      {
        id: IntakeEventId.unsafe("a"),
        at: new Date("2026-04-24T10:00:00"),
        volume: Milliliter.unsafe(100),
      },
    ]);
    const intake = inMemoryIntake(initial);
    await deleteEvent(buildDeps({ intake }), IntakeEventId.unsafe("a"));
    expect((await intake.load()).events).toHaveLength(0);
  });
});

describe("updateEventTime", () => {
  it("指定 id の時刻を更新", async () => {
    const initial = IntakeLog.create([
      {
        id: IntakeEventId.unsafe("a"),
        at: new Date("2026-04-24T10:00:00"),
        volume: Milliliter.unsafe(100),
      },
    ]);
    const intake = inMemoryIntake(initial);
    const newAt = new Date("2026-04-24T08:30:00");
    await updateEventTime(buildDeps({ intake }), IntakeEventId.unsafe("a"), newAt);
    const saved = await intake.load();
    expect(saved.events[0].at.toISOString()).toBe(newAt.toISOString());
  });
});

describe("saveProfile", () => {
  it("profile を repo に保存", async () => {
    const profile = inMemoryProfile(null);
    const save = vi.spyOn(profile, "save");
    await saveProfile({ profile }, mkProfile());
    expect(save).toHaveBeenCalled();
  });
});
