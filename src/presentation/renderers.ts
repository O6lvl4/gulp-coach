/**
 * 状態 → DOM の純粋(に近い) 描画関数群。
 */
import type { DomRefs } from "./dom-refs.js";
import type { DashboardSnapshot } from "../application/use-cases.js";
import type { HydrationStatus } from "../domain/hydration/status.js";
import type { Profile } from "../domain/profile/profile.js";
import { sexLabel } from "../domain/profile/sex.js";
import { Gulp, Milliliter } from "../domain/shared/units.js";
import type { IntakeEventId } from "../domain/intake/intake-event.js";
import { escapeHtml, formatHm, pad2 } from "./format.js";

const QUICK_AMOUNTS_ML = [100, 200, 300, 500] as const;
const QUICK_AMOUNTS_GULP = [1, 5, 10, 15] as const;

export type LogActions = {
  onTime: (id: IntakeEventId, hhmm: string) => void;
  onDelete: (id: IntakeEventId) => void;
};

export const renderStatusLine = (refs: DomRefs, profile: Profile | null): void => {
  if (!profile) {
    refs.statusLine.textContent = "[ NO PROFILE — タップして設定 ]";
    return;
  }
  refs.statusLine.textContent = `[ ${profile.weight}kg · ${sexLabel(profile.sex)} · ${profile.age}歳 ]`;
};

const buildButton = (label: string, sub: string, onClick: () => void): HTMLButtonElement => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "h-14 rounded-[4px] border border-water/40 bg-water/5 text-water font-mono font-bold tracking-[0.05em] hover:bg-water/15 active:bg-water/25 transition-colors tabular-nums flex flex-col items-center justify-center gap-[1px]";
  btn.innerHTML = `
    <span class="text-base leading-none">${escapeHtml(label)}</span>
    <span class="text-[10px] text-text-mute font-normal">${escapeHtml(sub)}</span>
  `;
  btn.addEventListener("click", onClick);
  return btn;
};

export const renderQuickButtons = (
  refs: DomRefs,
  onTap: (mL: number) => void,
): void => {
  refs.quickButtonsMl.innerHTML = "";
  for (const amount of QUICK_AMOUNTS_ML) {
    const ml = Milliliter.unsafe(amount);
    const gulps = Gulp.fromMl(ml);
    refs.quickButtonsMl.appendChild(
      buildButton(`+${amount}`, `${gulps}ごく`, () => onTap(amount)),
    );
  }
  refs.quickButtonsGulp.innerHTML = "";
  for (const g of QUICK_AMOUNTS_GULP) {
    const ml = Gulp.toMl(Gulp.unsafe(g));
    refs.quickButtonsGulp.appendChild(
      buildButton(`+${g}ごく`, `${ml}mL`, () => onTap(ml)),
    );
  }
};

export const renderDashboard = (
  refs: DomRefs,
  snap: DashboardSnapshot,
  actions: LogActions,
): void => {
  refs.status.hidden = false;
  refs.quick.hidden = false;
  refs.daily.hidden = false;
  refs.log.hidden = false;

  renderStatus(refs, snap.status);
  renderDaily(refs, snap.status);
  renderLog(refs, snap, actions);
};

const renderStatus = (refs: DomRefs, s: HydrationStatus): void => {
  refs.statusRate.textContent = `MAX ${s.maxHourlyRate} mL/h`;

  if (s.advice.kind === "ok") {
    const gulps = Gulp.fromMl(s.advice.canDrinkUpTo);
    refs.statusHeadline.textContent = "AVAILABLE";
    refs.statusHeadline.className = "text-[10px] tracking-[0.3em] text-ok mb-1";
    refs.statusValue.textContent = `${s.advice.canDrinkUpTo} mL`;
    refs.statusValue.className =
      "font-mono text-5xl font-semibold text-ok leading-tight tabular-nums";
    refs.statusSub.textContent = `≈ ${gulps}ごく / 直近1h: ${s.consumedLastHour}mL · 上限 ${s.maxHourlyRate}mL`;
  } else {
    const gulps = Gulp.fromMl(s.consumedLastHour);
    refs.statusHeadline.textContent = "WAIT";
    refs.statusHeadline.className = "text-[10px] tracking-[0.3em] text-warn mb-1";
    refs.statusValue.textContent = `あと ${s.advice.waitMinutes} 分`;
    refs.statusValue.className =
      "font-mono text-5xl font-semibold text-warn leading-tight tabular-nums";
    refs.statusSub.textContent = `${formatHm(s.advice.until)} まで控えめに (直近1h: ${s.consumedLastHour}mL ≈ ${gulps}ごく)`;
  }
};

const renderDaily = (refs: DomRefs, s: HydrationStatus): void => {
  const pct = Math.min(100, Math.round(s.dailyProgressRatio * 100));
  refs.dailyPct.textContent = `${pct}%`;
  refs.dailyCurrent.textContent = `${s.consumedToday} mL`;
  refs.dailyTarget.textContent = `/ ${s.dailyTarget} mL`;
  refs.dailyBar.style.width = `${pct}%`;
};

const renderLog = (
  refs: DomRefs,
  snap: DashboardSnapshot,
  actions: LogActions,
): void => {
  refs.logList.innerHTML = "";
  const recent = snap.log.events.slice().reverse().slice(0, 8);
  if (recent.length === 0) {
    const li = document.createElement("li");
    li.className = "px-3 py-3 text-text-mute text-[12.5px]";
    li.textContent = "まだ記録がありません";
    refs.logList.appendChild(li);
    return;
  }
  for (const e of recent) {
    const gulps = Gulp.fromMl(e.volume);
    const li = document.createElement("li");
    li.className =
      "grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 border-b border-line last:border-b-0 text-[13px] tabular-nums";
    li.innerHTML = `
      <input type="time" value="${pad2(e.at.getHours())}:${pad2(e.at.getMinutes())}"
        class="bg-panel-2 border border-line-strong rounded-[3px] px-2 h-9 text-text-dim font-mono text-[12px] focus:border-water outline-none" />
      <span class="text-water font-mono font-semibold">+${e.volume} mL <span class="text-text-mute font-normal">≈ ${gulps}ごく</span></span>
      <button type="button" class="del-btn h-9 w-9 rounded-[3px] border border-line-strong text-text-mute hover:border-bad hover:text-bad" title="削除" aria-label="削除">×</button>
    `;
    const timeInput = li.querySelector<HTMLInputElement>("input[type=time]")!;
    timeInput.addEventListener("change", () => {
      if (timeInput.value) actions.onTime(e.id, timeInput.value);
    });
    li.querySelector<HTMLButtonElement>(".del-btn")!.addEventListener("click", () => {
      actions.onDelete(e.id);
    });
    refs.logList.appendChild(li);
  }
};

export const showProfileForm = (refs: DomRefs, profile: Profile | null): void => {
  refs.profileForm.hidden = false;
  refs.fWeight.value = profile ? String(profile.weight) : "";
  refs.fAge.value = profile ? String(profile.age) : "";
  refs.fSex.value = profile?.sex ?? "male";
};

export const hideProfileForm = (refs: DomRefs): void => {
  refs.profileForm.hidden = true;
};
