/**
 * 状態 → DOM の純粋(に近い) 描画関数群。
 */
import type { DomRefs } from "./dom-refs.js";
import type { DashboardSnapshot } from "../application/use-cases.js";
import type { HydrationStatus } from "../domain/hydration/status.js";
import type { Profile } from "../domain/profile/profile.js";
import { sexLabel } from "../domain/profile/sex.js";
import { escapeHtml, formatHm } from "./format.js";

const QUICK_AMOUNTS = [100, 200, 300, 500] as const;

export const renderStatusLine = (refs: DomRefs, profile: Profile | null): void => {
  if (!profile) {
    refs.statusLine.textContent = "[ NO PROFILE — タップして設定 ]";
    return;
  }
  refs.statusLine.textContent = `[ ${profile.weight}kg · ${sexLabel(profile.sex)} · ${profile.age}歳 ]`;
};

export const renderQuickButtons = (refs: DomRefs, onTap: (mL: number) => void): void => {
  refs.quickButtons.innerHTML = "";
  for (const amount of QUICK_AMOUNTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `+${amount}`;
    btn.className =
      "h-14 rounded-[4px] border border-water/40 bg-water/5 text-water font-mono text-base font-bold tracking-[0.05em] hover:bg-water/15 active:bg-water/25 transition-colors tabular-nums";
    btn.addEventListener("click", () => onTap(amount));
    refs.quickButtons.appendChild(btn);
  }
};

export const renderDashboard = (refs: DomRefs, snap: DashboardSnapshot): void => {
  refs.status.hidden = false;
  refs.quick.hidden = false;
  refs.daily.hidden = false;
  refs.log.hidden = false;

  renderStatus(refs, snap.status);
  renderDaily(refs, snap.status);
  renderLog(refs, snap);
};

const renderStatus = (refs: DomRefs, s: HydrationStatus): void => {
  refs.statusRate.textContent = `MAX ${s.maxHourlyRate} mL/h`;

  if (s.advice.kind === "ok") {
    refs.statusHeadline.textContent = "AVAILABLE";
    refs.statusHeadline.className = "text-[10px] tracking-[0.3em] text-ok mb-1";
    refs.statusValue.textContent = `${s.advice.canDrinkUpTo} mL`;
    refs.statusValue.className =
      "font-mono text-5xl font-semibold text-ok leading-tight tabular-nums";
    refs.statusSub.textContent = `直近1h: ${s.consumedLastHour}mL / 上限 ${s.maxHourlyRate}mL`;
  } else {
    refs.statusHeadline.textContent = "WAIT";
    refs.statusHeadline.className = "text-[10px] tracking-[0.3em] text-warn mb-1";
    refs.statusValue.textContent = `あと ${s.advice.waitMinutes} 分`;
    refs.statusValue.className =
      "font-mono text-5xl font-semibold text-warn leading-tight tabular-nums";
    refs.statusSub.textContent = `${formatHm(s.advice.until)} まで控えめに (直近1h: ${s.consumedLastHour}mL)`;
  }
};

const renderDaily = (refs: DomRefs, s: HydrationStatus): void => {
  const pct = Math.min(100, Math.round(s.dailyProgressRatio * 100));
  refs.dailyPct.textContent = `${pct}%`;
  refs.dailyCurrent.textContent = `${s.consumedToday} mL`;
  refs.dailyTarget.textContent = `/ ${s.dailyTarget} mL`;
  refs.dailyBar.style.width = `${pct}%`;
};

const renderLog = (refs: DomRefs, snap: DashboardSnapshot): void => {
  refs.logList.innerHTML = "";
  const recent = snap.log.events.slice().reverse().slice(0, 5);
  if (recent.length === 0) {
    const li = document.createElement("li");
    li.className = "px-3 py-3 text-text-mute text-[12.5px]";
    li.textContent = "まだ記録がありません";
    refs.logList.appendChild(li);
    return;
  }
  for (const e of recent) {
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between px-3 py-2 border-b border-line last:border-b-0 text-[13px] tabular-nums";
    li.innerHTML = `
      <span class="text-text-dim font-mono">${escapeHtml(formatHm(e.at))}</span>
      <span class="text-water font-mono font-semibold">+${e.volume} mL</span>
    `;
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
