import { api } from '../api';
import type { Meeting } from '../api';
import { go, useTeam } from '../store';

// Starts a meeting in a channel or DM (or joins the one already running there) and opens it
export function useStartMeeting() {
  const { toast } = useTeam();
  return async (channelId: string) => {
    try {
      const { data } = await api<{ data: Meeting }>('/meetings', { method: 'POST', body: { channelId } });
      go('meet', data.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not start a meeting.', 'error');
    }
  };
}
