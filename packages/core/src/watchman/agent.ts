import Anthropic from '@anthropic-ai/sdk';
import { WATCHMAN_SYSTEM_PROMPT, buildWatchmanInput } from './prompts.js';
import type { WatchmanAnalysis, WatchmanItemAnalysis } from './types.js';

export interface WatchmanInput {
  url: string;
  title: string;
  source_name: string;
  content_summary: string | null;
}

export interface ProjectInfo {
  name: string;
  keywords: string[];
  stack: string[];
}

export interface HypothesisInfo {
  claim: string;
  confidence: number;
  domain: string | null;
}

export async function runWatchman(
  items: WatchmanInput[],
  projects: ProjectInfo[],
  hypotheses: HypothesisInfo[],
): Promise<WatchmanAnalysis> {
  if (items.length === 0) {
    return {
      items: [],
      new_hypotheses: [],
      emergency_items: [],
      digest_summary: 'No new items to analyze.',
    };
  }

  const client = new Anthropic();
  const userMessage = buildWatchmanInput(items, projects, hypotheses);

  console.log(`[Watchman] Analyzing ${items.length} items...`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: WATCHMAN_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch?.[1]) {
    console.error('[Watchman] Failed to parse response. Raw text:', text.slice(0, 500));
    throw new Error('Watchman returned non-JSON response');
  }

  const analysis = JSON.parse(jsonMatch[1]) as WatchmanAnalysis;

  // Calculate composite scores if not provided
  for (const item of analysis.items) {
    if (item.composite_score == null) {
      item.composite_score =
        (item.significance_score ?? 0) * 0.3 +
        (item.voyager_relevance_score ?? 0) * 0.3 +
        (item.actionability_score ?? 0) * 0.25 +
        (item.threat_score ?? 0) * 0.15;
    }
  }

  // Identify emergency items
  analysis.emergency_items = analysis.items
    .filter((item) => (item.composite_score ?? 0) >= 9.0)
    .map((item) => item.url);

  const selected = analysis.items.filter((i) => (i.composite_score ?? 0) >= 5.0).length;
  console.log(`[Watchman] Analysis complete. ${selected}/${items.length} items above threshold.`);

  if (analysis.emergency_items.length > 0) {
    console.log(`[Watchman] EMERGENCY: ${analysis.emergency_items.length} items require immediate attention!`);
  }

  return analysis;
}
