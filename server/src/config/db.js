import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDb() {
  if (!config.mongoUri) {
    throw new Error('MONGO_URI is not set in environment variables.');
  }

  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected.');
}
