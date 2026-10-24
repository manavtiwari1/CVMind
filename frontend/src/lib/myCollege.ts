import { API_BASE } from './apiBase';
import { authFetch } from './authFetch';

// The college a student is linked to on the placements portal, with its reviews of their resumes
export interface MyCollege {
  college: { name: string; logo: string; proActive: boolean; endsAt: string | null; joinedAt: string | null };
  reviews: Array<{
    workId: string;
    title: string;
    state: 'approved' | 'changes_requested' | 'stale' | 'not_reviewed';
    reviewerName: string;
    reviewedAt: string;
    comments: Array<{ byName: string; text: string; at: string }>;
  }>;
}

export async function fetchMyCollege(): Promise<MyCollege | null> {
  const res = await authFetch(`${API_BASE}/api/user/college`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not load your college.');
  return data.college ? { college: data.college, reviews: data.reviews || [] } : null;
}
