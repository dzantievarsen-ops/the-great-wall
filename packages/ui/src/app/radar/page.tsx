import { getRadarItems } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ScorePill } from '@/components/ui/score-pill';
import { formatScore, scoreColor, scoreBg, timeAgo, parseJson, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface ProjectMapping {
  project: string;
  relevance: number;
  reason?: string;
}

export default function RadarPage() {
  const items = getRadarItems();

  // Group items by project
  const projectMap = new Map<string, typeof items>();
  for (const item of items) {
    const mappings = parseJson<ProjectMapping[]>(item.project_mappings) ?? [];
    for (const mapping of mappings) {
      const name = mapping.project;
      if (!projectMap.has(name)) projectMap.set(name, []);
      projectMap.get(name)!.push(item);
    }
  }

  // Sort projects by total item count descending
  const projects = [...projectMap.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div>
      <PageHeader
        title="Radar"
        description={`${items.length} items mapped across ${projects.length} Voyager projects`}
      />

      {projects.length > 0 ? (
        <div className="space-y-8">
          {projects.map(([projectName, projectItems]) => (
            <section key={projectName}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-100">{projectName}</h2>
                <span className="rounded-full bg-wall-500/15 px-2.5 py-0.5 text-xs font-medium text-wall-400">
                  {projectItems.length} item{projectItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2">
                {projectItems.slice(0, 10).map((item) => {
                  const mappings = parseJson<ProjectMapping[]>(item.project_mappings) ?? [];
                  const thisMapping = mappings.find((m) => m.project === projectName);

                  return (
                    <div
                      key={`${projectName}-${item.id}`}
                      className="glass-static flex items-center gap-4 rounded-lg px-4 py-3"
                    >
                      {/* Composite score */}
                      <div className={`text-lg font-bold tabular-nums ${scoreColor(item.composite_score)}`}>
                        {formatScore(item.composite_score)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-200 hover:text-wall-400 transition-colors truncate block"
                        >
                          {item.title}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{item.source_name}</span>
                          <span className="text-slate-700">&middot;</span>
                          <span className="text-xs text-slate-500">{timeAgo(item.scraped_at)}</span>
                          {thisMapping?.reason && (
                            <>
                              <span className="text-slate-700">&middot;</span>
                              <span className="text-xs text-slate-500 italic">
                                {truncate(thisMapping.reason, 60)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Relevance score for this project */}
                      <ScorePill label="REL" score={thisMapping?.relevance ?? item.voyager_relevance_score} />
                    </div>
                  );
                })}

                {projectItems.length > 10 && (
                  <p className="text-xs text-slate-500 pl-4">
                    +{projectItems.length - 10} more items
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
              <line x1="12" y1="2" x2="12" y2="6" />
            </svg>
          }
          title="No project-mapped items yet"
          description="Run the pipeline so The Watchman can map items to your Voyager projects."
        />
      )}
    </div>
  );
}
