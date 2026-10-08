import mongoose from 'mongoose';

const { Schema } = mongoose;

// One document per user: what jobs the agent should look for and how it should apply
const preferencesSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  targetTitles: [String],
  seniority: [String],
  locations: [String],
  workModes: [String],
  employmentTypes: { type: [String], default: ['full_time'] },
  minSalary: { type: new Schema({ amount: Number, currency: String, period: String }, { _id: false }), default: null },
  includeIndustries: [String],
  excludeIndustries: [String],
  excludedCompanies: [String],
  workAuthorization: [new Schema({ country: String, authorized: Boolean, needsSponsorship: Boolean }, { _id: false })],
  willingToRelocate: { type: Boolean, default: false },
  noticePeriod: { type: String, default: '' },
  defaultResumeProfileId: { type: Schema.Types.ObjectId, default: null },
  applyMode: { type: String, default: 'ask' },
  minScoreToSuggest: { type: Number, default: 60 },
  dailyApplyCap: { type: Number, default: 25 },
  eeo: {
    gender: { type: String, default: 'decline' },
    race: { type: String, default: 'decline' },
    veteran: { type: String, default: 'decline' },
    disability: { type: String, default: 'decline' }
  },
  standardAnswers: [new Schema({ key: String, question: String, answer: String }, { _id: false })]
}, { timestamps: true });

const Preferences = mongoose.models.Preferences || mongoose.model('Preferences', preferencesSchema);
export default Preferences;
