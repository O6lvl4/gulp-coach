import { describe, it, expect } from "vitest";
import { Profile } from "./profile.js";
import { Sex } from "./sex.js";
import { Kilogram, Year, MlPerMin } from "../shared/units.js";

const p = (w: number, age: number, sex: Sex) =>
  Profile.create(Kilogram.unsafe(w), Year.unsafe(age), sex);

describe("Profile", () => {
  it("60kg 30歳 男性: 1日 ≈ 2100mL, 排出速度 ≈ 9 mL/min", () => {
    const profile = p(60, 30, Sex.Male);
    expect(Profile.recommendedDailyIntake(profile)).toBe(2100);
    expect(Profile.emptyingRate(profile)).toBe(9);
  });

  it("女性は ×0.95", () => {
    const f = p(60, 30, Sex.Female);
    expect(Profile.recommendedDailyIntake(f)).toBe(Math.round(60 * 35 * 0.95));
  });

  it("65歳以上は ×0.9", () => {
    const old = p(60, 70, Sex.Other);
    expect(Profile.recommendedDailyIntake(old)).toBe(Math.round(60 * 35 * 0.9));
  });

  it("emptyingRate は [8, 14] mL/min にクランプ", () => {
    expect(Profile.emptyingRate(p(40, 30, Sex.Male))).toBe(8); // 40*0.15 = 6 → 8
    expect(Profile.emptyingRate(p(60, 30, Sex.Male))).toBe(9); // 60*0.15 = 9
    expect(Profile.emptyingRate(p(80, 30, Sex.Male))).toBe(12); // 80*0.15 = 12
    expect(Profile.emptyingRate(p(100, 30, Sex.Male))).toBe(14); // 100*0.15 = 15 → 14
  });

  it("custom override が優先", () => {
    const custom = Profile.create(
      Kilogram.unsafe(60),
      Year.unsafe(30),
      Sex.Male,
      MlPerMin.unsafe(11),
    );
    expect(Profile.emptyingRate(custom)).toBe(11);
  });
});
