
const { chromium } = require('playwright');

async function scrapeGNTP(browser, isRecentDate, targetDates) {
  console.log('Scraping GNTP (new board only)...');
  let allAnnouncements = [];
  const page = await browser.newPage();

  try {
    const initialUrl = 'https://www.gntp.or.kr/board/list/new';
    await page.goto(initialUrl, { waitUntil: 'networkidle', timeout: 30000 });

    const announcementsOnPage = await page.$$eval('#board-list-table tbody tr', (rows) => {
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return null;

        const titleElement = cells[1]?.querySelector('a');
        const title = titleElement?.textContent?.trim() || '';
        const href = titleElement?.getAttribute('href') || '';
        const link = href ? `https://www.gntp.or.kr${href}` : '#';
        const date = cells[3]?.textContent?.trim() || '';

        return { title, link, date, site: 'GNTP' };
      }).filter(Boolean);
    });

    const recentAnnouncements = announcementsOnPage.filter(item => 
      isRecentDate(item.date, targetDates)
    );
    
    allAnnouncements.push(...recentAnnouncements);
    console.log(`GNTP: Found ${allAnnouncements.length} recent announcements.`);

  } catch (error) {
    console.error(`GNTP scraping error:`, error);
  } finally {
    await page.close();
  }
  
  return allAnnouncements;
}

module.exports = { scrapeGNTP };
