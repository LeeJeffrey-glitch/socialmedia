import * as XLSX from 'xlsx';
import { SocialMediaData } from '../types';

// Helper to clean numeric strings (e.g., "1,200", "5%", "FALSE")
const parseNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value || value === 'FALSE' || value === 'TRUE') return 0;
  
  const str = String(value).trim();
  
  // Handle percentage
  if (str.includes('%')) {
    return parseFloat(str.replace('%', '')) / 100; // Return decimal for percent, e.g. 0.05
  }
  
  // Remove commas and parse
  const cleaned = str.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const mapPlatform = (raw: string): string => {
  const p = raw?.toUpperCase()?.trim();
  if (!p) return 'Unknown';
  
  if (p === 'FB' || p.includes('FACEBOOK')) return 'Facebook';
  if (p === 'IG' || p.includes('INSTAGRAM')) return 'Instagram';
  if (p === 'TT' || p.includes('TIKTOK') || p.includes('DOUYIN')) return 'TikTok';
  if (p === 'YT' || p.includes('YOUTUBE')) return 'YouTube';
  if (p === 'X' || p.includes('TWITTER')) return 'X (Twitter)';
  if (p.includes('RED') || p.includes('XIAOHONGSHU') || p === 'XHS') return 'Xiaohongshu';
  
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
};

// Helper to extract date order from sheet name (e.g. "10月" -> 202410, "Oct 2023" -> 202310)
const parseSheetDate = (sheetName: string): { display: string, order: number } => {
  const now = new Date();
  let year = now.getFullYear();
  let month = 0;

  // Try find year (4 digits)
  const yearMatch = sheetName.match(/20\d{2}/);
  if (yearMatch) {
    year = parseInt(yearMatch[0]);
  }

  // Try find Chinese month "10月"
  const cnMonthMatch = sheetName.match(/(\d{1,2})\s*月/);
  
  if (cnMonthMatch) {
    month = parseInt(cnMonthMatch[1]);
  } else {
    // Try find English month
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const lower = sheetName.toLowerCase();
    const foundIndex = months.findIndex(m => lower.includes(m));
    if (foundIndex !== -1) month = foundIndex + 1;
  }
  
  // If no specific month found, assign a default low priority or high priority? 
  // We'll treat it as order 0 if no month found, effectively putting it at the start or allowing it to be filtered out if needed.
  const order = month > 0 ? (year * 100 + month) : 0;

  return {
    display: sheetName.trim(), 
    order
  };
};

// --- Dynamic Column Detection Configuration ---

const KEYWORDS = {
  platform: ['platform', '平台', '渠道', 'channel'],
  category: ['category', '分类', '垂类', 'type'],
  pageName: ['page name', 'page', 'account', '账号名称', '名称', 'name', 'account name'],
  followers: ['followers', 'fans', 'total followers', '粉丝数', '粉丝量', '关注'],
  followerGrowth: ['follower growth', 'growth', 'net growth', '涨粉数', '净增', '增量'],
  reach: ['reach', 'total reach', 'coverage', '阅读量', '覆盖', '曝光', 'impressions'],
  reachGrowth: ['reach growth', '覆盖增长', '阅读增长'],
  views: ['view', 'play', '播放量', '视频播放', 'vv'],
  url: ['link', 'url', '链接', '主页'],
  owner: ['owner', 'pic', '负责人', '运营', 'contact', 'leader']
};

// Helper: Find index of a column that matches any keyword
const findIndex = (headers: any[], keywords: string[]): number => {
  return headers.findIndex(h => {
    if (!h) return false;
    const str = String(h).toLowerCase();
    return keywords.some(k => str.includes(k));
  });
};

// Helper: Find index of a value column (exclude percentage columns)
const findValueIndex = (headers: any[], baseKeywords: string[]): number => {
   return headers.findIndex(h => {
    if (!h) return false;
    const str = String(h).toLowerCase();
    const isBase = baseKeywords.some(k => str.includes(k));
    // Exclude if it looks like a rate/percentage column
    const isPct = str.includes('%') || str.includes('rate') || str.includes('率') || str.includes('比');
    return isBase && !isPct;
  });
};

// Helper: Find index of a percentage column
const findPercentageIndex = (headers: any[], baseKeywords: string[]): number => {
   return headers.findIndex(h => {
    if (!h) return false;
    const str = String(h).toLowerCase();
    const isBase = baseKeywords.some(k => str.includes(k));
    const isPct = str.includes('%') || str.includes('rate') || str.includes('率') || str.includes('比');
    return isBase && isPct;
  });
};

export const parseExcelFile = async (file: File): Promise<SocialMediaData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        let allParsedData: SocialMediaData[] = [];

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (rawRows.length < 1) return;

          // Parse Sheet Date info
          const { display: monthDisplay, order: dateOrder } = parseSheetDate(sheetName);

          // 1. Detect Header Row
          // Scan first 10 rows to find the one that looks most like a header
          let headerRowIndex = 0;
          let maxMatches = 0;

          for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const row = rawRows[i];
            let matches = 0;
            if (findIndex(row, KEYWORDS.platform) > -1) matches++;
            if (findIndex(row, KEYWORDS.pageName) > -1) matches++;
            if (findIndex(row, KEYWORDS.followers) > -1) matches++;
            if (findIndex(row, KEYWORDS.owner) > -1) matches++;
            
            if (matches > maxMatches) {
              maxMatches = matches;
              headerRowIndex = i;
            }
          }

          // 2. Map Columns based on identified header row
          const headers = rawRows[headerRowIndex];
          const idx = {
            platform: findIndex(headers, KEYWORDS.platform),
            category: findIndex(headers, KEYWORDS.category),
            pageName: findIndex(headers, KEYWORDS.pageName),
            followers: findValueIndex(headers, KEYWORDS.followers),
            followerGrowth: findValueIndex(headers, KEYWORDS.followerGrowth),
            followerGrowthPct: findPercentageIndex(headers, KEYWORDS.followerGrowth),
            reach: findValueIndex(headers, KEYWORDS.reach),
            reachGrowth: findValueIndex(headers, KEYWORDS.reachGrowth),
            reachGrowthPct: findPercentageIndex(headers, KEYWORDS.reachGrowth),
            url: findIndex(headers, KEYWORDS.url),
            owner: findIndex(headers, KEYWORDS.owner),
          };

          // Special logic for Views: Sum all columns that look like "Views" but aren't "Growth"
          // This handles cases where you have "Video Views", "Live Views", etc.
          const viewIndices = headers.map((h, i) => {
             const str = String(h || '').toLowerCase();
             const isView = KEYWORDS.views.some(k => str.includes(k));
             const isGrowth = str.includes('growth') || str.includes('增') || str.includes('rate') || str.includes('比');
             return (isView && !isGrowth) ? i : -1;
          }).filter(i => i !== -1);

          // 3. Process Data Rows
          const dataRows = rawRows.slice(headerRowIndex + 1);
          
          const sheetData = dataRows.map((row: any[]) => {
              if (!row || row.length === 0) return null;

              // Helper: Get value at index, return null if index is -1
              const getVal = (i: number) => (i > -1 && row[i] !== undefined) ? row[i] : null;

              // FALLBACKS: If headers weren't found (index is -1), use default column positions
              
              const platformRaw = getVal(idx.platform) ?? row[0];
              const pageNameRaw = getVal(idx.pageName) ?? row[2];
              
              const pageName = pageNameRaw ? String(pageNameRaw).trim() : 'Unknown Page';
              
              // Skip summary rows
              if (pageName.toLowerCase().includes('total') || pageName.includes('总计') || pageName.includes('合计')) return null;

              const ownerVal = getVal(idx.owner) ?? row[13]; // Fallback to col N (13) if header not found

              // Calculate Views
              let totalViews = 0;
              if (viewIndices.length > 0) {
                 totalViews = viewIndices.reduce((sum, i) => sum + parseNumber(row[i]), 0);
              } else {
                 // Default Fallback: sum cols J, K, L (10, 11, 12)
                 totalViews = parseNumber(row[10]) + parseNumber(row[11]) + parseNumber(row[12]);
              }

              return {
                platform: mapPlatform(String(platformRaw || '')),
                category: String(getVal(idx.category) ?? row[1] ?? 'Uncategorized'),
                pageName: pageName,
                followers: parseNumber(getVal(idx.followers) ?? row[3]),
                followerGrowth: parseNumber(getVal(idx.followerGrowth) ?? row[4]),
                followerGrowthPct: parseNumber(getVal(idx.followerGrowthPct) ?? row[5]),
                reach: parseNumber(getVal(idx.reach) ?? row[6]),
                reachGrowth: parseNumber(getVal(idx.reachGrowth) ?? row[7]),
                reachGrowthPct: parseNumber(getVal(idx.reachGrowthPct) ?? row[8]),
                videoViews: totalViews,
                url: String(getVal(idx.url) ?? row[12] ?? '#'),
                owner: String(ownerVal || 'Unknown'),
                month: monthDisplay,
                dateOrder: dateOrder
              };
          }).filter((item): item is SocialMediaData => item !== null && item.pageName !== 'Unknown Page');

          allParsedData = [...allParsedData, ...sheetData];
        });

        resolve(allParsedData);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};