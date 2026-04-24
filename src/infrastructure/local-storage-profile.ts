/**
 * Profile の localStorage アダプタ。
 */
import type { ProfileRepository } from "../application/ports.js";
import { Profile } from "../domain/profile/profile.js";
import { Sex } from "../domain/profile/sex.js";
import { Kilogram, Year, MlPerHour } from "../domain/shared/units.js";

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
      return Profile.create(
        Kilogram.unsafe(d.weight),
        Year.unsafe(d.age),
        d.sex,
        d.customMaxHourlyRate != null
          ? MlPerHour.unsafe(d.customMaxHourlyRate)
          : undefined,
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
      customMaxHourlyRate: profile.customMaxHourlyRate,
    };
    storage.setItem(KEY, JSON.stringify(data));
  },
});
