import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const GREATWALL_DIR = 'greatwall';
const INTAKE_BASE = '06_Forge/intake';

function getIntakePath(voyagerPath: string): string {
  return join(voyagerPath, INTAKE_BASE, GREATWALL_DIR);
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write the latest digest to Voyager
 */
export function writeDigest(voyagerPath: string, content: string): void {
  const dir = getIntakePath(voyagerPath);
  ensureDir(dir);
  const filePath = join(dir, 'latest_digest.md');
  writeFileSync(filePath, content, 'utf-8');
  console.log(`[Bridge] Digest written to ${filePath}`);
}

/**
 * Write the latest comprehensive report to Voyager
 */
export function writeReport(voyagerPath: string, content: string): void {
  const dir = getIntakePath(voyagerPath);
  ensureDir(dir);
  const filePath = join(dir, 'latest_report.md');
  writeFileSync(filePath, content, 'utf-8');
  console.log(`[Bridge] Report written to ${filePath}`);
}

/**
 * Write an emergency alert to Voyager
 */
export function writeEmergency(voyagerPath: string, title: string, content: string): void {
  const dir = join(getIntakePath(voyagerPath), 'emergency');
  ensureDir(dir);
  const date = new Date().toISOString().split('T')[0];
  const safeTitle = title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
  const filePath = join(dir, `${date}_${safeTitle}.md`);
  writeFileSync(filePath, content, 'utf-8');
  console.log(`[Bridge] Emergency alert written to ${filePath}`);
}

/**
 * Write suggested memory updates for human review
 */
export function writeMemoryUpdates(
  voyagerPath: string,
  updates: Array<{ target: string; suggestion: string }>,
): void {
  if (updates.length === 0) return;

  const dir = getIntakePath(voyagerPath);
  ensureDir(dir);

  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`# Suggested Memory Updates — ${date}`);
  lines.push('');
  lines.push('> Review and apply manually. These are NOT auto-applied.');
  lines.push('');

  for (const update of updates) {
    lines.push(`## For ${update.target}`);
    lines.push(update.suggestion);
    lines.push('');
  }

  const filePath = join(dir, 'memory_updates.md');
  writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`[Bridge] Memory updates written to ${filePath}`);
}
