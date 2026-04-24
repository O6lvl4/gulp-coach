/**
 * Sex: 推奨摂取量・補正係数の決定に使う。
 * "other" は中央値 (male/female の平均) で扱う。
 */
export const Sex = {
  Male: "male",
  Female: "female",
  Other: "other",
} as const;

export type Sex = (typeof Sex)[keyof typeof Sex];

export const sexLabel = (s: Sex): string => {
  switch (s) {
    case "male":
      return "男性";
    case "female":
      return "女性";
    case "other":
      return "その他";
  }
};
