const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const AWS = require('aws-sdk');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

// S3クライアントの初期化
const s3 = new AWS.S3();

exports.handler = async event => {
  console.log('Event:', JSON.stringify(event, null, 2));

  let browser = null;

  try {
    // Puppeteerの設定
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // ユーザーエージェントを設定
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('ページにアクセス中...');

    // さわやかの店舗一覧ページにアクセス
    await page.goto('https://www.genkotsu-hb.com/shop/#shop_list', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('ページ読み込み完了');

    // JavaScriptの実行を待つ（待ち時間データの読み込みを待機）
    await page.waitForTimeout(5000);

    // 店舗情報を取得
    const shopData = await page.evaluate(() => {
      const shops = [];

      // 店舗情報の要素を取得
      const shopElements = document.querySelectorAll('.shop_info');

      shopElements.forEach((shopElement, index) => {
        try {
          // 店舗名を取得
          const shopNameElement = shopElement.querySelector('.shop_name');
          const shopName = shopNameElement
            ? shopNameElement.textContent.trim()
            : '店舗名不明';

          // 待ち時間を取得
          const waitTimeElement = shopElement.querySelector(
            '.wait_time .time .num'
          );
          const waitTime = waitTimeElement
            ? waitTimeElement.textContent.trim()
            : '--';

          // 待ち組数を取得
          const waitCountElement = shopElement.querySelector(
            '.wait_time .set .num'
          );
          const waitCount = waitCountElement
            ? waitCountElement.textContent.trim()
            : '--';

          // すべての店舗情報を取得
          shops.push({
            shopName: shopName,
            waitTime: waitTime,
            waitCount: waitCount,
          });
        } catch (error) {
          console.error('店舗情報の取得中にエラー:', error);
        }
      });

      return shops;
    });

    console.log('取得した店舗データ:', JSON.stringify(shopData, null, 2));

    // CSVファイルの作成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFileName = `sawayaka-shops-${timestamp}.csv`;
    const csvFilePath = `/tmp/${csvFileName}`;

    // CSVライターの設定
    const csvWriter = createCsvWriter({
      path: csvFilePath,
      header: [
        { id: 'shopName', title: '店舗名' },
        { id: 'waitTime', title: '待ち時間' },
        { id: 'waitCount', title: '待ち組数' },
        { id: 'timestamp', title: '取得日時' }
      ]
    });

    // タイムスタンプを追加
    const csvData = shopData.map(shop => ({
      ...shop,
      timestamp: new Date().toISOString()
    }));

    // CSVファイルに書き込み
    await csvWriter.writeRecords(csvData);
    console.log(`CSVファイルが作成されました: ${csvFilePath}`);

    // S3にアップロード
    const s3BucketName = process.env.S3_BUCKET_NAME || 'sawayaka-scraper-data';
    const s3Key = `shop-data/${csvFileName}`;

    const fileContent = fs.readFileSync(csvFilePath);
    await s3.upload({
      Bucket: s3BucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'text/csv',
      Metadata: {
        'shop-count': shopData.length.toString(),
        'scraped-at': new Date().toISOString()
      }
    }).promise();

    console.log(`CSVファイルがS3にアップロードされました: s3://${s3BucketName}/${s3Key}`);

    // 一時ファイルを削除
    fs.unlinkSync(csvFilePath);

    // 結果を返す
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'さわやか店舗情報の取得とCSV書き出しが完了しました',
        timestamp: new Date().toISOString(),
        shopCount: shopData.length,
        shops: shopData,
        csvFile: {
          fileName: csvFileName,
          s3Location: `s3://${s3BucketName}/${s3Key}`,
          downloadUrl: `https://${s3BucketName}.s3.amazonaws.com/${s3Key}`
        }
      }),
    };
  } catch (error) {
    console.error('エラーが発生しました:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'エラーが発生しました',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  } finally {
    if (browser) {
      await browser.close();
      console.log('ブラウザを閉じました');
    }
  }
};
