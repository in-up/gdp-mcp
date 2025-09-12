const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function scrapeKStartup(browser, isRecentDate, targetDates) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?page=1&pbancClssCd=PBC010', { waitUntil: 'networkidle' });

    const content = await page.content();
    const $ = cheerio.load(content);
    const results = [];

    $('#bizPbancList > ul > li').each((index, element) => {
      const isNotice = $(element).hasClass('notice');
      if (isNotice) {
        const title = $(element).find('.tit').text().trim();
        const dateSpan = $(element).find('.bottom span:nth-child(3)').text().trim();
        const date = dateSpan.replace('등록일자', '').trim();

        if (isRecentDate(date, targetDates)) {
          const onclickAttr = $(element).find('.middle a').attr('href');
          const pbancSnMatch = onclickAttr.match(/go_view\((\d+)\)/);
          if (pbancSnMatch) {
            const pbancSn = pbancSnMatch[1];
            const link = `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?pbancClssCd=PBC010&schM=view&pbancSn=${pbancSn}`;
            results.push({
              title,
              site: 'K-Startup',
              date,
              link
            });
          }
        }
      }
    });

    return results;
  } catch (error) {
    console.error('Error scraping K-Startup:', error);
    return [];
  } finally {
    await page.close();
  }
}

module.exports = { scrapeKStartup };