/**
 * Profile の localStorage アダプタ。
 * 旧形式 (customMaxHourlyRate, mL/h) は customEmptyingRate (mL/min) に変換する。
 */
import type { ProfileRepository } from "../application/ports.js";
import { Profile } from "../domain/profile/profile.js";
import { Sex } from "../domain/profile/sex.js";
import { Kilogram, Year, MlPerMin } from "../domain/shared/units.js";

const KEY = "gulp-coach:profile:v1";
const LEGACY_KEY = "hydration-coach:profile:v1";

const migrateIfNeeded = (storage: Storage): void => {
  if (storage.getItem(KEY) != null) return;
  const legacy = storage.getItem(LEGACY_KEY);
  if (legacy == null) return;
  storage.setItem(KEY, legacy);
  storage.removeItem(LEGACY_KEY);
};

type Stored = {
  weight: number;
  age: number;
  sex: Sex;
  customEmptyingRate?: number; // mL/min
  /** legacy: mL/h、読み込み時に customEmptyingRate に変換 */
  customMaxHourlyRate?: number;
};

export const createLocalStorageProfileRepository = (
  storage: Storage = window.localStorage,
): ProfileRepository => ({
  async load() {
    migrateIfNeeded(storage);
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    try {
      const d = JSON.parse(raw) as Stored;
      const rate =
        d.customEmptyingRate != null
          ? MlPerMin.unsafe(d.customEmptyingRate)
          : d.customMaxHourlyRate != null
            ? MlPerMin.unsafe(Math.round((d.customMaxHourlyRate / 60) * 10) / 10)
            : undefined;
      return Profile.create(
        Kilogram.unsafe(d.weight),
        Year.unsafe(d.age),
        d.sex,
        rate,
      );
    } catch {
      return null;
    }
  },
  async save(profile) {
    const data: Stored = {
      weight: profile.weight,
      age: profile.age,
      sex: profile.sex,
      customEmptyingRate: profile.customEmptyingRate,
    };
    storage.setItem(KEY, JSON.stringify(data));
  },
});
