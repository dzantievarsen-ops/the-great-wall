import { execSync } from 'node:child_process';

const KNOWN_AGENTS = ['gemini', 'claude', 'codex'] as const;

/**
 * Auto-detect which CLI agents are installed on this machine.
 * Runs `which <command>` for each known agent.
 * Returns a map of agent_id -> installed (true/false).
 */
export function detectInstalledAgents(): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  for (const agent of KNOWN_AGENTS) {
    try {
      execSync(`which ${agent}`, { stdio: 'pipe', timeout: 5_000 });
      result[agent] = true;
    } catch {
      result[agent] = false;
    }
  }

  return result;
}
