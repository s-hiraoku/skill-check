# SkillCheck

Agent Skills の品質を自動検証・レーティングするダッシュボード。Cursor / Claude Code 向け SKILL.md を機械的にチェックし、星評価と HTML レポートを生成します。

## 機能

- **入力**: GitHub URL または SKILL.md 本文を貼り付け
- **検証パイプライン** (5段階):
  - スキーマ検証 — frontmatter (`name`, `description`) と kebab-case 命名
  - 依存チェック — npm/pip/python/docker 等の外部依存検出
  - セキュリティスキャン — eval, ハードコード秘密, curl|bash 等
  - 実行テスト — When to Use セクション, 構造化, 例・スクリプト参照
  - 品質スコア — 出典, ライセンス, タグ, コンテンツ深度
- **ダッシュボード**: 検索・グレードフィルタ付き一覧
- **HTML レポート**: Archify 風の検証済みレポート (`/api/results/{id}/report`)

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

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/check` | スキルを検証 `{ githubUrl }` または `{ skillMarkdown }` |
| GET | `/api/results` | 全結果一覧 |
| GET | `/api/results/:id` | 個別結果 (JSON) |
| GET | `/api/results/:id/report` | HTML レポート |

## スコアリング

| チェック | 配点 |
|----------|------|
| Schema Validation | 25 |
| Dependency Check | 20 |
| Security Scan | 20 |
| Execution Test | 20 |
| Quality Score | 15 |
| **合計** | **100** |

星評価: 90%+ → ★5, 75%+ → ★4, 60%+ → ★3, 40%+ → ★2, それ以下 → ★1
