import { searchItems } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { formatScore, scoreBg, typeBadge, timeAgo, truncate, parseTags } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query ? searchItems(query) : [];

  return (
    <div>
      <PageHeader
        title="Search"
        description="Search across all intelligence items"
      />

      {/* Search Form */}
      <form action="/search" method="GET" className="mb-8">
        <div className="relative max-w-2xl">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search items by title, summary, or tags..."
            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] pl-12 pr-4 py-3.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-wall-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-wall-500/20"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-wall-600/80 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-wall-500"
          >
            Search
          </button>
        </div>
      </form>

      {/* Results */}
      {query && (
        <div className="mb-4">
          <p className="text-xs text-slate-500">
            {results.length} result{results.length !== 1 ? 's' : ''} for <span className="text-wall-400 font-medium">&ldquo;{query}&rdquo;</span>
          </p>
        </div>
      )}

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((item) => {
            const tags = parseTags(item.watchman_tags);
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass group flex items-start gap-4 rounded-xl p-4 transition-all duration-200 block"
              >
                {/* Score */}
                {item.composite_score != null && (
                  <div className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg font-mono font-bold text-sm ${scoreBg(item.composite_score)}`}>
                    {formatScore(item.composite_score)}
                  </div>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-wall-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  {item.content_summary && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {truncate(item.content_summary, 200)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {item.source_name && (
                      <span className="text-[10px] text-slate-400 font-medium">{item.source_name}</span>
                    )}
                    {item.source_type && (
                      <Badge className={typeBadge(item.source_type)}>{item.source_type}</Badge>
                    )}
                    <span className="text-[10px] text-slate-600">&middot;</span>
                    <span className="text-[10px] text-slate-500">{timeAgo(item.scraped_at)}</span>
                    {tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center rounded-md bg-slate-800/60 px-1.5 py-0.5 text-[9px] text-slate-500 ring-1 ring-inset ring-slate-700/30">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-slate-600 group-hover:text-wall-400 transition-colors mt-1">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            );
          })}
        </div>
      ) : query ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-slate-500">No results found for this query.</p>
          <p className="text-xs text-slate-600 mt-1">Try broader search terms or check the feed for all items.</p>
        </div>
      ) : null}
    </div>
  );
}
