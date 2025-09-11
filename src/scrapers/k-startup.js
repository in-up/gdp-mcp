
// src/scrapers/k-startup.js
const fs = require('fs');

async function scrapeKStartup(browser, isRecentDate, targetDates) {
  console.log('Scraping K-Startup...');
  const page = await browser.newPage();
  let allAnnouncements = [];
  
  try {
    // Loop through pages using URL parameter
    for (let pageNum = 1; pageNum <= 5; pageNum++) { // Scrape up to 5 pages
      console.log(` -> Scraping K-Startup page ${pageNum}...`);
      const url = `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?page=${pageNum}`;
      
      // Aggressive waiting strategy: wait for 'load' and then a fixed timeout
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(10000); // Give 10 seconds for content to render

      const announcements = await page.$$eval('.board_list tbody tr, table tbody tr', (rows) => {
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 4) return null;

          const titleElement = cells[1]?.querySelector('a') || cells[2]?.querySelector('a');
          const title = titleElement?.textContent?.trim() || '';
          const onclick = titleElement?.getAttribute('onclick') || '';
          const idMatch = onclick.match(/go_view\((\d+)\)/);
          const link = idMatch ? 
            `https://www.k-startup.go.kr/web/contents/bizpbanc-detail.do?seq=${idMatch[1]}` : '';
          
          // Extract date from div.bottom span.list:has-text('등록일자')
          let date = '';
          const bottomDiv = row.querySelector('div.bottom');
          if (bottomDiv) {
            const dateSpan = Array.from(bottomDiv.querySelectorAll('span.list')).find(span => span.textContent.includes('등록일자'));
            if (dateSpan) {
              const dateText = dateSpan.textContent?.trim() || '';
              const dateMatch = dateText.match(/\d{4}-\d{2}-\d{2}/);
              if (dateMatch) {
                date = dateMatch[0];
              }
            }
          }

          return { title, link, date, site: 'K-Startup' };
        }).filter(Boolean);
      });

      const currentRecentAnnouncements = announcements.filter(item => isRecentDate(item.date, targetDates));
      allAnnouncements.push(...currentRecentAnnouncements);
      console.log(`    Found ${currentRecentAnnouncements.length} recent announcements on page ${pageNum}.`);

      // If no recent announcements found on this page, and it's not the first page, break
      if (currentRecentAnnouncements.length === 0 && pageNum > 1) {
        console.log('    No recent announcements found on this page, stopping.');
        break;
      }
    }

    console.log(`K-Startup: Found ${allAnnouncements.length} total announcements.`);

  } catch (error) {
    console.error('K-Startup scraping error:', error);
  } finally {
    if (page) { // Ensure page is defined before closing
      await page.close();
    }
  }
  
  return allAnnouncements; 
}

module.exports = { scrapeKStartup };
