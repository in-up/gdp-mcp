const sites = [
    { name: 'GNCEP_Notice', url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub4_notice' },
    { name: 'gncep_business', url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub4_business' },
];

async function scrapeGNCEP(browser, isRecentDate, targetDates) {
  let allResults = [];

  for (const site of sites) {
    console.log(`Scraping ${site.name}...`);
    const page = await browser.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('#bo_list .tbl_head01 tbody tr');

      

            let announcements;
      if (site.name === 'gncep_business') {
        announcements = await page.$eval('.tbl_head01.tbl_wrap tbody tr', (rows, args) => {
          const { siteName, siteUrl } = args;
          return Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return null;

            const number = cells[0]?.textContent?.trim() || '';
            const titleElement = cells[1]?.querySelector('.bo_tit a');
            const title = titleElement?.textContent?.trim() || '';
            const href = titleElement?.getAttribute('href') || '';
            let link = href;
            if (href && !href.startsWith('http')) {
              try {
                const baseUrl = new URL(siteUrl).origin;
                link = new URL(href, baseUrl).href;
              } catch (e) {
                link = '#';
              }
            }

            const applicationPeriod = cells[2]?.querySelector('.bid_date_list')?.textContent?.trim() || '';
            const date = cells[3]?.textContent?.trim() || '';

            const endDateMatch = applicationPeriod.match(/\s*~\s*(\d{4}-\d{2}-\d{2})/);
            const endDate = endDateMatch ? endDateMatch[1] : null;

            const remarks = `| 항목 | 내용 |\n|---|---|\n| **번호** | ${number} |\n| **제목** | ${title} |\n| **접수기간** | ${applicationPeriod} |\n| **등록일** | ${date} |`;

            return { title, link, remarks, date, endDate, site: siteName };
          }).filter(item => item && item.title && item.title.length > 0);
        }, { siteName: site.name, siteUrl: site.url });
      } else {
        announcements = await page.$eval('.tbl_head01.tbl_wrap tbody tr', (rows, args) => {
          const { siteName, siteUrl } = args;
          return Array.from(rows).map(row => {
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
                  link = '#';
              }
            }

            return { title, link, date, site: siteName };
          }).filter(item => item && item.title && item.title.length > 0);
        }, { siteName: site.name, siteUrl: site.url });
      }
      

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
