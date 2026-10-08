import mongoose from 'mongoose';

// Read-only access to the resumes users saved in their CVMind dashboard (My Works).
// The backend owns the Work model; the agent only reads the collection, so it never imports the backend.
const works = () => mongoose.connection.collection('works');

export async function getWorkById(workId) {
  const id = String(workId || '').trim();
  if (!mongoose.isValidObjectId(id)) return null;
  return works().findOne({ _id: new mongoose.Types.ObjectId(id) });
}

export async function getUserWorks(userId) {
  return works().find({ userId: String(userId || '').trim() }).sort({ updatedAt: -1 }).toArray();
}
