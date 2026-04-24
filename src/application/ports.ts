/**
 * 永続化と外界アクセスの抽象。infrastructure 層で実装する。
 */
import type { IntakeLog } from "../domain/intake/intake-log.js";
import type { Profile } from "../domain/profile/profile.js";

export type IntakeRepository = {
  load(): Promise<IntakeLog>;
  save(log: IntakeLog): Promise<void>;
};

export type ProfileRepository = {
  load(): Promise<Profile | null>;
  save(profile: Profile): Promise<void>;
};

export type Clock = () => Date;
export type IdGenerator = () => string;
