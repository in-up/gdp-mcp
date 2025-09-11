
// src/scrapers/otherSites.js

const sites = [
    { name: 'GNCKL_Notice', url: 'https://www.gnckl.or.kr/bbs/board.php?bo_table=notice' },
    { name: 'GNCKL_Notice2', url: 'https://www.gnckl.or.kr/bbs/board.php?bo_table=notice2' },
    { name: 'GNCKL_Notice3', url: 'https://www.gnckl.or.kr/bbs/board.php?bo_table=notice3' },
    { name: 'GNCEP_Notice', url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub4_notice' },
    { name: 'GNCEP_Business', url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub4_business' },
    { name: 'GNCEP_Recruit', url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub2_3' }
];

async function scrapeOtherSites(browser, isRecentDate, targetDates) {
  let allResults = [];

  for (const site of sites) {
    console.log(`Scraping ${site.name}...`);
    const page = await browser.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });

      const announcements = await page.$eval('table tbody tr, .board_list tr', (rows, { siteName, siteUrl }) => {
        if (!Array.isArray(rows)) return []; // Ensure rows is an array
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return null;

          let titleElement = cells[1]?.querySelector('a') || cells[2]?.querySelector('a') || cells[0]?.querySelector('a');
          const title = titleElement?.textContent?.trim() || '';
          const href = titleElement?.getAttribute('href') || '';
          
          let link = href;
          if (href && !href.startsWith('http')) {
            try {
                const baseUrl = new URL(siteUrl).origin;
                link = new URL(href, baseUrl).href;
            } catch (e) {
                // Handle cases where href is not a valid URL part, e.g., javascript:;
                link = '#';
            }
          }
          
          const date = cells[cells.length - 1]?.textContent?.trim() || cells[cells.length - 2]?.textContent?.trim() || '';

          return { title, link, date, site: siteName };
        }).filter(item => item.title && item.title.length > 0);
      }, { siteName: site.name, siteUrl: site.url });

      const recentAnnouncements = announcements.filter(item => isRecentDate(item.date, targetDates));
      allResults.push(...recentAnnouncements);
      console.log(`${site.name}: ${recentAnnouncements.length} recent announcements found`);

    } catch (error) {
      console.error(`${site.name} scraping error:`, error);
    } finally {
      await page.close();
    }
  }
  return allResults;
}

module.exports = { scrapeOtherSites };
