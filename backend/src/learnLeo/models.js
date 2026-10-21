import mongoose from 'mongoose';

// Learn with Leo: a lesson is a plan plus 4–8 beats (narration + board elements). Beats are stored
// on their own so a lesson can stream, resume and replay beat by beat without new AI calls.

const { Schema } = mongoose;
const model = (name, schema, collection) => mongoose.models[name] || mongoose.model(name, schema, collection);

const planStepSchema = new Schema({
  title: { type: String, required: true },
  goal: { type: String, default: '' }
}, { _id: false });

const lessonSchema = new Schema({
  userId: { type: String, required: true },
  topic: { type: String, required: true },
  topicSlug: { type: String, default: '' },
  // set when the topic is in the launch catalogue, so finished lessons can be cached for everyone
  catalogue: { type: Boolean, default: false },
  language: { type: String, enum: ['hinglish', 'english'], default: 'english' },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  role: { type: String, default: '' },
  skills: { type: [String], default: [] },
  plan: { type: [planStepSchema], default: [] },
  planEdited: { type: Boolean, default: false },
  status: { type: String, enum: ['planning', 'streaming', 'ready', 'failed'], default: 'planning' },
  source: { type: String, enum: ['skill_gap', 'dsa_problem', 'manual'], default: 'manual' },
  skillGapId: { type: String, default: '' },
  // DSA lessons: the problem, and the user's code and failing test at the time they asked
  problemId: { type: String, default: '' },
  problemContext: {
    language: { type: String, default: '' },
    code: { type: String, default: '' },
    failingTest: { type: Schema.Types.Mixed, default: null }
  },
  // the cached lesson this one was copied from, if any
  copiedFrom: { type: Schema.Types.ObjectId, default: null },
  startedAt: { type: Date, default: null },
  summary: { type: String, default: '' },
  beatCount: { type: Number, default: 0 },
  failReason: { type: String, default: '' },
  // a stream holds this lease while it generates beats, so two connections never write the same beat
  genLockUntil: { type: Date, default: null },
  costTokens: { type: Number, default: 0 }
}, { timestamps: true });
lessonSchema.index({ userId: 1, createdAt: -1 });
export const LeoLesson = model('LeoLesson', lessonSchema, 'leo_lessons');

const beatSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, required: true },
  order: { type: Number, required: true },
  // 'reexplain' beats follow a wrong checkpoint answer; 'approach' is the DSA "show full approach" beat
  kind: { type: String, enum: ['main', 'reexplain', 'approach'], default: 'main' },
  title: { type: String, default: '' },
  narration: { type: String, required: true },
  elements: { type: [Schema.Types.Mixed], default: [] },
  // filled once vendor TTS is added; browser speech needs neither
  audioUrl: { type: String, default: null },
  wordTimings: { type: [Schema.Types.Mixed], default: null },
  durationMs: { type: Number, default: 0 },
  reports: {
    type: [{ userId: String, note: String, at: { type: Date, default: Date.now }, _id: false }],
    default: []
  }
}, { timestamps: true });
beatSchema.index({ lessonId: 1, order: 1, kind: 1 }, { unique: true });
export const LeoBeat = model('LeoBeat', beatSchema, 'leo_beats');

const progressSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, required: true, unique: true },
  userId: { type: String, required: true },
  lastBeat: { type: Number, default: 0 },
  checkpointAnswers: {
    type: [{ beatOrder: Number, chosen: Number, correct: Boolean, at: { type: Date, default: Date.now }, _id: false }],
    default: []
  },
  completedAt: { type: Date, default: null },
  // "Practice this in Interview Prep" clicked: the loop-conversion metric
  prepClickedAt: { type: Date, default: null }
}, { timestamps: true });
export const LeoProgress = model('LeoProgress', progressSchema, 'leo_progress');

const cacheSchema = new Schema({
  topicSlug: { type: String, required: true },
  language: { type: String, required: true },
  level: { type: String, required: true },
  lessonId: { type: Schema.Types.ObjectId, required: true },
  hits: { type: Number, default: 0 }
}, { timestamps: true });
cacheSchema.index({ topicSlug: 1, language: 1, level: 1 }, { unique: true });
export const LeoCache = model('LeoCache', cacheSchema, 'leo_cache');

export const LEARN_LEO_MODELS = [LeoLesson, LeoBeat, LeoProgress, LeoCache];
