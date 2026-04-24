import { describe, it, expect } from "vitest";
import { Gulp, Milliliter, ML_PER_GULP } from "./units.js";
import { isOk, isErr } from "./result.js";

describe("Gulp", () => {
  it("toMl: ごく数 → mL", () => {
    expect(Gulp.toMl(Gulp.unsafe(0))).toBe(0);
    expect(Gulp.toMl(Gulp.unsafe(1))).toBe(ML_PER_GULP);
    expect(Gulp.toMl(Gulp.unsafe(5))).toBe(150);
    expect(Gulp.toMl(Gulp.unsafe(10))).toBe(300);
  });

  it("fromMl: mL → ごく数 (四捨五入)", () => {
    expect(Gulp.fromMl(Milliliter.unsafe(0))).toBe(0);
    expect(Gulp.fromMl(Milliliter.unsafe(30))).toBe(1);
    expect(Gulp.fromMl(Milliliter.unsafe(45))).toBe(2);
    expect(Gulp.fromMl(Milliliter.unsafe(150))).toBe(5);
    expect(Gulp.fromMl(Milliliter.unsafe(200))).toBe(7);
  });

  it("of: 範囲検証", () => {
    expect(isOk(Gulp.of(0))).toBe(true);
    expect(isOk(Gulp.of(50))).toBe(true);
    expect(isErr(Gulp.of(-1))).toBe(true);
    expect(isErr(Gulp.of(NaN))).toBe(true);
  });
});
