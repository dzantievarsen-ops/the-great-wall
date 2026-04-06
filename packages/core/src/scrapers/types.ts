export interface ScrapedItem {
  source_id: string;
  title: string;
  url: string;
  content_summary: string | null;
  full_content: string | null;
  published_at: string | null;
}

export interface SourceConfig {
  handle?: string;
  url?: string;
  name: string;
  priority: string;
  category: string;
  active: boolean;
  rss?: string | null;
}

export interface SourcesConfig {
  sources: {
    youtube: SourceConfig[];
    substack: SourceConfig[];
    web: SourceConfig[];
  };
  metadata: { version: string; last_updated: string | null };
}
