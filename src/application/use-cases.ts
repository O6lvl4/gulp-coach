/**
 * Use Cases: アプリの操作単位。
 * 各 use case は Ports を引数で受け取り、ドメイン操作を組み立てる純粋関数 (副作用は port に委譲)。
 */
import type {
  IntakeRepository,
  ProfileRepository,
  Clock,
  IdGenerator,
} from "./ports.js";
import { IntakeLog } from "../domain/intake/intake-log.js";
import {
  IntakeEventId,
  type IntakeEvent,
} from "../domain/intake/intake-event.js";
import type { Milliliter } from "../domain/shared/units.js";
import type { Profile } from "../domain/profile/profile.js";
import {
  HydrationStatus,
  type HydrationStatus as HS,
} from "../domain/hydration/status.js";

export type Deps = {
  readonly intake: IntakeRepository;
  readonly profile: ProfileRepository;
  readonly clock: Clock;
  readonly idGen: IdGenerator;
};

/** 摂取イベントを記録する */
export const logIntake = async (
  deps: Deps,
  volume: Milliliter,
): Promise<IntakeEvent> => {
  const log = await deps.intake.load();
  const event: IntakeEvent = {
    id: IntakeEventId.unsafe(deps.idGen()),
    at: deps.clock(),
    volume,
  };
  await deps.intake.save(IntakeLog.add(log, event));
  return event;
};

/** 直近のイベントを1件取り消す (押し間違い対応) */
export const undoLast = async (deps: Deps): Promise<void> => {
  const log = await deps.intake.load();
  if (log.events.length === 0) return;
  const last = log.events[log.events.length - 1];
  await deps.intake.save(IntakeLog.remove(log, last.id));
};

/** プロファイル保存 */
export const saveProfile = async (
  deps: Pick<Deps, "profile">,
  profile: Profile,
): Promise<void> => {
  await deps.profile.save(profile);
};

export type DashboardSnapshot = {
  readonly profile: Profile;
  readonly status: HS;
  readonly log: IntakeLog;
};

/** ダッシュボード全体の最新スナップショット。Profile 未設定なら null */
export const loadDashboard = async (
  deps: Omit<Deps, "idGen">,
): Promise<DashboardSnapshot | null> => {
  const profile = await deps.profile.load();
  if (!profile) return null;
  const log = await deps.intake.load();
  const now = deps.clock();
  return {
    profile,
    status: HydrationStatus.compute(log, profile, now),
    log,
  };
};
