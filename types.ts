export interface SocialMediaData {
  platform: string; // 'FB', 'IG', 'TT', 'YT'
  category: string;
  pageName: string;
  followers: number;
  followerGrowth: number;
  followerGrowthPct: number;
  reach: number;
  reachGrowth: number;
  reachGrowthPct: number;
  videoViews: number;
  url: string;
  owner: string;
  month: string; // Sheet name or parsed month name
  dateOrder: number; // Numeric representation for sorting (e.g. 202310)
}

export interface AggregatedStats {
  totalFollowers: number;
  totalReach: number;
  totalGrowth: number;
  platformStats: {
    name: string;
    followers: number;
    reach: number;
    growth: number;
  }[];
  topPages: SocialMediaData[];
}

export type FilterState = {
  platform: string;
  owner: string;
};