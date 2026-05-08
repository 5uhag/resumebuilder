import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/http-error.js';

function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export async function registerController(request, response, next) {
  try {
    const { email, password } = request.body ?? {};

    if (!email || !password) {
      throw new HttpError(400, 'Email and password are required.');
    }

    if (password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters.');
    }

    const existing = await User.findOne({ email });
    if (existing) {
      throw new HttpError(409, 'An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
    const token = signToken(user._id.toString());

    response.status(201).json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    next(error);
  }
}

export async function loginController(request, response, next) {
  try {
    const { email, password } = request.body ?? {};

    if (!email || !password) {
      throw new HttpError(400, 'Email and password are required.');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new HttpError(401, 'Invalid email or password.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, 'Invalid email or password.');
    }

    const token = signToken(user._id.toString());
    response.status(200).json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    next(error);
  }
}
