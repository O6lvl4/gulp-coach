import { describe, it, expect } from "vitest";
import { Beverage, beverageMeta, caffeineMgFor, isCaffeinated, allBeverages } from "./beverage.js";
import { Milliliter } from "../shared/units.js";

describe("Beverage", () => {
  it("メタ取得", () => {
    expect(beverageMeta(Beverage.Coffee).label).toBe("コーヒー");
    expect(beverageMeta(Beverage.Water).caffeineMgPerMl).toBe(0);
  });

  it("allBeverages は5種返す", () => {
    expect(allBeverages()).toHaveLength(5);
  });

  it("caffeineMgFor 計算", () => {
    expect(caffeineMgFor(Beverage.Coffee, Milliliter.unsafe(200))).toBe(80);
    expect(caffeineMgFor(Beverage.Water, Milliliter.unsafe(500))).toBe(0);
    expect(caffeineMgFor(Beverage.GreenTea, Milliliter.unsafe(250))).toBe(30);
  });

  it("isCaffeinated 判定", () => {
    expect(isCaffeinated(Beverage.Coffee)).toBe(true);
    expect(isCaffeinated(Beverage.Water)).toBe(false);
    expect(isCaffeinated(Beverage.Other)).toBe(false);
  });
});
