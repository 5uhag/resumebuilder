import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, default: 'Untitled Resume' },
    resumeData: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const Resume = mongoose.model('Resume', resumeSchema);
