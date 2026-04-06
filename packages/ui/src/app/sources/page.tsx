import { getAllSources } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatScore, scoreBg, priorityBg, typeBadge, timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function SourcesPage() {
  const sources = getAllSources();

  return (
    <div>
      <PageHeader
        title="Sources"
        description={`${sources.length} configured intelligence sources`}
      />

      {sources.length > 0 ? (
        <div className="glass-static rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Source</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Priority</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category</th>
                  <th className="text-center px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Credibility</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Items</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Last Scraped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sources.map((source) => (
                  <tr key={source.id} className="group transition-colors hover:bg-white/[0.02]">
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${source.active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        <div>
                          <p className="font-medium text-slate-200 group-hover:text-wall-400 transition-colors">
                            {source.name}
                          </p>
                          {source.handle && (
                            <p className="text-[10px] text-slate-500 font-mono">{source.handle}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5">
                      <Badge className={typeBadge(source.type)}>{source.type}</Badge>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3.5">
                      <Badge className={priorityBg(source.priority)}>{source.priority}</Badge>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-400">{source.category}</span>
                    </td>

                    {/* Active */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className={`h-2.5 w-5 rounded-full transition-colors ${source.active ? 'bg-emerald-500/30' : 'bg-slate-700'}`}>
                          <div className={`h-2.5 w-2.5 rounded-full transition-all ${source.active ? 'bg-emerald-400 translate-x-2.5' : 'bg-slate-500 translate-x-0'}`} />
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-medium ${source.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {source.active ? 'on' : 'off'}
                        </span>
                      </div>
                    </td>

                    {/* Credibility */}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`score-pill ${scoreBg(source.credibility_score * 10)}`}>
                        {formatScore(source.credibility_score)}
                      </span>
                    </td>

                    {/* Items */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs font-mono text-slate-300">{source.item_count}</span>
                    </td>

                    {/* Last Scraped */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-xs text-slate-500">{timeAgo(source.last_scraped_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          }
          title="No sources configured"
          description="Add sources in packages/core/src/config/sources.yaml and run the pipeline."
        />
      )}
    </div>
  );
}
