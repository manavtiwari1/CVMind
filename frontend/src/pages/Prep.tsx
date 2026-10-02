import InterviewCoach, { type InterviewCoachProps } from '../components/interview/InterviewCoach';

/** Interview Prep AI: Leo's mock interview, answered in writing. */
export default function Prep(props: Omit<InterviewCoachProps, 'mode'>) {
  return <InterviewCoach mode="text" {...props} />;
}
