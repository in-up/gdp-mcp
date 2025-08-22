// scraper.js - CommonJS 버전 (import 문제 해결)
const { chromium } = require('playwright');
const fs = require('fs');

class GovernmentAnnouncementScraper {
  constructor() {
    this.browser = null;
    this.results = [];
    
    // 오늘과 어제 날짜
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    this.targetDates = [
      this.formatDate(today),
      this.formatDate(yesterday)
    ];
    
    console.log('Target dates:', this.targetDates);
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  async init() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // 날짜 필터링 헬퍼
  isRecentDate(dateStr) {
    if (!dateStr) return false;
    
    // 다양한 날짜 형식 처리
    const normalizedDate = dateStr.replace(/[.\s]/g, '-').replace(/년|월|일/g, '');
    
    return this.targetDates.some(target => 
      normalizedDate.includes(target) || 
      normalizedDate.includes(target.replace(/-/g, '.')) ||
      normalizedDate.includes(target.replace(/-/g, ''))
    );
  }

  // 1. K-Startup (JavaScript 동적 로딩)
  async scrapeKStartup() {
    console.log('Scraping K-Startup...');
    const page = await this.browser.newPage();
    
    try {
      await page.goto('https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 페이지 로딩 대기
      await page.waitForTimeout(5000);
      
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
          
          const dateCell = cells[cells.length - 1] || cells[4];
          const date = dateCell?.textContent?.trim() || '';

          return { title, link, date, site: 'K-Startup' };
        }).filter(Boolean);
      });

      const recentAnnouncements = announcements.filter(item => 
        this.isRecentDate(item.date)
      );

      this.results.push(...recentAnnouncements);
      console.log(`K-Startup: ${recentAnnouncements.length} recent announcements found`);

    } catch (error) {
      console.error('K-Startup scraping error:', error);
    } finally {
      await page.close();
    }
  }

  // 2. Bizinfo (일반 테이블)
  async scrapeBizinfo() {
    console.log('Scraping Bizinfo...');
    
    for (let page = 1; page <= 2; page++) {
      const pageObj = await this.browser.newPage();
      
      try {
        const url = `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do?page=${page}`;
        await pageObj.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        const announcements = await pageObj.$$eval('table tbody tr', (rows) => {
          return rows.map(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) return null;

            const titleLink = cells[2]?.querySelector('a');
            const title = titleLink?.textContent?.trim() || '';
            const href = titleLink?.getAttribute('href') || '';
            const link = href.startsWith('http') ? href : 
              `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/${href}`;
            
            const date = cells[cells.length - 1]?.textContent?.trim() || '';

            return { title, link, date, site: 'Bizinfo' };
          }).filter(Boolean);
        });

        const recentAnnouncements = announcements.filter(item => 
          this.isRecentDate(item.date)
        );

        this.results.push(...recentAnnouncements);

        if (recentAnnouncements.length === 0 && page > 1) {
          console.log('Bizinfo: No recent announcements, stopping');
          await pageObj.close();
          break;
        }

      } catch (error) {
        console.error(`Bizinfo page ${page} error:`, error);
      } finally {
        await pageObj.close();
      }
    }
  }

  // 3. 경남테크노파크
  async scrapeGNTP() {
    console.log('Scraping GNTP...');
    const page = await this.browser.newPage();
    
    try {
      await page.goto('https://www.gntp.or.kr/board/list', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });

      const announcements = await page.$$eval('table tbody tr, .board_list tr', (rows) => {
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return null;

          const titleElement = cells[1]?.querySelector('a') || cells[2]?.querySelector('a');
          const title = titleElement?.textContent?.trim() || '';
          const href = titleElement?.getAttribute('href') || '';
          const link = href.startsWith('http') ? href : 
            `https://www.gntp.or.kr${href}`;
          
          const date = cells[cells.length - 1]?.textContent?.trim() || '';

          return { title, link, date, site: 'GNTP' };
        }).filter(Boolean);
      });

      const recentAnnouncements = announcements.filter(item => 
        this.isRecentDate(item.date)
      );

      this.results.push(...recentAnnouncements);
      console.log(`GNTP: ${recentAnnouncements.length} recent announcements found`);

    } catch (error) {
      console.error('GNTP scraping error:', error);
    } finally {
      await page.close();
    }
  }

  // 4-11. 기타 사이트들
  async scrapeOtherSites() {
    const sites = [
      {
        name: 'GNCKL_Notice',
        url: 'https://www.gnckl.or.kr/bbs/board.php?bo_table=notice'
      },
      {
        name: 'GNCKL_Notice2',
        url: 'https://www.gnckl.or.kr/bbs/board.php?bo_table=notice2'
      },
      {
        name: 'GNCKL_Notice3',
        url: 'https://www.gnckl.or.kr/bbs/board.php?bo_table=notice3'
      },
      {
        name: 'GNCEP_Notice',
        url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub4_notice'
      },
      {
        name: 'GNCEP_Business',
        url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub4_business'
      },
      {
        name: 'GNCEP_Recruit',
        url: 'https://www.gncep.or.kr/bbs/board.php?bo_table=sub2_3'
      }
    ];

    for (const site of sites) {
      console.log(`Scraping ${site.name}...`);
      const page = await this.browser.newPage();
      
      try {
        await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });

        const announcements = await page.$$eval('table tbody tr, .board_list tr', (rows) => {
          return rows.map(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 3) return null;

            // 제목과 링크 찾기 (여러 패턴 시도)
            let titleElement = cells[1]?.querySelector('a') || 
                              cells[2]?.querySelector('a') ||
                              cells[0]?.querySelector('a');
            
            const title = titleElement?.textContent?.trim() || '';
            const href = titleElement?.getAttribute('href') || '';
            
            // 상대 링크를 절대 링크로 변환
            let link = href;
            if (href && !href.startsWith('http')) {
              const baseUrl = new URL(site.url).origin;
              link = href.startsWith('/') ? baseUrl + href : baseUrl + '/' + href;
            }
            
            // 날짜 찾기 (보통 마지막 컬럼)
            const date = cells[cells.length - 1]?.textContent?.trim() || 
                        cells[cells.length - 2]?.textContent?.trim() || '';

            return { title, link, date, site: site.name };
          }).filter(item => item.title && item.title.length > 0);
        });

        const recentAnnouncements = announcements.filter(item => 
          this.isRecentDate(item.date)
        );

        this.results.push(...recentAnnouncements);
        console.log(`${site.name}: ${recentAnnouncements.length} recent announcements found`);

      } catch (error) {
        console.error(`${site.name} scraping error:`, error);
      } finally {
        await page.close();
      }
    }
  }

  // 중복 제거 및 정렬
  deduplicateResults() {
    const seen = new Set();
    const unique = this.results.filter(item => {
      const key = `${item.title.substring(0, 50)}-${item.site}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => {
      const dateA = new Date(a.date.replace(/[^\d-]/g, ''));
      const dateB = new Date(b.date.replace(/[^\d-]/g, ''));
      return dateB - dateA;
    });
  }

  // 메인 실행 함수
  async run() {
    try {
      console.log('Starting government announcements scraper...');
      await this.init();
      
      // 순차적으로 실행 (안정성을 위해)
      await this.scrapeBizinfo();
      await this.scrapeGNTP();
      await this.scrapeOtherSites();
      await this.scrapeKStartup(); // 가장 무거운 것은 마지막에

      // 결과 정리
      const finalResults = this.deduplicateResults();
      
      console.log(`Total announcements found: ${finalResults.length}`);
      
      // JSON 파일로 저장
      const output = {
        lastUpdated: new Date().toISOString(),
        targetDates: this.targetDates,
        totalCount: finalResults.length,
        announcements: finalResults
      };
      
      fs.writeFileSync('announcements.json', JSON.stringify(output, null, 2));
      
      // 마크다운 테이블로도 저장
      let markdown = `# 정부 지원사업 최근 공고\n\n`;
      markdown += `**업데이트:** ${new Date().toLocaleString('ko-KR')}\n\n`;
      markdown += `| 제목 | 사이트 | 날짜 | 링크 |\n`;
      markdown += `|------|--------|------|------|\n`;
      
      if (finalResults.length === 0) {
        markdown += `| 최근 2일간 새로운 공고가 없습니다 | - | - | - |\n`;
      } else {
        finalResults.forEach(item => {
          const title = item.title.length > 50 ? 
            item.title.substring(0, 50) + '...' : item.title;
          markdown += `| ${title} | ${item.site} | ${item.date} | [링크](${item.link}) |\n`;
        });
      }
      
      fs.writeFileSync('README.md', markdown);
      
      console.log('Scraping completed successfully!');
      
    } catch (error) {
      console.error('Scraping failed:', error);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

// 실행
const scraper = new GovernmentAnnouncementScraper();
scraper.run();