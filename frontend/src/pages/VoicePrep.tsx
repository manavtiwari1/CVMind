import InterviewCoach, { type InterviewCoachProps } from '../components/interview/InterviewCoach';

/** Voice Prep AI: Leo asks out loud and the candidate answers by speaking. */
export default function VoicePrep(props: Omit<InterviewCoachProps, 'mode'>) {
  return <InterviewCoach mode="voice" {...props} />;
}
