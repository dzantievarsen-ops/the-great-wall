import { getDashboardStats, getLatestDigest, getRecentActions, getRecentRuns, getAllReports } from '@/lib/queries';
import { dbExists } from '@/lib/db';
import { formatScore, scoreColor, timeAgo, formatDate } from '@/lib/utils';
import { renderMarkdown } from '@/lib/markdown';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const hasDb = dbExists();

  if (!hasDb) {
    return (
      <EmptyState
        icon={
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        }
        title="Welcome to The Great Wall"
        description="Your AI Intelligence Perimeter is ready. Run the pipeline to start gathering intelligence from your configured sources."
      >
        <div className="glass-static rounded-xl p-6 max-w-lg text-left">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Quick Start</h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-wall-400 font-mono font-bold">1.</span>
              <span>Configure sources in <code className="text-wall-400 bg-slate-800/60 px-1.5 py-0.5 rounded text-xs">packages/core/src/config/sources.yaml</code></span>
            </li>
            <li className="flex gap-2">
              <span className="text-wall-400 font-mono font-bold">2.</span>
              <span>Run <code className="text-wall-400 bg-slate-800/60 px-1.5 py-0.5 rounded text-xs">pnpm gather</code> from the project root</span>
            </li>
            <li className="flex gap-2">
              <span className="text-wall-400 font-mono font-bold">3.</span>
              <span>Return here to see your intelligence dashboard</span>
            </li>
          </ol>
        </div>
      </EmptyState>
    );
  }

  const stats = getDashboardStats();
  const latestDigest = getLatestDigest();
  const recentActions = getRecentActions(8);
  const recentRuns = getRecentRuns(5);
  const recentReports = getAllReports().slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Intelligence overview
          {stats.lastRunAt && <span> &middot; Last run {timeAgo(stats.lastRunAt)}</span>}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Total Items" value={stats.totalItems} />
        <StatCard label="Analyzed" value={stats.analyzedItems} sub={stats.totalItems > 0 ? `${Math.round((stats.analyzedItems / stats.totalItems) * 100)}% coverage` : undefined} />
        <StatCard
          label="Avg Score"
          value={formatScore(stats.avgCompositeScore)}
          accent
        />
        <StatCard label="Active Sources" value={stats.activeSources} />
        <StatCard label="Reports" value={stats.totalReports} />
        <StatCard label="Pending Actions" value={stats.pendingActions} accent={stats.pendingActions > 0} />
      </div>

      {/* Main Grid: Digest + Sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Latest Digest */}
        <div className="xl:col-span-2">
          <div className="glass-static rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-200">Latest Digest</h2>
              {latestDigest && (
                <Link href={`/reports/${latestDigest.id}`} className="text-xs text-wall-400 hover:text-wall-300 transition-colors">
                  View full report &rarr;
                </Link>
              )}
            </div>
            {latestDigest ? (
              <div
                className="markdown-body text-sm leading-relaxed max-h-[500px] overflow-y-auto pr-2"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(latestDigest.content_markdown) }}
              />
            ) : (
              <p className="text-sm text-slate-500 py-8 text-center">
                No digest generated yet. Run <code className="text-wall-400 bg-slate-800/60 px-1.5 py-0.5 rounded text-xs">pnpm report:digest</code> to create one.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar: Actions + Runs + Reports */}
        <div className="space-y-6">
          {/* Recent Actions */}
          <div className="glass-static rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-200">Action Items</h2>
              <Badge className="bg-wall-500/15 text-wall-400">{stats.pendingActions} pending</Badge>
            </div>
            {recentActions.length > 0 ? (
              <ul className="space-y-3">
                {recentActions.map((action) => (
                  <li key={action.id} className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                      action.status === 'pending' ? 'bg-wall-400' :
                      action.status === 'done' ? 'bg-emerald-400' : 'bg-slate-600'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-300 leading-snug">{action.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {action.project && (
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{action.project}</span>
                        )}
                        {action.priority && (
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                            action.priority === 'critical' ? 'text-red-400' :
                            action.priority === 'high' ? 'text-wall-400' : 'text-slate-500'
                          }`}>{action.priority}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No action items yet</p>
            )}
          </div>

          {/* Recent Reports */}
          <div className="glass-static rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-200">Recent Reports</h2>
              <Link href="/reports" className="text-xs text-wall-400 hover:text-wall-300 transition-colors">View all</Link>
            </div>
            {recentReports.length > 0 ? (
              <ul className="space-y-2.5">
                {recentReports.map((report) => (
                  <li key={report.id}>
                    <Link href={`/reports/${report.id}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-white/[0.04]">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        report.type === 'emergency' ? 'bg-red-400' :
                        report.type === 'comprehensive' ? 'bg-blue-400' : 'bg-wall-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-300 group-hover:text-slate-100 truncate transition-colors">{report.title}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(report.generated_at)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No reports generated yet</p>
            )}
          </div>

          {/* Recent Runs */}
          <div className="glass-static rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Pipeline Runs</h2>
            {recentRuns.length > 0 ? (
              <ul className="space-y-2.5">
                {recentRuns.map((run) => (
                  <li key={run.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${run.completed_at ? 'bg-emerald-400' : 'bg-wall-400 animate-pulse-glow'}`} />
                      <span className="text-slate-400">{timeAgo(run.started_at)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>{run.items_scraped} scraped</span>
                      <span>{run.items_analyzed} analyzed</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No pipeline runs yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
