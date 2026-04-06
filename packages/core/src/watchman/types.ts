export interface ProjectMapping {
  project: string;
  relevance: number;
  action: string;
}

export interface HypothesisUpdate {
  claim: string;
  direction: 'supporting' | 'contradicting';
  contribution: string;
}

export interface NewHypothesis {
  claim: string;
  domain: string;
  initial_confidence: number;
  basis: string;
}

export interface WatchmanItemAnalysis {
  url: string;
  significance_score: number;
  voyager_relevance_score: number;
  actionability_score: number;
  threat_score: number;
  composite_score: number | null;
  confidence: 'confirmed' | 'likely' | 'speculative' | 'unverified';
  analysis: string;
  tags: string[];
  project_mappings: ProjectMapping[];
  trend_terms: string[];
  hypothesis_updates: HypothesisUpdate[];
}

export interface WatchmanAnalysis {
  items: WatchmanItemAnalysis[];
  new_hypotheses: NewHypothesis[];
  emergency_items: string[];
  digest_summary: string;
}
