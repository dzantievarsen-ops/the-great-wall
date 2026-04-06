export interface AgentConfig {
  command: string;
  flags: string;
  description: string;
  color: string;
}

export interface AgentsConfig {
  agents: Record<string, AgentConfig>;
  task_assignments: Record<string, string>;
}

export type TaskType =
  | 'scraping'
  | 'analysis'
  | 'digest'
  | 'comprehensive_report'
  | 'deduplication'
  | 'emergency_detect';
