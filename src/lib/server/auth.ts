import {
	randomBytes,
	scrypt as scryptCb,
	timingSafeEqual,
	createHash
} from 'node:crypto';
import { promisify } from 'node:util';
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

// Whether the ORIGIN env (if set) forces HTTPS. Kept as a manual override.
const originIsHttps = (env.ORIGIN ?? '').startsWith('https://');

// Only mark the cookie Secure when the request actually arrived over HTTPS,
// so self-hosted deployments work on any host/port/proxy without config:
//   - Direct HTTP (LAN, Raspberry Pi, custom port): no x-forwarded-proto -> not
//     Secure, so the browser keeps the cookie.
//   - Behind an HTTPS reverse proxy: the proxy sets x-forwarded-proto=https
//     (Caddy/Nginx/Traefik do by default) -> Secure.
// A Secure cookie is dropped by browsers over plain HTTP, which is exactly the
// silent-login failure we want to avoid on LAN deployments.
function requestIsHttps(request: Request): boolean {
	const forwarded = request.headers.get('x-forwarded-proto');
	if (forwarded) return forwarded.split(',')[0].trim().toLowerCase() === 'https';
	return false;
}

export function setSessionCookie(
	cookies: Cookies,
	token: string,
	expiresAt: Date,
	request: Request
) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: originIsHttps || requestIsHttps(request),
		expires: expiresAt
	});
}

export function deleteSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
