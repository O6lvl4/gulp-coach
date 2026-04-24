export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export const formatHm = (d: Date): string =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
