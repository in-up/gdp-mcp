#!/usr/bin/env node

// 필요한 라이브러리 가져오기
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// 서버 만들기
const server = new Server(
  {
    name: 'government-scraper',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 도구 목록 알려주기
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'scrape_announcements',
        description: '정부 공고를 스크래핑합니다',
        inputSchema: {
          type: 'object',
          properties: {
            site: {
              type: 'string',
              description: '스크래핑할 사이트 (kstartup, bizinfo, all)',
              default: 'all'
            }
          }
        }
      }
    ]
  };
});

// 실제 작업 수행하기
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'scrape_announcements') {
    const site = request.params.arguments?.site || 'all';
    
    // 일단 간단한 테스트 결과 반환
    const testResults = [
      {
        title: '테스트 공고 1',
        link: 'http://example.com/1',
        date: '2025-08-22',
        site: 'K-Startup'
      },
      {
        title: '테스트 공고 2', 
        link: 'http://example.com/2',
        date: '2025-08-21',
        site: 'Bizinfo'
      }
    ];
    
    let result = `${site} 사이트 스크래핑 결과:\n\n`;
    result += '| 제목 | 링크 | 날짜 | 사이트 |\n';
    result += '|------|------|------|--------|\n';
    
    testResults.forEach(item => {
      result += `| ${item.title} | ${item.link} | ${item.date} | ${item.site} |\n`;
    });
    
    return {
      content: [
        {
          type: 'text',
          text: result
        }
      ]
    };
  }
  
  throw new Error(`Unknown tool: ${request.params.name}`);
});

// 서버 실행
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Government Scraper MCP Server is running...');
}

main().catch(console.error);