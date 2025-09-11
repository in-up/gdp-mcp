const sites = [
    { name: 'GNCEP_Notice', url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub4_notice' },
    { name: 'GNCEP_Business', url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub4_business' },
];

async function scrapeGNCEP(browser, isRecentDate, targetDates) {
  let allResults = [];

  for (const site of sites) {
    console.log(`Scraping ${site.name}...`);
    const page = await browser.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });

      const announcements = await page.$$eval('#bo_list .tbl_head01 tbody tr', (rows, { siteName, siteUrl }) => {
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return null;

          const dateElement = row.querySelector('.td_datetime');
          const date = dateElement?.textContent?.trim() || '';

          const titleElement = row.querySelector('.td_subject .bo_tit a');
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

          return { title, link, date, site: siteName };
        }).filter(item => item && item.title && item.title.length > 0);
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

module.exports = { scrapeGNCEP };