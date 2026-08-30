# SkillCheck

Agent Skills の品質を自動検証・レーティングするダッシュボード。Cursor / Claude Code 向け SKILL.md を機械的にチェックし、星評価と HTML レポートを生成します。

## 機能

- **入力**: GitHub URL または SKILL.md 本文を貼り付け
- **検証パイプライン** (5段階):
  - スキーマ検証 — frontmatter (`name`, `description`) と kebab-case 命名
  - 依存チェック — npm/pip/python/docker 等の外部依存検出
  - セキュリティスキャン — eval, ハードコード秘密, curl|bash 等
  - 静的解析 — When to Use セクション, 構造化, 例・スクリプト参照（v1 は実行しない）
  - 品質スコア — 出典, ライセンス, タグ, コンテンツ深度
- **ダッシュボード**: 検索・グレードフィルタ付き一覧
- **HTML レポート**: Archify 風の検証済みレポート (`/api/results/{id}/report`)

## v1 スコープ

| 項目 | v1 | v2（予定） |
|------|----|-----------|
| 結果の永続化 | サーバはインメモリ（インスタンスローカル）+ ブラウザの localStorage。HTML は `POST /api/report/html` でステートレス生成 | データベース |
| 実行テスト | 静的解析のみ | サンドボックスでのスクリプト実行 |
| GitHub 解決 | 下記の優先順位で SKILL.md を探索（default_branch を API で解決） | 複数スキルの選択 UI |

### GitHub URL 解決順序

1. URL に `blob/.../SKILL.md` パスが含まれる場合 → そのパスを最優先
2. リポジトリ直下の `SKILL.md`
3. `skills/*/SKILL.md`（GitHub API で探索、最大2階層）
4. フォールバック: `.cursor/skills/SKILL.md`, `.agents/skills/SKILL.md`

## 参考リポジトリ

検証ロジックは以下の既存パターンに基づいています:

- [anthropics/skills](https://github.com/anthropics/skills) — `quick_validate.py` の frontmatter スキーマ
- [agent-skills-hub/agent-skills-hub](https://github.com/agent-skills-hub/agent-skills-hub) — `validate_skills.py` の When to Use / risk チェック
- [tt-a1i/archify](https://github.com/tt-a1i/archify) — HTML レポート出力パターン

## 開発

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest
npm run build    # 本番ビルド
```

## Vercel デプロイ

```bash
npx vercel
```

追加設定不要。Next.js App Router の標準構成です。

> **Note (v1):** サーバ側ストアはインスタンスごとに分かれます。ダッシュボードはブラウザの localStorage に結果を保持し、HTML レポートはレポート JSON を渡すステートレス API で生成するため、マルチインスタンスでも最新結果の閲覧とレポート出力ができます。

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/check` | スキルを検証 `{ githubUrl }` または `{ skillMarkdown }` |
| GET | `/api/results` | 全結果一覧（同一インスタンスのベストエフォート） |
| GET | `/api/results/:id` | 個別結果 (JSON) |
| GET | `/api/results/:id/report` | HTML レポート（同一インスタンス） |
| POST | `/api/report/html` | HTML レポート（ステートレス、レポート JSON を body に渡す） |

## スコアリング

| チェック | 配点 |
|----------|------|
| Schema Validation | 25 |
| Dependency Check | 20 |
| Security Scan | 20 |
| Static Analysis | 20 |
| Quality Score | 15 |
| **合計** | **100** |

星評価: 90%+ → ★5, 75%+ → ★4, 60%+ → ★3, 40%+ → ★2, それ以下 → ★1

安全キャップ: Security Scan が fail のとき最大 Grade C / ★3。critical 指摘があるときは最大 Grade D / ★2。

## Cursor プロンプト（改善版）

```
SkillCheckというアプリをゼロから作って。CursorのOriginリポジトリとして、Next.jsとTypeScriptで。

目的は、CursorやClaude Code向けのAgent Skillsを自動検証して品質レーティングするダッシュボード。スキルが爆増して品質がバラバラだから、動くか・安全か・実用的かを機械的に判定して、星評価とレポートを出す。

機能はこれ。GitHub URLかSKILL.mdを入力すると、スキーマ検証、依存チェック、セキュリティスキャン、静的解析、品質スコアを自動で回す。結果をレーティング付きで一覧表示。Archifyみたいに検証済みのHTMLレポートも出せる。

GitHub URL解決: blob URLの明示パス → リポジトリ直下 SKILL.md → skills/*/SKILL.md（API探索）→ .cursor/.agents フォールバック。
永続化: v1はインメモリ（最大100件）、v2でDB。
実行テスト: v1は静的解析のみ（When to Use・構造・スクリプト参照の有無）。サンドボックス実行はv2。

参考リポジトリを読み込んで、SKILL.mdの標準フォーマットと既存の検証パターンを真似て。UIはシンプルで、検索とフィルタが効くダッシュボード。Vercelにすぐデプロイできる構成で。

第一版は、入力・検証パイプライン・結果表示まで。コードは読みやすく、テストも書いて。
```
