import type { FeedItem } from '@/lib/queries';
import { ScorePill } from '@/components/ui/score-pill';
import { Badge } from '@/components/ui/badge';
import { timeAgo, truncate, parseTags, typeBadge } from '@/lib/utils';

interface FeedCardProps {
  item: FeedItem;
}

export function FeedCard({ item }: FeedCardProps) {
  const tags = parseTags(item.watchman_tags);

  return (
    <article className="glass rounded-xl p-5 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-slate-100 hover:text-wall-400 transition-colors leading-snug line-clamp-2"
          >
            {item.title}
          </a>
          <div className="flex items-center gap-2 mt-1.5">
            {item.source_name && (
              <span className="text-xs text-slate-400 font-medium">{item.source_name}</span>
            )}
            {item.source_type && (
              <Badge className={typeBadge(item.source_type)}>{item.source_type}</Badge>
            )}
            {item.source_category && (
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{item.source_category}</span>
            )}
            <span className="text-[10px] text-slate-600">&middot;</span>
            <span className="text-[10px] text-slate-500">{timeAgo(item.scraped_at)}</span>
          </div>
        </div>

        {/* Composite Score (large) */}
        {item.composite_score != null && (
          <div className={`flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-xl font-mono font-bold text-sm ${
            item.composite_score >= 7
              ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
              : item.composite_score >= 5
              ? 'bg-wall-500/15 text-wall-400 ring-1 ring-wall-500/20'
              : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
          }`}>
            {item.composite_score.toFixed(1)}
          </div>
        )}
      </div>

      {/* Summary */}
      {item.content_summary && (
        <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-3">
          {truncate(item.content_summary, 300)}
        </p>
      )}

      {/* Score Pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <ScorePill label="SIG" score={item.significance_score} />
        <ScorePill label="REL" score={item.voyager_relevance_score} />
        <ScorePill label="ACT" score={item.actionability_score} />
        <ScorePill label="THR" score={item.threat_score} />
        {item.confidence && (
          <Badge className={
            item.confidence === 'high' ? 'bg-emerald-500/15 text-emerald-400' :
            item.confidence === 'medium' ? 'bg-wall-500/15 text-wall-400' :
            'bg-slate-500/15 text-slate-400'
          }>
            {item.confidence}
          </Badge>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-inset ring-slate-700/40"
            >
              {tag}
            </span>
          ))}
          {tags.length > 6 && (
            <span className="text-[10px] text-slate-500 self-center">+{tags.length - 6} more</span>
          )}
        </div>
      )}

      {/* Bottom bar */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          {item.is_bookmarked && (
            <span className="text-wall-400 text-xs" title="Bookmarked">&#9733;</span>
          )}
          {item.user_rating != null && (
            <span className="text-xs text-slate-500">
              Rating: <span className="text-wall-400 font-mono">{item.user_rating}/5</span>
            </span>
          )}
          <span className={`text-[10px] uppercase tracking-wider font-medium ${
            item.status === 'analyzed' ? 'text-emerald-500' :
            item.status === 'scraped' ? 'text-slate-500' : 'text-wall-500'
          }`}>
            {item.status}
          </span>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-wall-400 hover:text-wall-300 transition-colors font-medium"
        >
          Open &rarr;
        </a>
      </div>
    </article>
  );
}
