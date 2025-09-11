// src/scrapers/gntp.js

async function scrapeGNTP(browser, isRecentDate, targetDates) {
  console.log('Scraping GNTP (new board only)...');
  const page = await browser.newPage();
  let results = [];
  
  try {
    // Only scrape the 'new' board, which is the default
    const url = 'https://www.gntp.or.kr/board/list';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const announcements = await page.$$eval('table tbody tr', (rows) => {
      if (!Array.isArray(rows)) return [];
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) return null; // Standard rows have 4 cells

        const titleElement = cells[2]?.querySelector('a');
        const title = titleElement?.textContent?.trim() || '';
        const href = titleElement?.getAttribute('onclick') || '';
        const idMatch = href.match(/detail\/([^/]+)\/(\d+)/);
        const link = idMatch ? `https://www.gntp.or.kr/board/detail/${idMatch[1]}/${idMatch[2]}` : '#';
        const date = cells[3]?.textContent?.trim() || '';

        return { title, link, date, site: 'GNTP' };
      }).filter(Boolean);
    });

    const recentAnnouncements = announcements.filter(item => isRecentDate(item.date, targetDates));
    results.push(...recentAnnouncements);
    console.log(`GNTP: Found ${recentAnnouncements.length} recent announcements.`);

  } catch (error) {
    console.error('GNTP scraping error:', error);
  } finally {
    await page.close();
  }
  
  return results;
}

module.exports = { scrapeGNTP };