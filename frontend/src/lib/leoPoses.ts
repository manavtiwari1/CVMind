// Leo, the CVMind guide: one picture per mood. Pick the pose that fits the moment.
import hello from '../assets/leo/hello.webp';
import thumbs from '../assets/leo/thumbs.webp';
import cheer from '../assets/leo/cheer.webp';
import thinking from '../assets/leo/thinking.webp';
import resume from '../assets/leo/resume.webp';
import idea from '../assets/leo/idea.webp';
import linkedin from '../assets/leo/linkedin.webp';
import growth from '../assets/leo/growth.webp';
import support from '../assets/leo/support.webp';
import checklist from '../assets/leo/checklist.webp';
import typing from '../assets/leo/typing.webp';
import guide from '../assets/leo/guide.webp';

export const LEO_POSES = {
  hello,      // smiling: greetings, default
  thumbs,     // wink + thumbs up: confirmations, good choices
  cheer,      // arms up: results ready, success
  thinking,   // hand on chin: questions and choices
  resume,     // holding a resume: resume steps, uploads
  idea,       // laptop + light bulb: tips, ideas
  linkedin,   // LinkedIn tools
  growth,     // chart: scores, reports, experience
  support,    // headset + wave: interviews, help
  checklist,  // clipboard: checks, reviews, proofreading
  typing,     // laptop + heart: working, loading, writing
  guide,      // reading a guide: examples, how-it-works
} as const;

export type LeoPose = keyof typeof LEO_POSES;
