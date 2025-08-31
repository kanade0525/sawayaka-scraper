const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

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

          // 最初の5件のみ取得（テスト用）
          if (index < 5) {
            shops.push({
              shopName: shopName,
              waitTime: waitTime,
              waitCount: waitCount,
            });
          }
        } catch (error) {
          console.error('店舗情報の取得中にエラー:', error);
        }
      });

      return shops;
    });

    console.log('取得した店舗データ:', JSON.stringify(shopData, null, 2));

    // 結果を返す
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'さわやか店舗情報の取得が完了しました',
        timestamp: new Date().toISOString(),
        shopCount: shopData.length,
        shops: shopData,
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
