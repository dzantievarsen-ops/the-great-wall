import Anthropic from '@anthropic-ai/sdk';

interface ComprehensiveInput {
  items: Array<{
    title: string;
    url: string;
    source_name: string;
    composite_score: number;
    significance_score: number;
    voyager_relevance_score: number;
    actionability_score: number;
    threat_score: number;
    analysis: string;
    tags: string[];
    project_mappings: Array<{ project: string; relevance: number; action: string }>;
    confidence: string;
  }>;
  hypotheses: Array<{
    claim: string;
    confidence: number;
    status: string;
    domain: string | null;
  }>;
  trends: Array<{
    term: string;
    mention_count: number;
    velocity: number;
    is_accelerating: boolean;
  }>;
  period: { start: string; end: string };
  totalScraped: number;
  totalSources: number;
}

const REPORT_PROMPT = `You are The Watchman writing a biweekly comprehensive AI intelligence report.

Write a 3-4 page scientific report in Markdown format. The report must follow this exact structure:

# The Great Wall — AI Intelligence Report
## Period: {period}

## Executive Summary
3-4 sentences: what happened, what it means for AI, what Voyager should do.

## 1. Field Overview
### 1.1 Model Releases & Capabilities
What new models dropped, benchmark comparisons, capability analysis.

### 1.2 Infrastructure & Tooling
New frameworks, libraries, platforms, infrastructure changes.

### 1.3 Research Developments
Notable papers, techniques, theoretical advances.

## 2. Voyager Impact Analysis
### 2.1 Direct Opportunities
Table: | Project | Opportunity | Priority | Effort |

### 2.2 Workflow Improvements
How new developments improve how we work.

### 2.3 Threat Assessment
Table: | Threat | Probability | Impact | Mitigation |

## 3. Hypothesis Tracker
Table: | Hypothesis | Confidence | Change | Evidence This Period |

## 4. Trend Analysis
### Emerging (accelerating)
### Stable (steady)
### Declining (outdated approaches to phase out)

## 5. Recommended Actions
Priority-ordered, project-tagged, effort-estimated.

---
Footer with stats.

IMPORTANT:
- Write like a senior AI researcher, not a journalist
- Be specific — name models, frameworks, versions
- Every recommendation must include which Voyager project it applies to
- Threat assessment must be honest — flag real risks, not hypotheticals
- Keep it to 3-4 pages (roughly 2000-3000 words)`;

/**
 * Generate a comprehensive biweekly scientific report (3-4 pages)
 */
export async function generateComprehensiveReport(input: ComprehensiveInput): Promise<string> {
  const { items, hypotheses, trends, period, totalScraped, totalSources } = input;

  // Build context for the AI
  const context: string[] = [];

  context.push(`## Period: ${period.start} to ${period.end}`);
  context.push(`## Stats: ${totalSources} sources, ${totalScraped} items scraped, ${items.length} significant\n`);

  context.push('## Significant Items (sorted by composite score)\n');
  const sorted = [...items].sort((a, b) => b.composite_score - a.composite_score);
  for (const item of sorted.slice(0, 20)) {
    context.push(`### ${item.title} (${item.source_name})`);
    context.push(`Scores: sig=${item.significance_score}, rel=${item.voyager_relevance_score}, act=${item.actionability_score}, threat=${item.threat_score}, composite=${item.composite_score.toFixed(1)}`);
    context.push(`Confidence: ${item.confidence}`);
    context.push(`Tags: ${item.tags.join(', ')}`);
    context.push(`Analysis: ${item.analysis}`);
    if (item.project_mappings.length > 0) {
      context.push(`Projects: ${item.project_mappings.map((m) => `${m.project} (${m.action})`).join('; ')}`);
    }
    context.push('');
  }

  if (hypotheses.length > 0) {
    context.push('## Current Hypotheses\n');
    for (const h of hypotheses) {
      context.push(`- "${h.claim}" — confidence: ${h.confidence}, status: ${h.status}, domain: ${h.domain ?? 'general'}`);
    }
    context.push('');
  }

  if (trends.length > 0) {
    context.push('## Trends\n');
    for (const t of trends) {
      const accel = t.is_accelerating ? ' ACCELERATING' : '';
      context.push(`- "${t.term}": ${t.mention_count} mentions, velocity=${t.velocity.toFixed(2)}${accel}`);
    }
  }

  const client = new Anthropic();
  console.log('[Report] Generating comprehensive report...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: REPORT_PROMPT,
    messages: [{
      role: 'user',
      content: `Generate the comprehensive report based on this intelligence data:\n\n${context.join('\n')}`,
    }],
  });

  const report = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  console.log('[Report] Comprehensive report generated.');
  return report;
}
