
async function scrapeBizinfo(browser, isRecentDate, targetDates) {
  console.log('Scraping Bizinfo...');
  let allRecentAnnouncements = [];
  const page = await browser.newPage();

  try {
    const initialUrl = 'https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do?page=1';
    await page.goto(initialUrl, { waitUntil: 'networkidle', timeout: 30000 });

    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      console.log(` -> Scraping Bizinfo page ${pageNum}...`);

      await page.waitForSelector('div.table_Type_1 table tbody tr');
      await page.waitForTimeout(1000); 

      const announcementsOnPage = await page.$$eval('div.table_Type_1 table tbody tr', (rows) => {
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 8) return null;

          const titleElement = cells[2]?.querySelector('a');
          const title = titleElement?.textContent?.trim() || '';
          const href = titleElement?.getAttribute('href') || '';
          let link = href;
          if (href && !href.startsWith('http')) {
            try {
                const baseUrl = 'https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/'; // Base path for relative URLs
                link = new URL(href, baseUrl).href;
            } catch (e) {
                link = '#';
            }
          }
          
          const applicationPeriod = cells[3]?.textContent?.trim() || '';
          const postedDate = cells[6]?.textContent?.trim() || '';

          const combinedTitle = applicationPeriod && !applicationPeriod.includes('세부사업별') ? `${title} (${applicationPeriod})` : title;

          return { 
            title: combinedTitle, 
            link, 
            remarks: applicationPeriod, // Changed from applicationPeriod to remarks
            date: postedDate, 
            site: 'Bizinfo' 
          };
        }).filter(Boolean);
      });

      const recentAnnouncements = announcementsOnPage.filter(item => 
        isRecentDate(item.date, targetDates)
      );
      
      console.log(`    Found ${recentAnnouncements.length} recent announcements on page ${pageNum}.`);
      allRecentAnnouncements.push(...recentAnnouncements);

      if (pageNum < 5) {
        const nextPageSelector = `.page_wrap a[title='${pageNum + 1}페이지']`;
        const nextPageLink = await page.$(nextPageSelector);
        if (nextPageLink) {
          console.log(`    Navigating to page ${pageNum + 1}...`);
          await nextPageLink.click();
          await page.waitForLoadState('networkidle');
        } else {
          console.log('    No more pages to scrape.');
          break; 
        }
      }
    }
  } catch (error) {
    console.error(`Bizinfo scraping error:`, error);
  } finally {
    await page.close();
  }
  
  console.log(`Bizinfo: Total ${allRecentAnnouncements.length} recent announcements found.`);
  return allRecentAnnouncements;
}

module.exports = { scrapeBizinfo };
