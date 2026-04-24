const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
};

export type DomRefs = ReturnType<typeof collectDomRefs>;

export const collectDomRefs = () => ({
  statusLine: $("status-line"),
  profileBtn: $<HTMLButtonElement>("profile-btn"),

  profileForm: $("profile-form"),
  profileFormInner: $<HTMLFormElement>("profile-form-inner"),
  profileCancel: $<HTMLButtonElement>("profile-cancel"),
  fWeight: $<HTMLInputElement>("f-weight"),
  fAge: $<HTMLInputElement>("f-age"),
  fSex: $<HTMLSelectElement>("f-sex"),

  status: $("status"),
  statusRate: $("status-rate"),
  statusHeadline: $("status-headline"),
  statusValue: $("status-value"),
  statusSub: $("status-sub"),

  quick: $("quick"),
  quickButtonsMl: $("quick-buttons-ml"),
  quickButtonsGulp: $("quick-buttons-gulp"),
  customForm: $<HTMLFormElement>("custom-form"),
  customAmount: $<HTMLInputElement>("custom-amount"),

  daily: $("daily"),
  dailyPct: $("daily-pct"),
  dailyCurrent: $("daily-current"),
  dailyTarget: $("daily-target"),
  dailyBar: $("daily-bar"),

  log: $("log"),
  logList: $<HTMLUListElement>("log-list"),
  undoBtn: $<HTMLButtonElement>("undo-btn"),
});
