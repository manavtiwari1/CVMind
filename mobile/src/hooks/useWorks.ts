import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/session';
import { listWorks } from '@/lib/works';

/** The signed-in account's saved works (My Documents), cached for the Docs tab and the viewer */
export function useWorks() {
  const { user } = useSession();
  return useQuery({ queryKey: ['works', user?.id], queryFn: () => listWorks(user!.id), enabled: !!user?.id });
}
