# Gulp Coach

「今あと何mL (何ごく) 飲める? あと何分待つ?」を Profile + 直近摂取量から教えてくれる、完全ローカル動作の水分摂取コーチ。

公開: https://o6lvl4.github.io/gulp-coach/

## 主機能

- **Profile**: 体重・年齢・性別から1日推奨量と1時間吸収上限を算出
- **STATUS**: 「あと **350 mL** OK」または「あと **18分** WAIT」を一目で
- **Quick log**: 100/200/300/500 mL のクイックボタン + 任意量入力
- **Daily progress**: 当日累計と目標進捗バー
- **Recent log**: 直近5件の摂取履歴と UNDO
- **完全ローカル**: localStorage のみで動作、サーバ不要

## 算出ロジック

| 項目 | 計算 |
|---|---|
| 1日推奨量 | 体重 × 35 mL/kg/day × 性別補正 (女性 ×0.95) × 年齢補正 (65歳以上 ×0.9 / 14歳以下 ×0.8) |
| 1時間上限 | 体重 × 10 mL/h を [400, 800] にクランプ (Profile で上書き可) |
| 1回上限 | 400 mL (胃排出能力の保守値) |
| 「飲める」判定 | `availableNow = max(0, MaxRate - sumLast60min)` を `sessionMax` と min。`100 mL` 以上なら OK |
| 待機時間 | 直近1h窓の最古エベントが「100mL以上を空ける時刻」まで待つ |

## ドメイン用語集

| 概念 | 内容 |
|---|---|
| **Profile** | 体重・年齢・性別 (+ 任意の rate 上書き) からなる Entity |
| **IntakeEvent** | id + 時刻 + 量 (mL) の Value Object |
| **IntakeLog** | IntakeEvent の集約。期間合計・最古抽出を提供 |
| **HydrationStatus** | 現時刻の評価結果。`advice = { kind: "ok"; canDrinkUpTo } | { kind: "wait"; until; waitMinutes }` の判別共用体 |
| **HydrationPolicy** | sessionMax と minimumMeaningful を持つ閾値 VO |

## アーキテクチャ

[`environment-health-viewer`](https://github.com/O6lvl4/environment-health-viewer) と同じ Hexagonal 構成:

```
src/
  domain/        純粋ドメイン (fetch/DOM ゼロ)
    shared/      Brand, Result, units, Specification, clock
    profile/     Profile, Sex
    intake/      IntakeEvent, IntakeLog
    hydration/   HydrationStatus, HydrationPolicy
  application/   ports.ts (IntakeRepository / ProfileRepository / Clock / IdGenerator) + use-cases.ts
  infrastructure/ localStorage 実装
  presentation/  DOM 描画
  main.ts        Composition Root
```

依存ルールは `dependency-cruiser` で **CI 強制**。違反コミットはマージできない。

## 開発

```sh
npm install
npm run dev          # localhost:5173
npm run build
npm test             # vitest
npm run lint:arch    # 層境界チェック
```

## 免責

表示は推定値であり医学的助言ではありません。過剰摂取・過小摂取いずれも体調を崩す可能性があります。基礎疾患・運動・気候によっても適切量は変わります。
