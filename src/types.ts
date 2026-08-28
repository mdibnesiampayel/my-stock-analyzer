export type Rating = "good" | "watch" | "risk";

export interface Quote {
  symbol: string;
  name: string;
  longName?: string;
  price: number | null;
  previousClose?: number | null;
  change: number | null;
  changePercent: number | null;
  volume?: number | null;
  marketCap?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  exchange?: string;
  currency?: string;
  quoteType?: string;
  sector?: string;
  industry?: string;
  logo?: string;
  spark?: number[];
  rank?: number;
  rankReason?: string;
  listingDate?: string;
  marketState?: "open" | "pre" | "post" | "closed";
}

export interface SearchHit {
  symbol: string;
  name: string;
  longName?: string;
  exchange?: string;
  quoteType?: string;
  type?: string;
  sector?: string;
  industry?: string;
  country?: string | null;
  logo?: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SeriesPoint {
  year?: number;
  end?: string;
  value: number;
}

export interface Fundamentals {
  asOf?: string | null;
  cik?: string;
  revenue: { latest: SeriesPoint | null; annual: SeriesPoint[] };
  netIncome: { latest: SeriesPoint | null; annual: SeriesPoint[] };
  eps: { latest: SeriesPoint | null; annual: SeriesPoint[] };
  fcf: { latest: SeriesPoint | null; annual: SeriesPoint[] };
  cash: { latest: SeriesPoint | null; annual: SeriesPoint[] };
  debt: { latest: SeriesPoint | null; annual: SeriesPoint[] };
  assets?: { latest: SeriesPoint | null; annual: SeriesPoint[] };
  equity?: { latest: SeriesPoint | null; annual: SeriesPoint[] };
  sharesOutstanding?: number | null;
  dividends?: { latest: SeriesPoint | null; annual: SeriesPoint[] };
}

export interface Metrics {
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  revenue: number | null;
  netIncome: number | null;
  fcf: number | null;
  cash: number | null;
  debt: number | null;
  equity: number | null;
  sharesOutstanding: number | null;
  ps: number | null;
  pb: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  fcfYield: number | null;
  dividendPerShare: number | null;
  dividendYield: number | null;
  targetPrice: number | null;
  recommendation: string | null;
  valuationLabel: string | null;
  valuationDiscount: string | null;
}

export interface ChecklistItem {
  id: string;
  question: string;
  rating: Rating;
  ratingLabel: string;
  headline: string;
  reason: string;
  points: number;
  max: number;
}

export interface AnalysisReport {
  business: string;
  strengths: string[];
  weaknesses: string[];
  growth: string;
  financialHealth: string;
  competitiveAdvantage: string;
  risks: string[];
  valuation: string;
  verdict: string;
}

export interface Analysis {
  score: number;
  label: string;
  items: ChecklistItem[];
  thesis: string;
  bull: string[];
  bear: string[];
  disclaimer: string;
  report?: AnalysisReport;
  source?: "filings" | "llm";
  dataLimited?: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  thumbnail: string | null;
  description?: string;
  related?: string[];
  category?: string;
  impact?: "positive" | "negative" | "neutral";
  impactLabel?: string;
  confidence?: string;
  summary?: {
    whatHappened: string;
    whyItMatters: string;
    businessEffect: string;
    short: string;
  };
}

export interface AiKey {
  id: string;
  provider: string;
  label: string;
  key: string;
  model?: string;
  baseUrl?: string;
}

export interface AiVault {
  activeId: string | null;
  keys: AiKey[];
}

export interface Settings {
  darkMode: boolean;
  notifications: boolean;
  newsCategories: string[];
  defaultMarket: string;
  currency: string;
}

export const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  notifications: false,
  newsCategories: ["all"],
  defaultMarket: "US",
  currency: "USD",
};
