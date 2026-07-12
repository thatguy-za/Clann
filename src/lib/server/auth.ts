import {
	randomBytes,
	scrypt as scryptCb,
	timingSafeEqual,
	createHash
} from 'node:crypto';
import { promisify } from 'node:util';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { sessions, users, type User } from './schema';

const scrypt = promisify(scryptCb);
const KEYLEN = 64;

// --- Passwords (scrypt, no native module) -------------------------------

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
	return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [salt, hashHex] = stored.split(':');
	if (!salt || !hashHex) return false;
	const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
	const hashBuf = Buffer.from(hashHex, 'hex');
	return hashBuf.length === derived.length && timingSafeEqual(hashBuf, derived);
}

// --- Sessions -----------------------------------------------------------

export const SESSION_COOKIE = 'session';
const DAY = 1000 * 60 * 60 * 24;
const SESSION_TTL = 30 * DAY;
const RENEW_WITHIN = 15 * DAY;

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
	return randomBytes(24).toString('base64url');
}

export async function createSession(token: string, userId: string) {
	const id = hashToken(token);
	const expiresAt = new Date(Date.now() + SESSION_TTL);
	await db.insert(sessions).values({ id, userId, expiresAt });
	return { id, userId, expiresAt };
}

export type SessionValidation =
	| { session: null; user: null }
	| { session: { id: string; expiresAt: Date }; user: Omit<User, 'passwordHash'> };

export async function validateSessionToken(token: string): Promise<SessionValidation> {
	const id = hashToken(token);
	const row = db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id))
		.get();

	if (!row) return { session: null, user: null };

	// Expired -> delete and reject.
	if (Date.now() >= row.session.expiresAt.getTime()) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return { session: null, user: null };
	}

	// Sliding expiry: extend when past the renewal threshold.
	let expiresAt = row.session.expiresAt;
	if (Date.now() >= row.session.expiresAt.getTime() - RENEW_WITHIN) {
		expiresAt = new Date(Date.now() + SESSION_TTL);
		await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
	}

	const { passwordHash: _omit, ...user } = row.user;
	return { session: { id, expiresAt }, user };
}

export async function invalidateSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// --- Cookie helpers -----------------------------------------------------

// Only mark the cookie Secure when actually served over HTTPS, so self-hosted
// HTTP deployments (LAN, Raspberry Pi) still work. Derived from ORIGIN.
const origin = env.ORIGIN ?? '';
const secureCookies = origin ? origin.startsWith('https://') : !dev;

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: secureCookies,
		expires: expiresAt
	});
}

export function deleteSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
