/**
 * IntakeLog の localStorage アダプタ。
 * Date は ISO 文字列で永続化、復元時に Date / Branded Milliliter にマップする。
 */
import type { IntakeRepository } from "../application/ports.js";
import { IntakeLog } from "../domain/intake/intake-log.js";
import {
  IntakeEventId,
  type IntakeEvent,
} from "../domain/intake/intake-event.js";
import { Beverage } from "../domain/intake/beverage.js";
import { Milliliter } from "../domain/shared/units.js";

const KEY = "gulp-coach:intake-log:v1";
const LEGACY_KEY = "hydration-coach:intake-log:v1";

const migrateIfNeeded = (storage: Storage): void => {
  if (storage.getItem(KEY) != null) return;
  const legacy = storage.getItem(LEGACY_KEY);
  if (legacy == null) return;
  storage.setItem(KEY, legacy);
  storage.removeItem(LEGACY_KEY);
};

type StoredEvent = {
  id: string;
  at: string;
  volume: number;
  beverage?: Beverage;
};
type Stored = { events: StoredEvent[] };

export const createLocalStorageIntakeRepository = (
  storage: Storage = window.localStorage,
): IntakeRepository => ({
  async load() {
    migrateIfNeeded(storage);
    const raw = storage.getItem(KEY);
    if (!raw) return IntakeLog.empty();
    try {
      const data = JSON.parse(raw) as Stored;
      const events: IntakeEvent[] = (data.events ?? []).map((e) => ({
        id: IntakeEventId.unsafe(e.id),
        at: new Date(e.at),
        volume: Milliliter.unsafe(e.volume),
        // beverage 未指定の旧データは水とみなす
        beverage: e.beverage ?? Beverage.Water,
      }));
      return IntakeLog.create(events);
    } catch {
      return IntakeLog.empty();
    }
  },
  async save(log) {
    const data: Stored = {
      events: log.events.map((e) => ({
        id: e.id,
        at: e.at.toISOString(),
        volume: e.volume,
        beverage: e.beverage,
      })),
    };
    storage.setItem(KEY, JSON.stringify(data));
  },
});
