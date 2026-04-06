export function formatScore(score: number | null): string {
  if (score == null) return '\u2014';
  return score.toFixed(1);
}

export function scoreColor(score: number | null): string {
  if (score == null) return 'text-slate-500';
  if (score >= 7) return 'text-emerald-400';
  if (score >= 5) return 'text-wall-400';
  return 'text-red-400';
}

export function scoreBg(score: number | null): string {
  if (score == null) return 'bg-slate-800/60 text-slate-500';
  if (score >= 7) return 'bg-emerald-500/15 text-emerald-400';
  if (score >= 5) return 'bg-wall-500/15 text-wall-400';
  return 'bg-red-500/15 text-red-400';
}

export function priorityBg(priority: string | null): string {
  switch (priority) {
    case 'critical': return 'bg-red-500/15 text-red-400';
    case 'high': return 'bg-wall-500/15 text-wall-400';
    case 'medium': return 'bg-blue-500/15 text-blue-400';
    case 'low': return 'bg-slate-500/15 text-slate-400';
    default: return 'bg-slate-800/60 text-slate-500';
  }
}

export function typeBadge(type: string): string {
  switch (type) {
    case 'digest': return 'bg-wall-500/15 text-wall-400';
    case 'comprehensive': return 'bg-blue-500/15 text-blue-400';
    case 'emergency': return 'bg-red-500/15 text-red-400';
    case 'youtube': return 'bg-red-500/15 text-red-400';
    case 'substack': return 'bg-orange-500/15 text-orange-400';
    case 'web': return 'bg-purple-500/15 text-purple-400';
    default: return 'bg-slate-800/60 text-slate-500';
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '\u2014';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseJson<T = unknown>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '\u2026';
}
