/**
 * IntakeEvent: 「いつ何mL飲んだか」の Value Object。
 * id は削除操作のために安定識別子として保持。
 */
import type { Brand } from "../shared/brand.js";
import type { Milliliter } from "../shared/units.js";

export type IntakeEventId = Brand<string, "IntakeEventId">;
export const IntakeEventId = {
  unsafe: (s: string): IntakeEventId => s as IntakeEventId,
};

export type IntakeEvent = {
  readonly id: IntakeEventId;
  readonly at: Date;
  readonly volume: Milliliter;
};
