// src/scrapers/bizinfo.js

async function scrapeBizinfo(browser, isRecentDate, targetDates) {
  console.log('Scraping Bizinfo...');
  let allRecentAnnouncements = [];
  const page = await browser.newPage();

  try {
    // 1. Go to the initial page
    const initialUrl = 'https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do?page=1';
    await page.goto(initialUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Scrape up to 5 pages
    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      console.log(` -> Scraping Bizinfo page ${pageNum}...`);

      // Wait for the table to be stable
      await page.waitForSelector('div.table_Type_1 table tbody tr');
      await page.waitForTimeout(1000); // Extra wait for safety

      const announcementsOnPage = await page.$$eval('div.table_Type_1 table tbody tr', (rows) => {
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 8) return null;

          const titleElement = cells[2]?.querySelector('a');
          const title = titleElement?.textContent?.trim() || '';
          const href = titleElement?.getAttribute('href') || '';
          const link = href ? `https://www.bizinfo.go.kr${href}` : '#';
          
          const applicationPeriod = cells[3]?.textContent?.trim() || '';
          const postedDate = cells[6]?.textContent?.trim() || '';

          const combinedTitle = applicationPeriod && !applicationPeriod.includes('세부사업별') ? `${title} (${applicationPeriod})` : title;

          return { 
            title: combinedTitle, 
            link, 
            applicationPeriod, 
            date: postedDate, 
            site: 'Bizinfo' 
          };
        }).filter(Boolean);
      });

      // Filter by the 'postedDate' (which is in item.date) to match user expectation
      const recentAnnouncements = announcementsOnPage.filter(item => 
        isRecentDate(item.date, targetDates)
      );
      
      console.log(`    Found ${recentAnnouncements.length} recent announcements on page ${pageNum}.`);
      allRecentAnnouncements.push(...recentAnnouncements);

      // 3. Click the link for the next page, if it exists
      if (pageNum < 5) {
        const nextPageSelector = `.page_wrap a[title='${pageNum + 1}페이지']`;
        const nextPageLink = await page.$(nextPageSelector);
        if (nextPageLink) {
          console.log(`    Navigating to page ${pageNum + 1}...`);
          await nextPageLink.click();
          // Wait for navigation/content update after click
          await page.waitForLoadState('networkidle');
        } else {
          console.log('    No more pages to scrape.');
          break; // Exit loop if next page link isn't found
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