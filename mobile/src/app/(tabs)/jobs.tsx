import { ComingNext } from '@/components/ComingNext';

export default function JobsTab() {
  return (
    <ComingNext
      title="Jobs"
      pose="growth"
      subtitle="Real jobs, matched to your resume"
      points={['A daily feed of jobs that fit your profile', 'Job alerts and referral messages', 'Your apply log, the same as on cvmind.in']}
    />
  );
}
