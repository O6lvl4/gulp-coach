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
import { Milliliter } from "../domain/shared/units.js";

const KEY = "hydration-coach:intake-log:v1";

type StoredEvent = { id: string; at: string; volume: number };
type Stored = { events: StoredEvent[] };

export const createLocalStorageIntakeRepository = (
  storage: Storage = window.localStorage,
): IntakeRepository => ({
  async load() {
    const raw = storage.getItem(KEY);
    if (!raw) return IntakeLog.empty();
    try {
      const data = JSON.parse(raw) as Stored;
      const events: IntakeEvent[] = (data.events ?? []).map((e) => ({
        id: IntakeEventId.unsafe(e.id),
        at: new Date(e.at),
        volume: Milliliter.unsafe(e.volume),
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
      })),
    };
    storage.setItem(KEY, JSON.stringify(data));
  },
});
