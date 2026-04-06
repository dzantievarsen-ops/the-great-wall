import { getAllReports } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatDate, typeBadge, parseJson } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  const reports = getAllReports();

  return (
    <div>
      <PageHeader
        title="Reports"
        description={`${reports.length} generated reports`}
      />

      {reports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => {
            const includedItems = parseJson<string[]>(report.items_included);
            const itemCount = includedItems?.length ?? 0;

            return (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="glass group rounded-xl p-5 transition-all duration-200 block"
              >
                {/* Type Badge + Date */}
                <div className="flex items-center justify-between mb-3">
                  <Badge className={typeBadge(report.type)}>{report.type}</Badge>
                  <span className="text-[10px] text-slate-500">{formatDate(report.generated_at)}</span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-wall-400 transition-colors mb-2 line-clamp-2">
                  {report.title}
                </h3>

                {/* Meta Row */}
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  {itemCount > 0 && (
                    <span>{itemCount} items analyzed</span>
                  )}
                  {report.period_start && report.period_end && (
                    <span>{formatDate(report.period_start)} &ndash; {formatDate(report.period_end)}</span>
                  )}
                </div>

                {/* Preview */}
                <p className="text-xs text-slate-500 mt-3 line-clamp-3 leading-relaxed">
                  {report.content_markdown.slice(0, 200).replace(/[#*\-_]/g, '').trim()}...
                </p>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                  <div className={`h-2 w-2 rounded-full ${
                    report.type === 'emergency' ? 'bg-red-400' :
                    report.type === 'comprehensive' ? 'bg-blue-400' : 'bg-wall-400'
                  }`} />
                  <span className="text-[11px] text-wall-400 font-medium group-hover:text-wall-300 transition-colors">
                    Read report &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
          title="No reports yet"
          description="Generate a digest or comprehensive report from your analyzed items."
        />
      )}
    </div>
  );
}
