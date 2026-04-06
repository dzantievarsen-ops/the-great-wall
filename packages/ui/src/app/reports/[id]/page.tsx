import { getReportById, getAllReports } from '@/lib/queries';
import { renderMarkdown } from '@/lib/markdown';
import { Badge } from '@/components/ui/badge';
import { formatDate, typeBadge, parseJson } from '@/lib/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = getReportById(id);

  if (!report) {
    notFound();
  }

  const includedItems = parseJson<string[]>(report.items_included);
  const itemCount = includedItems?.length ?? 0;

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-wall-400 transition-colors mb-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to reports
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Badge className={typeBadge(report.type)}>{report.type}</Badge>
          <span className="text-xs text-slate-500">{formatDate(report.generated_at)}</span>
          {itemCount > 0 && (
            <span className="text-xs text-slate-500">&middot; {itemCount} items</span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{report.title}</h1>
        {report.period_start && report.period_end && (
          <p className="text-sm text-slate-500 mt-1">
            Period: {formatDate(report.period_start)} &ndash; {formatDate(report.period_end)}
          </p>
        )}
      </div>

      {/* Markdown Content */}
      <div className="glass-static rounded-xl p-8">
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content_markdown) }}
        />
      </div>
    </div>
  );
}
