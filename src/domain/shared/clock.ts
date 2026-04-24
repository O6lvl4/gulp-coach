/**
 * 当日 (ローカルタイムゾーン) の 0時を返す。
 */
export const startOfDay = (now: Date): Date => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
};
