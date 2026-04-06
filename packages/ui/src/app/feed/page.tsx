import { getAllItems } from '@/lib/queries';
import { FeedCard } from '@/components/feed/feed-card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

export default function FeedPage() {
  const items = getAllItems();

  return (
    <div>
      <PageHeader
        title="Feed"
        description={`${items.length} items from all sources, newest first`}
      />

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 11a9 9 0 0 1 9 9" />
              <path d="M4 4a16 16 0 0 1 16 16" />
              <circle cx="5" cy="19" r="1" />
            </svg>
          }
          title="No items in the feed"
          description="Run the pipeline to scrape and analyze content from your configured sources."
        />
      )}
    </div>
  );
}
