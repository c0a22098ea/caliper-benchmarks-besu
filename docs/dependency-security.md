# Node CI と依存関係の管理

## 自動実行

`.github/workflows/node-ci.yml` は main への push、main 向けの PR、毎週月曜09:00（日本時間）、手動実行に対応します。

- `.nvmrc` の Node 24 を使用し、実行時に利用可能な最新の24系を取得します。
- ルートは `npm ci --ignore-scripts` でロックファイル通りにインストールし、Besu コネクターのテストと JavaScript の構文確認を実行します。
- ルート、`tools/cud-deploy`、Fabric の Node サンプル6件をそれぞれ `npm audit` で検査します。開発用依存関係・間接依存関係も含みます。
- High / Critical があれば監査ジョブを失敗させます。通信やレジストリのエラーも失敗として扱います。
- 実行概要（Summary）に重大度別件数と更新候補の表を表示します。
- `dependencies-*` Artifact に audit.json、outdated.json、inventory.json を30日保存します。inventory はロックされた依存関係の一覧で、標準形式の SBOM ではありません。

監査はロックファイルを利用するため、監査ジョブでは依存パッケージのインストールやスクリプト実行を行いません。インストールしていないパッケージの Current は not installed と表示される場合があります。

## Dependabot

`.github/dependabot.yml` で、全 npm プロジェクトと GitHub Actions の更新を週次確認し、更新 PR を作成します。
更新は自動マージしません。メジャーアップデートには互換性の確認が必要です。
Node ランタイムのメジャー更新（例: 24 → 26）と `.nvmrc` の変更は、この設定では自動化していません。

GitHub のリポジトリ設定で Dependency graph、Dependabot alerts、Dependabot security updates も有効にしてください。
`dependabot.yml` はバージョン更新を設定するもので、セキュリティアラートの設定そのものではありません。

## 手元での診断

```bash
npm ci --ignore-scripts
npm test
npm run audit:report
node .github/scripts/dependency-report.js tools/cud-deploy
```

監査は既知の脆弱性の検出です。全ての悪意あるパッケージや未知の脆弱性の検出を保証するものではありません。
既存の Caliper / Web3 系を含め、初回監査で High / Critical を検出しています。監査が赤になる場合は Artifact で該当パッケージと修正可能バージョンを確認し、更新 PR ごとに検証してください。
`npm audit fix --force` による互換性を壊す一括更新は行っていません。

Snyk は外部アカウント・トークンを利用した追加分析が必要になったとき、Trivy はコンテナイメージや IaC の診断対象ができたときの追加候補です。

## 参考

- [Dependabot のバージョン更新設定](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates)
- [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/)
