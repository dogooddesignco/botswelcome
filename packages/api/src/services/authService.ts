import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { env } from '../config/env';
import type { JwtPayload } from '../config/auth';
import type { RegisterInput, LoginInput, User, UserPublic } from '@botswelcome/shared';
import { AppError } from '../middleware/errorHandler';
import { emailService } from './emailService';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

const PUBLIC_USER_COLUMNS = [
  'id',
  'username',
  'display_name',
  'bio',
  'avatar_url',
  'is_bot',
  'verification_tier',
  'created_at',
  'last_active_at',
] as const;

const SAFE_USER_COLUMNS = [
  ...PUBLIC_USER_COLUMNS,
  'email',
  'updated_at',
  'is_deleted',
  'public_key',
] as const;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponse {
  user: Omit<User, 'is_deleted'>;
  tokens: AuthTokens;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse & { email_verification_required: boolean }> {
    // Check for existing user with same email
    const existingEmail = await db('users').where({ email: input.email }).first();
    if (existingEmail) {
      throw AppError.conflict('An account with this email already exists');
    }

    // Check for existing user with same username
    const existingUsername = await db('users').where({ username: input.username }).first();
    if (existingUsername) {
      throw AppError.conflict('This username is already taken');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(48).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    const [user] = await db('users')
      .insert({
        username: input.username,
        email: input.email,
        password_hash: passwordHash,
        verification_tier: 1,
        is_bot: false,
        is_deleted: false,
        email_verified: false,
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires,
      })
      .returning([...SAFE_USER_COLUMNS]);

    // Send verification email (non-blocking — don't fail registration if email fails)
    emailService
      .sendVerificationEmail(input.email, input.username, verificationToken)
      .catch((err) => console.error('[auth] Verification email failed:', err));

    const tokens = await this.generateTokenPair(user.id);

    const { is_deleted: _, ...safeUser } = user;
    return { user: safeUser, tokens, email_verification_required: true };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await db('users')
      .where({ email: input.email, is_deleted: false })
      .first();

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isValid = await bcrypt.compare(input.password, user.password_hash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.email_verified) {
      throw AppError.forbidden('Please verify your email before logging in. Check your inbox for a verification link.');
    }

    // Update last_active_at
    await db('users').where({ id: user.id }).update({ last_active_at: db.fn.now() });

    const tokens = await this.generateTokenPair(user.id);

    const { password_hash: _ph, is_deleted: _d, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const stored = await db('refresh_tokens')
      .where({ token: refreshToken, revoked: false })
      .where('expires_at', '>', db.fn.now())
      .first();

    if (!stored) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    // Verify the user still exists and is active
    const user = await db('users')
      .where({ id: stored.user_id, is_deleted: false })
      .first();

    if (!user) {
      throw AppError.unauthorized('User account no longer active');
    }

    // Revoke the old refresh token (rotation)
    await db('refresh_tokens')
      .where({ id: stored.id })
      .update({ revoked: true });

    // Issue new token pair
    return this.generateTokenPair(user.id);
  }

  async logout(refreshToken: string): Promise<void> {
    const result = await db('refresh_tokens')
      .where({ token: refreshToken, revoked: false })
      .update({ revoked: true });

    // Silently succeed even if token not found -- idempotent logout
    return;
  }

  async logoutAll(userId: string): Promise<void> {
    await db('refresh_tokens')
      .where({ user_id: userId, revoked: false })
      .update({ revoked: true });
  }

  async getCurrentUser(userId: string): Promise<Omit<User, 'is_deleted'> | null> {
    const user = await db('users')
      .select([...SAFE_USER_COLUMNS])
      .where({ id: userId, is_deleted: false })
      .first();

    if (!user) return null;

    const { is_deleted: _, ...safeUser } = user;
    return safeUser;
  }

  async getPublicProfile(username: string): Promise<UserPublic | null> {
    const user = await db('users')
      .select([...PUBLIC_USER_COLUMNS])
      .where({ username, is_deleted: false })
      .first();

    return user || null;
  }

  async updateProfile(
    userId: string,
    updates: { display_name?: string | null; bio?: string | null; avatar_url?: string | null }
  ): Promise<Omit<User, 'is_deleted'>> {
    // Filter out undefined values so we only update provided fields
    const cleanUpdates: Record<string, unknown> = {};
    if (updates.display_name !== undefined) cleanUpdates.display_name = updates.display_name;
    if (updates.bio !== undefined) cleanUpdates.bio = updates.bio;
    if (updates.avatar_url !== undefined) cleanUpdates.avatar_url = updates.avatar_url;

    if (Object.keys(cleanUpdates).length === 0) {
      const user = await this.getCurrentUser(userId);
      if (!user) throw AppError.notFound('User not found');
      return user;
    }

    cleanUpdates.updated_at = db.fn.now();

    const [user] = await db('users')
      .where({ id: userId, is_deleted: false })
      .update(cleanUpdates)
      .returning([...SAFE_USER_COLUMNS]);

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const { is_deleted: _, ...safeUser } = user;
    return safeUser;
  }

  generateAccessToken(userId: string, username: string, isBot: boolean): string {
    const payload: JwtPayload = {
      sub: userId,
      username,
      is_bot: isBot,
    };
    return jwt.sign(payload, env.jwt.secret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    } as jwt.SignOptions);
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await db('refresh_tokens').insert({
      user_id: userId,
      token,
      expires_at: expiresAt,
      revoked: false,
    });

    return token;
  }

  private async generateTokenPair(userId: string): Promise<AuthTokens> {
    const user = await db('users')
      .select('id', 'username', 'is_bot')
      .where({ id: userId })
      .first();

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const accessToken = this.generateAccessToken(user.id, user.username, user.is_bot);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes in seconds
    };
  }

  async verifyEmail(token: string): Promise<{ user: Omit<User, 'is_deleted'>; tokens: AuthTokens }> {
    const user = await db('users')
      .where({ email_verification_token: token, is_deleted: false })
      .first();

    if (!user) {
      throw AppError.badRequest('Invalid verification link');
    }

    if (user.email_verified) {
      throw AppError.badRequest('Email is already verified');
    }

    if (new Date(user.email_verification_expires) < new Date()) {
      throw AppError.badRequest('Verification link has expired. Please request a new one.');
    }

    await db('users').where({ id: user.id }).update({
      email_verified: true,
      email_verification_token: null,
      email_verification_expires: null,
      updated_at: db.fn.now(),
    });

    const tokens = await this.generateTokenPair(user.id);
    const { password_hash: _ph, is_deleted: _d, email_verification_token: _t, email_verification_expires: _e, ...safeUser } = user;
    safeUser.email_verified = true;
    return { user: safeUser, tokens };
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await db('users')
      .where({ email, is_deleted: false })
      .first();

    if (!user || user.email_verified) {
      // Don't reveal whether email exists
      return;
    }

    const newToken = crypto.randomBytes(48).toString('hex');
    const newExpires = new Date();
    newExpires.setHours(newExpires.getHours() + 24);

    await db('users').where({ id: user.id }).update({
      email_verification_token: newToken,
      email_verification_expires: newExpires,
    });

    await emailService.sendVerificationEmail(email, user.username, newToken);
  }

  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
      return payload;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
