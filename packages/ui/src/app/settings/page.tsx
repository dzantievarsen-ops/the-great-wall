import { PageHeader } from '@/components/ui/page-header';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

interface AgentDef {
  command: string;
  flags: string;
  description: string;
  color: string;
}

interface AgentsConfig {
  agents: Record<string, AgentDef>;
  task_assignments: Record<string, string>;
}

function loadAgentsConfig(): AgentsConfig | null {
  // Try known locations relative to process.cwd()
  const candidates = [
    join(process.cwd(), '..', 'core', 'src', 'config', 'agents.yaml'),
    join(process.cwd(), 'packages', 'core', 'src', 'config', 'agents.yaml'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return parseSimpleYaml(readFileSync(path, 'utf-8'));
    }
  }
  return null;
}

// Minimal YAML parser for the agents.yaml structure (avoids adding yaml dependency to UI)
function parseSimpleYaml(content: string): AgentsConfig | null {
  try {
    const agents: Record<string, AgentDef> = {};
    const taskAssignments: Record<string, string> = {};

    let section: 'agents' | 'tasks' | null = null;
    let currentAgent: string | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trimEnd();
      if (trimmed === 'agents:') { section = 'agents'; continue; }
      if (trimmed === 'task_assignments:') { section = 'tasks'; continue; }
      if (trimmed.startsWith('#') || trimmed === '') continue;

      if (section === 'agents') {
        const agentMatch = trimmed.match(/^  (\w+):$/);
        if (agentMatch) {
          currentAgent = agentMatch[1];
          agents[currentAgent] = { command: '', flags: '', description: '', color: '' };
          continue;
        }
        if (currentAgent) {
          const kvMatch = trimmed.match(/^\s+(\w+):\s*"?([^"]*)"?\s*$/);
          if (kvMatch) {
            const [, key, value] = kvMatch;
            (agents[currentAgent] as unknown as Record<string, string>)[key] = value;
          }
        }
      }

      if (section === 'tasks') {
        const taskMatch = trimmed.match(/^\s+(\w+):\s*(\w+)\s*$/);
        if (taskMatch) {
          taskAssignments[taskMatch[1]] = taskMatch[2];
        }
      }
    }

    return { agents, task_assignments: taskAssignments };
  } catch {
    return null;
  }
}

const TASK_LABELS: Record<string, string> = {
  scraping: 'Content Scraping',
  analysis: 'Watchman Analysis',
  digest: 'Digest Generation',
  comprehensive_report: 'Comprehensive Report',
  deduplication: 'Deduplication',
  emergency_detect: 'Emergency Detection',
};

export default function SettingsPage() {
  const config = loadAgentsConfig();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Agent configuration and task assignments"
      />

      {/* Agent Definitions */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-200 mb-4">CLI Agents</h2>
        {config ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Object.entries(config.agents).map(([name, agent]) => (
              <div key={name} className="glass-static rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: agent.color }}
                  />
                  <h3 className="text-sm font-bold text-slate-100 capitalize">{name}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">{agent.description}</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Command:</span>
                    <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-slate-300 font-mono">
                      {agent.command} {agent.flags}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Could not load agents.yaml. Check packages/core/src/config/agents.yaml.
          </p>
        )}
      </section>

      {/* Task Assignments */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-200 mb-4">Task Assignments</h2>
        {config ? (
          <div className="glass-static overflow-hidden rounded-lg">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Task</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Assigned Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {Object.entries(config.task_assignments).map(([task, agent]) => {
                  const agentDef = config.agents[agent];
                  return (
                    <tr key={task} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-slate-300">
                        {TASK_LABELS[task] ?? task}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {agentDef && (
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: agentDef.color }}
                            />
                          )}
                          <span className="text-slate-200 font-medium capitalize">{agent}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No task assignments loaded.</p>
        )}
      </section>

      {/* Schedule Info */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-200 mb-4">Schedule</h2>
        <div className="glass-static rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wall-500/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-wall-400">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-200">Monday &amp; Friday at 07:00</p>
              <p className="text-xs text-slate-500">Full pipeline: scrape &rarr; analyze &rarr; digest</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-200">Every 2nd Friday</p>
              <p className="text-xs text-slate-500">Also generates comprehensive report</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-2 border-t border-white/[0.06]">
            Install via: <code className="text-slate-400 font-mono">pnpm schedule:install</code>
            &ensp;|&ensp;
            Manual run: <code className="text-slate-400 font-mono">pnpm gather</code>
          </p>
        </div>
      </section>

      {/* Config Files */}
      <section>
        <h2 className="text-base font-semibold text-slate-200 mb-4">Configuration Files</h2>
        <div className="glass-static rounded-lg divide-y divide-white/[0.04]">
          {[
            { file: 'sources.yaml', desc: 'YouTube channels, Substacks, and web sources' },
            { file: 'agents.yaml', desc: 'CLI agent definitions and task assignments' },
            { file: 'projects.yaml', desc: 'Voyager project mappings for relevance scoring' },
          ].map(({ file, desc }) => (
            <div key={file} className="flex items-center gap-3 px-4 py-3">
              <code className="text-xs font-mono text-wall-400 bg-wall-500/10 rounded px-2 py-0.5">
                {file}
              </code>
              <span className="text-xs text-slate-500">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Location: <code className="text-slate-400 font-mono">packages/core/src/config/</code>
        </p>
      </section>
    </div>
  );
}
