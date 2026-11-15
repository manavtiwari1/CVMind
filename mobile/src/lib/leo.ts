// Leo, the CVMind guide: one picture per mood, the same set as frontend/src/lib/leoPoses.ts
export const LEO = {
  hello: require('@/assets/leo/hello.webp'),
  thumbs: require('@/assets/leo/thumbs.webp'),
  cheer: require('@/assets/leo/cheer.webp'),
  thinking: require('@/assets/leo/thinking.webp'),
  resume: require('@/assets/leo/resume.webp'),
  idea: require('@/assets/leo/idea.webp'),
  linkedin: require('@/assets/leo/linkedin.webp'),
  growth: require('@/assets/leo/growth.webp'),
  support: require('@/assets/leo/support.webp'),
  checklist: require('@/assets/leo/checklist.webp'),
  typing: require('@/assets/leo/typing.webp'),
  guide: require('@/assets/leo/guide.webp'),
} as const;

export type LeoPose = keyof typeof LEO;
