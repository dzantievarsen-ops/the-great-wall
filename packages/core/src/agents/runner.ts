import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse as parseYaml } from 'yaml';
import type { AgentsConfig } from './types.js';

const AGENT_TIMEOUT_MS = 120_000;

/**
 * Load and parse the agents.yaml config file.
 * Resolves from the config directory relative to this module.
 */
export function loadAgentsConfig(): AgentsConfig {
  const configPath = new URL('../config/agents.yaml', import.meta.url);
  const raw = readFileSync(configPath, 'utf-8');
  return parseYaml(raw) as AgentsConfig;
}

/**
 * Run a CLI agent with the given prompt and return its stdout.
 *
 * Writes the prompt to a temp file and pipes it via `cat` to avoid
 * shell escaping issues with complex prompt text.
 *
 * @param agentId - Key in agents.yaml (e.g. "gemini", "claude")
 * @param prompt  - The full prompt text to send
 * @param config  - Parsed AgentsConfig
 * @returns       - The agent's stdout as a string
 */
export async function runAgent(
  agentId: string,
  prompt: string,
  config: AgentsConfig,
): Promise<string> {
  const agentConfig = config.agents[agentId];
  if (!agentConfig) {
    throw new Error(
      `Agent "${agentId}" not found in config. Available: ${Object.keys(config.agents).join(', ')}`,
    );
  }

  // Write prompt to a temp file
  const tempDir = join(tmpdir(), 'great-wall');
  mkdirSync(tempDir, { recursive: true });
  const tempFile = join(tempDir, `prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);

  try {
    writeFileSync(tempFile, prompt, 'utf-8');

    const cmd = `cat "${tempFile}" | ${agentConfig.command} ${agentConfig.flags}`;

    const stdout = execSync(cmd, {
      encoding: 'utf-8',
      timeout: AGENT_TIMEOUT_MS,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });

    return stdout.trim();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Agent "${agentId}" (${agentConfig.command}) failed: ${message}`);
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
      // Temp file cleanup is best-effort
    }
  }
}
