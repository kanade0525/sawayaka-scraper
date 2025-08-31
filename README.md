# さわやか店舗情報スクレイパー

AWS Lambdaを使用して、炭焼きレストランさわやかの店舗情報（店舗名、待ち時間、待ち組数）をスクレイピングする関数です。

## 機能

- さわやかの店舗一覧ページから店舗情報を取得
- Puppeteerを使用してJavaScriptで描画される待ち時間データを取得
- EventBridgeで定期実行（1時間ごと）
- 店舗名、待ち時間、待ち組数をJSON形式で出力

## 技術仕様

- **ランタイム**: Node.js 18.x
- **フレームワーク**: Puppeteer + Chrome AWS Lambda
- **トリガー**: EventBridge (rate(1 hour))
- **IAMロール**: arn:aws:iam::033212316171:role/service-role/sawayaka-scraper-role-iid4w5yu
- **メモリ**: 1024 MB
- **タイムアウト**: 60秒

## セットアップ

### AWS SAMを使用したデプロイ

#### 1. AWS SAM CLIのインストール

```bash
# macOS
brew install aws-sam-cli

# Linux
pip install aws-sam-cli

# Windows
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

#### 2. AWS認証情報の設定

```bash
aws configure
```

#### 3. 依存関係のインストール

```bash
npm install
```

#### 4. SAMデプロイ

```bash
chmod +x deploy-sam.sh
./deploy-sam.sh
```

## 出力例

```json
{
  "statusCode": 200,
  "body": {
    "message": "さわやか店舗情報の取得が完了しました",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "shopCount": 5,
    "shops": [
      {
        "shopName": "御殿場プレミアム・アウトレット店",
        "waitTime": "15",
        "waitCount": "3"
      },
      {
        "shopName": "御殿場インター店",
        "waitTime": "25",
        "waitCount": "5"
      }
    ]
  }
}
```

## 店舗情報の取得方法

HTMLから以下の要素を取得しています：

- **店舗名**: `.shop_name` クラス
- **待ち時間**: `.wait_time .time .num` クラス
- **待ち組数**: `.wait_time .set .num` クラス

## 注意事項

- 営業時間外は待ち時間に `--` が表示されます
- JavaScriptの読み込みを待つため、5秒の待機時間を設けています
- テスト用に最初の5件のみ取得するように制限しています
- 本格運用時は全店舗の情報を取得するように修正してください

## トラブルシューティング

### よくある問題

1. **タイムアウトエラー**: メモリを2048MBに増やしてください
2. **Chrome起動エラー**: IAMロールにLambda実行権限があることを確認してください
3. **ネットワークエラー**: VPC設定とセキュリティグループを確認してください

### SAM関連の問題

1. **SAM CLIがインストールされていない**: 上記のインストール手順を実行してください
2. **AWS認証情報エラー**: `aws configure` で認証情報を設定してください
3. **ビルドエラー**: Node.js 18.xがインストールされていることを確認してください

## 管理コマンド

### SAMを使用した管理

```bash
# 関数の確認
sam list functions

# ログの確認
sam logs -n SawayakaScraperFunction --tail

# 関数の削除
sam delete

# 設定の更新
sam deploy

# 新しい変更をビルド
sam build
```

### AWS CLIを使用した管理

```bash
# 関数の確認
aws lambda get-function --function-name sawayaka-scraper-function

# ログの確認
aws logs tail /aws/lambda/sawayaka-scraper-function --follow

# EventBridgeルールの確認
aws events list-rules --name-prefix sawayaka-scraper
```

## 現在のデプロイ状況

✅ **デプロイ完了済み**

- **Lambda関数**: `sawayaka-scraper-function`
- **EventBridgeルール**: `sawayaka-scraper-SawayakaScraperRule-*`
- **スケジュール**: 1時間ごとに自動実行
- **リージョン**: ap-northeast-1 (東京)

## ファイル構成

```
sawayaka_scraper/
├── index.js              # メインのLambda関数
├── template.yaml         # SAM用CloudFormationテンプレート
├── samconfig.toml       # SAM設定ファイル
├── deploy-sam.sh        # SAMデプロイ用スクリプト
├── package.json         # 依存関係定義
├── README.md            # このファイル
└── .gitignore           # Git管理対象外ファイル
```

## ライセンス

ISC License
