#!/bin/bash

echo "🚀 AWS SAMを使用してさわやかスクレイパーをデプロイ中..."

# AWS SAM CLIがインストールされているかチェック
if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAM CLIがインストールされていません"
    echo "📦 インストール方法:"
    echo "   macOS: brew install aws-sam-cli"
    echo "   Linux: pip install aws-sam-cli"
    echo "   Windows: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# AWS認証情報の確認
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS認証情報が設定されていません"
    echo "🔑 aws configure を実行して認証情報を設定してください"
    exit 1
fi

echo "✅ AWS認証情報が確認されました"

# 依存関係のインストール
echo "📦 依存関係をインストール中..."
npm install

# SAMビルド
echo "🔨 SAMビルドを実行中..."
sam build

if [ $? -ne 0 ]; then
    echo "❌ SAMビルドが失敗しました"
    exit 1
fi

echo "✅ SAMビルドが完了しました"

# SAMデプロイ
echo "🚀 SAMデプロイを実行中..."
sam deploy --guided

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 デプロイが完了しました！"
    echo ""
    echo "📋 デプロイされたリソース:"
    echo "   - Lambda関数: sawayaka-scraper-function"
    echo "   - S3バケット: sawayaka-scraper-data-{ACCOUNT_ID}"
    echo "   - EventBridgeルール: sawayaka-scraper"
    echo ""
    echo "🔍 関数の確認方法:"
    echo "   aws lambda get-function --function-name sawayaka-scraper-function"
    echo ""
    echo "📊 ログの確認方法:"
    echo "   sam logs -n SawayakaScraperFunction --tail"
    echo ""
    echo "📁 CSVファイルの確認方法:"
    echo "   aws s3 ls s3://sawayaka-scraper-data-{ACCOUNT_ID}/shop-data/"
    echo ""
    echo "💾 機能:"
    echo "   - さわやか全店舗の待ち時間情報をスクレイピング"
    echo "   - CSVファイルとして自動生成"
    echo "   - S3バケットに自動アップロード"
    echo "   - 1時間ごとに自動実行"
else
    echo "❌ SAMデプロイが失敗しました"
    exit 1
fi
