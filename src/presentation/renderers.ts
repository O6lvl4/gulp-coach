/**
 * 状態 → DOM の純粋(に近い) 描画関数群。
 */
import type { DomRefs } from "./dom-refs.js";
import type { DashboardSnapshot } from "../application/use-cases.js";
import type { HydrationStatus } from "../domain/hydration/status.js";
import type { CaffeineStatus, CaffeineLevel } from "../domain/caffeine/status.js";
import type { Profile } from "../domain/profile/profile.js";
import { sexLabel } from "../domain/profile/sex.js";
import { Gulp, Milliliter } from "../domain/shared/units.js";
import type { IntakeEventId } from "../domain/intake/intake-event.js";
import {
  type Beverage,
  allBeverages,
  beverageMeta,
  caffeineMgFor,
  isCaffeinated,
} from "../domain/intake/beverage.js";
import { escapeHtml, formatHm, pad2 } from "./format.js";
import { twemojiImg } from "./twemoji.js";

const QUICK_AMOUNTS_ML = [100, 200, 300, 500] as const;
const QUICK_AMOUNTS_GULP = [1, 5, 10, 15] as const;

export type LogActions = {
  onEditRequest: (id: IntakeEventId) => void;
};

export const renderStatusLine = (refs: DomRefs, profile: Profile | null): void => {
  if (!profile) {
    refs.statusLine.textContent = "[ NO PROFILE — タップして設定 ]";
    return;
  }
  refs.statusLine.textContent = `[ ${profile.weight}kg · ${sexLabel(profile.sex)} · ${profile.age}歳 ]`;
};

const buildAmountButton = (
  label: string,
  sub: string,
  onClick: () => void,
): HTMLButtonElement => {
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
      buildAmountButton(`+${amount}`, `${gulps}ごく`, () => onTap(amount)),
    );
  }
  refs.quickButtonsGulp.innerHTML = "";
  for (const g of QUICK_AMOUNTS_GULP) {
    const ml = Gulp.toMl(Gulp.unsafe(g));
    refs.quickButtonsGulp.appendChild(
      buildAmountButton(`+${g}ごく`, `${ml}mL`, () => onTap(ml)),
    );
  }
};

export const renderBeverageTabs = (
  refs: DomRefs,
  current: Beverage,
  onSelect: (b: Beverage) => void,
): void => {
  refs.beverageTabs.innerHTML = "";
  for (const b of allBeverages()) {
    const meta = beverageMeta(b);
    const selected = b === current;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = [
      "shrink-0 flex flex-col items-center gap-[1px] px-3 py-[6px] rounded-[4px] border min-w-[60px] transition-colors",
      selected
        ? "border-water bg-water/10 text-water"
        : "border-line text-text-dim hover:border-line-strong",
    ].join(" ");
    btn.innerHTML = `
      <span class="text-[18px] leading-none">${twemojiImg(meta.emoji)}</span>
      <span class="text-[10px] tracking-[0.05em]">${escapeHtml(meta.label)}</span>
    `;
    btn.addEventListener("click", () => onSelect(b));
    refs.beverageTabs.appendChild(btn);
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
  refs.caffeine.hidden = false;

  renderStatus(refs, snap.status);
  renderDaily(refs, snap.status);
  renderCaffeine(refs, snap.caffeine);
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

const CAFFEINE_BAR_COLOR: Record<CaffeineLevel, string> = {
  ok: "var(--color-water-dim)",
  moderate: "var(--color-water)",
  warn: "var(--color-warn)",
  over: "var(--color-bad)",
};

const CAFFEINE_META_LABEL: Record<CaffeineLevel, string> = {
  ok: "OK",
  moderate: "MODERATE",
  warn: "WARN",
  over: "OVER LIMIT",
};

const renderCaffeine = (refs: DomRefs, c: CaffeineStatus): void => {
  refs.cafCurrent.textContent = `${c.totalTodayMg} mg`;
  refs.cafLimit.textContent = `/ ${c.dailyLimitMg} mg`;
  refs.cafBar.style.width = `${Math.min(100, Math.round(c.progressRatio * 100))}%`;
  refs.cafBar.style.background = CAFFEINE_BAR_COLOR[c.level];
  refs.cafMeta.textContent = CAFFEINE_META_LABEL[c.level];

  if (c.lastIntakeAt) {
    const suffix = c.level === "over" ? " (超過)" : "";
    refs.cafLast.textContent = `最終摂取 ${formatHm(c.lastIntakeAt)} · 残り ${c.remainingMg}mg${suffix}`;
  } else {
    refs.cafLast.textContent = "本日のカフェイン摂取なし";
  }
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
    const meta = beverageMeta(e.beverage);
    const gulps = Gulp.fromMl(e.volume);
    const caf = caffeineMgFor(e.beverage, e.volume);
    const cafText = isCaffeinated(e.beverage) ? ` · ${caf}mg` : "";
    const li = document.createElement("li");
    li.className = "border-b border-line last:border-b-0";
    li.innerHTML = `
      <button type="button" class="row-btn w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 text-left hover:bg-panel-2 active:bg-panel-2 transition-colors">
        <span class="font-mono text-text-dim text-[12px] tabular-nums flex items-center gap-1">
          <span class="text-[13px] leading-none">${twemojiImg("🕐")}</span>
          ${pad2(e.at.getHours())}:${pad2(e.at.getMinutes())}
        </span>
        <span class="font-mono font-semibold flex items-center gap-2 flex-wrap text-[13px] tabular-nums">
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-water/15 border border-water/30 text-[18px] leading-none shrink-0">${twemojiImg(meta.emoji)}</span>
          <span class="text-water">+${e.volume} mL</span>
          <span class="text-text-mute font-normal">≈ ${gulps}ごく${cafText}</span>
        </span>
        <span class="text-text-mute text-[16px] leading-none">›</span>
      </button>
    `;
    li.querySelector<HTMLButtonElement>(".row-btn")!.addEventListener("click", () => {
      actions.onEditRequest(e.id);
    });
    refs.logList.appendChild(li);
  }
};

// ─── Edit Modal ──────────────────────────────────

export type EditCallbacks = {
  onSave: (patch: { at?: Date; volumeMl?: number; beverage?: Beverage }) => void;
  onDelete: () => void;
  onClose: () => void;
};

const RELATIVE_OFFSETS_MIN = [0, 15, 30, 60, 120] as const;
const RELATIVE_LABEL = (m: number): string => (m === 0 ? "今" : `${m < 60 ? `${m}m` : `${m / 60}h`}前`);

export const showEditModal = (
  refs: DomRefs,
  event: { id: IntakeEventId; at: Date; volume: number; beverage: Beverage },
  now: Date,
  callbacks: EditCallbacks,
): void => {
  refs.editOverlay.hidden = false;
  refs.eHour.value = String(event.at.getHours());
  refs.eMinute.value = pad2(event.at.getMinutes());
  refs.eVolume.value = String(event.volume);

  // ─── 相対時刻ボタン ─────
  refs.eRelButtons.innerHTML = "";
  for (const m of RELATIVE_OFFSETS_MIN) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "h-10 rounded-[4px] border border-line text-text-dim font-mono text-[12px] hover:border-water hover:text-water active:bg-water/10 transition-colors";
    btn.textContent = RELATIVE_LABEL(m);
    btn.addEventListener("click", () => {
      const t = new Date(now.getTime() - m * 60_000);
      refs.eHour.value = String(t.getHours());
      refs.eMinute.value = pad2(t.getMinutes());
    });
    refs.eRelButtons.appendChild(btn);
  }

  let currentBeverage = event.beverage;
  const drawBevTabs = () => {
    refs.eBeverageTabs.innerHTML = "";
    for (const b of allBeverages()) {
      const meta = beverageMeta(b);
      const selected = b === currentBeverage;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = [
        "shrink-0 flex flex-col items-center gap-[1px] px-3 py-2 rounded-[4px] border min-w-[62px] transition-colors",
        selected
          ? "border-water bg-water/10 text-water"
          : "border-line text-text-dim hover:border-line-strong",
      ].join(" ");
      btn.innerHTML = `
        <span class="text-[18px] leading-none">${twemojiImg(meta.emoji)}</span>
        <span class="text-[10px] tracking-[0.05em]">${escapeHtml(meta.label)}</span>
      `;
      btn.addEventListener("click", () => {
        currentBeverage = b;
        drawBevTabs();
      });
      refs.eBeverageTabs.appendChild(btn);
    }
  };
  drawBevTabs();

  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    const h = Number(refs.eHour.value);
    const m = Number(refs.eMinute.value);
    const at = new Date(event.at);
    if (Number.isFinite(h) && Number.isFinite(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
      at.setHours(h, m, 0, 0);
    }
    const vol = Number(refs.eVolume.value);
    callbacks.onSave({
      at,
      volumeMl: Number.isFinite(vol) && vol > 0 ? vol : undefined,
      beverage: currentBeverage,
    });
    cleanup();
  };
  const onDeleteClick = () => {
    callbacks.onDelete();
    cleanup();
  };
  const onCloseClick = () => {
    callbacks.onClose();
    cleanup();
  };
  const onOverlayClick = (e: MouseEvent) => {
    if (e.target === refs.editOverlay) onCloseClick();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onCloseClick();
  };
  const cleanup = () => {
    refs.editOverlay.hidden = true;
    refs.editForm.removeEventListener("submit", onSubmit);
    refs.eDelete.removeEventListener("click", onDeleteClick);
    refs.editClose.removeEventListener("click", onCloseClick);
    refs.editOverlay.removeEventListener("click", onOverlayClick);
    document.removeEventListener("keydown", onKey);
  };
  refs.editForm.addEventListener("submit", onSubmit);
  refs.eDelete.addEventListener("click", onDeleteClick);
  refs.editClose.addEventListener("click", onCloseClick);
  refs.editOverlay.addEventListener("click", onOverlayClick);
  document.addEventListener("keydown", onKey);
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
