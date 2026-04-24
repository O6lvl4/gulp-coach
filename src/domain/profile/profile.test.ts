import { describe, it, expect } from "vitest";
import { Profile } from "./profile.js";
import { Sex } from "./sex.js";
import { Kilogram, Year, MlPerHour } from "../shared/units.js";

const p = (w: number, age: number, sex: Sex) =>
  Profile.create(Kilogram.unsafe(w), Year.unsafe(age), sex);

describe("Profile", () => {
  it("60kg 30歳 男性: 1日 ≈ 2100mL, 1h ≈ 600mL", () => {
    const profile = p(60, 30, Sex.Male);
    expect(Profile.recommendedDailyIntake(profile)).toBe(2100);
    expect(Profile.maxHourlyRate(profile)).toBe(600);
  });

  it("女性は ×0.95", () => {
    const f = p(60, 30, Sex.Female);
    expect(Profile.recommendedDailyIntake(f)).toBe(Math.round(60 * 35 * 0.95));
  });

  it("65歳以上は ×0.9", () => {
    const old = p(60, 70, Sex.Other);
    expect(Profile.recommendedDailyIntake(old)).toBe(Math.round(60 * 35 * 0.9));
  });

  it("1h 上限は [400, 800] にクランプ", () => {
    expect(Profile.maxHourlyRate(p(30, 30, Sex.Male))).toBe(400);
    expect(Profile.maxHourlyRate(p(100, 30, Sex.Male))).toBe(800);
  });

  it("custom override が優先", () => {
    const custom = Profile.create(
      Kilogram.unsafe(60),
      Year.unsafe(30),
      Sex.Male,
      MlPerHour.unsafe(550),
    );
    expect(Profile.maxHourlyRate(custom)).toBe(550);
  });
});
