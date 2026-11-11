# Hyperledger Besuネットワーク
[Caliper](https://github.com/hyperledger/caliper/) の前提条件を満たしていることを確認してください。

## ベンチマーク環境構築
Hyperledger Besuネットワークで caliper-benchmark を実行するための最小手順です。

1. Caliper CLIをインストール
```bash
npm install --only=prod @hyperledger/caliper-cli
```

2. CaliperをBesuにバインド
```bash
npx caliper bind --caliper-bind-sut besu:latest
```

3. ネットワーク設定を作成
- ひな形: `networks/besu/4node/networkconfig.template.json`
- 実運用用: `networks/besu/4node/networkconfig.json`

以下の値をあなたのBesu環境に合わせて設定してください。
- `ethereum.url` (例: `http://<host>:8545` または `ws://<host>:8546`)
- `ethereum.chainId` (この環境では `2018`)
- `ethereum.allowHttpRpc` (`http` を使う場合は `true`)
- `ethereum.contractDeployerAddress`
- `ethereum.contractDeployerAddressPrivateKey`
- 各 `ethereum.contracts.<name>.address`

## ベンチマーク実行例

### Middleware の配置と動作確認

Node.js 24 を使用します。リポジトリ直下で `nvm use` を実行すると `.nvmrc` のバージョンが選ばれます。

Caliper 0.6.0 の標準 Ethereum コネクタは HTTP RPC を拒否するため、
この環境では `caliper.blockchain` に `./tools/caliper/besu-connector.js` を指定します。
HTTP の場合は `ethereum.allowHttpRpc: true` とローカル署名用の秘密鍵またはシードが必要です。
HTTP の書き込みは各ワーカーで前のトランザクションの確定を待って送信します。
そのため、この設定の測定値には直列送信の制約が含まれます。
同じ送信元アドレスを使う場合、ワーカー数は1にしてください。
WebSocket を指定した場合は標準コネクタの送信処理を使用します。

Middleware専用の配置処理は以下です。

```bash
node tools/cud-deploy/deploy-middleware.js
node tools/cud-deploy/test-middleware.js
```

配置処理は `src/besu/Middleware.json` のコンパイル済み成果物を使用し、
chainId・署名者・配置後の実コードを検証してからネットワーク設定の
`ethereum.contracts.Middleware.address` と `abi` を更新します。
実行するたびに新しいコントラクトを配置するため、配置済みならテストだけ実行してください。
Solidityを変更した場合は、先にコンパイルして成果物を更新してください。
別の成果物を使用する場合は `MIDDLEWARE_ARTIFACT` にパスを指定できます。
`tools/cud-deploy/deploy.js` は別の CreateUpdateDeleteNFT 用です。

動作確認はケース01〜09をすべて実行し、ケース04〜09の直前に事前作成ラウンドを実行します。
既定値は各ラウンド10件・2 TPSです。各ラウンド100件・10 TPSで実行する場合:

```bash
TX_NUMBER=100 TPS=10 node tools/cud-deploy/test-middleware.js
```

トークンIDを実行時に生成し、ログ・HTMLレポート・遮断件数を一時ディレクトリへ保存します。
出力先は実行時に表示され、終了時に全シナリオの結果表を表示します。
失敗0件と、ケース01・04・05・07・08・09の遮断件数を自動検証します。
ケース02・03・06の後続操作はキューで順に実行するため、遮断件数は0です。
Caliperは実際の送信を計測するため、2操作を送るケースのSuccは指定件数を超えることがあります。

以下の通常ベンチマーク設定では作成と削除を各100件に揃えています。
再実行時は先頭ラウンドの `workload.arguments.tokenId` を未使用の範囲へ変更してください。

- middleware シナリオ（主用途）
```bash
npx caliper launch manager \
  --caliper-benchconfig benchmarks/scenario/middleware/config.yaml \
  --caliper-networkconfig networks/besu/4node/networkconfig.json \
  --caliper-workspace . \
  --caliper-flow-skip-install
```

- update シナリオ
```bash
npx caliper launch manager \
  --caliper-benchconfig benchmarks/scenario/update/config.yaml \
  --caliper-networkconfig networks/besu/4node/networkconfig.json \
  --caliper-workspace . \
  --caliper-flow-skip-install
```

- updateTransaction シナリオ
```bash
npx caliper launch manager \
  --caliper-benchconfig benchmarks/scenario/updateTransaction/config.yaml \
  --caliper-networkconfig networks/besu/4node/networkconfig.json \
  --caliper-workspace . \
  --caliper-flow-skip-install
```

- nft-create-update-delete シナリオ
```bash
npx caliper launch manager \
  --caliper-benchconfig benchmarks/scenario/nft-create-update-delete/config.yaml \
  --caliper-networkconfig networks/besu/4node/networkconfig.json \
  --caliper-workspace . \
  --caliper-flow-skip-install
```

## 補足
- `tools/cud-deploy/deploy.js` は `networks/besu/4node/networkconfig.json` を既定で参照します。
- RPC URL は WebSocket と HTTP のどちらにも対応しています。
- middleware シナリオは `ethereum.contracts.Middleware` エントリの `address` と `abi` を参照します。
- `CALIPER_CONTRACT_KEY` を設定すると、デプロイ後に更新するコントラクトキーを切り替えできます。
  - 既定値: `databaseTransaction`
  - 例: `CALIPER_CONTRACT_KEY=update`

`databaseTransaction` キーを更新したい場合の実行例:
```bash
cd tools/cud-deploy
CALIPER_CONTRACT_KEY=databaseTransaction NETWORKCONFIG_PATH=networks/besu/4node/networkconfig.json node deploy.js
```
