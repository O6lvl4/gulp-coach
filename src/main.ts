/**
 * Composition Root: Ports → Adapters の組み立てと UI イベント結線。
 */
import "./style.css";
import { collectDomRefs } from "./presentation/dom-refs.js";
import {
  hideProfileForm,
  renderDashboard,
  renderQuickButtons,
  renderStatusLine,
  showProfileForm,
} from "./presentation/renderers.js";
import { createLocalStorageIntakeRepository } from "./infrastructure/local-storage-intake.js";
import { createLocalStorageProfileRepository } from "./infrastructure/local-storage-profile.js";
import {
  loadDashboard,
  logIntake,
  saveProfile,
  undoLast,
  type Deps,
} from "./application/use-cases.js";
import { Milliliter, Kilogram, Year } from "./domain/shared/units.js";
import { isOk } from "./domain/shared/result.js";
import { Profile } from "./domain/profile/profile.js";
import { Sex } from "./domain/profile/sex.js";

const deps: Deps = {
  intake: createLocalStorageIntakeRepository(),
  profile: createLocalStorageProfileRepository(),
  clock: () => new Date(),
  idGen: () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
};

const refs = collectDomRefs();

const refresh = async (): Promise<void> => {
  const snap = await loadDashboard(deps);
  if (!snap) {
    renderStatusLine(refs, null);
    showProfileForm(refs, null);
    return;
  }
  renderStatusLine(refs, snap.profile);
  renderDashboard(refs, snap);
};

const handleIntake = async (mL: number): Promise<void> => {
  const v = Milliliter.of(mL);
  if (!isOk(v)) return;
  await logIntake(deps, v.value);
  await refresh();
};

renderQuickButtons(refs, (mL) => void handleIntake(mL));

refs.customForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const n = Number(refs.customAmount.value);
  if (!Number.isFinite(n) || n <= 0) return;
  refs.customAmount.value = "";
  void handleIntake(n);
});

refs.undoBtn.addEventListener("click", async () => {
  await undoLast(deps);
  await refresh();
});

refs.profileBtn.addEventListener("click", async () => {
  const snap = await loadDashboard(deps);
  showProfileForm(refs, snap?.profile ?? null);
});

refs.profileCancel.addEventListener("click", () => {
  hideProfileForm(refs);
  void refresh();
});

refs.profileFormInner.addEventListener("submit", async (e) => {
  e.preventDefault();
  const w = Kilogram.of(Number(refs.fWeight.value));
  const a = Year.of(Number(refs.fAge.value));
  if (!isOk(w) || !isOk(a)) return;
  const sex = refs.fSex.value as Sex;
  await saveProfile(deps, Profile.create(w.value, a.value, sex));
  hideProfileForm(refs);
  await refresh();
});

void refresh();

// 1分ごとに再描画 (待機中カウントダウン用)
setInterval(() => void refresh(), 60_000);
