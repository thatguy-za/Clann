import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// --- Auth ---------------------------------------------------------------

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'viewer'] })
		.notNull()
		.default('viewer'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const sessions = sqliteTable('sessions', {
	// id is the SHA-256 hash of the token; the raw token lives only in the cookie.
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// --- Family data --------------------------------------------------------

// Dates are stored as free text to allow partial/approximate genealogical
// values (e.g. "1850", "1850-03", "abt 1850").
export const people = sqliteTable('people', {
	id: text('id').primaryKey(),
	givenName: text('given_name').notNull(),
	familyName: text('family_name'),
	// Nullable: an unknown/blank sex is allowed (e.g. from a GEDCOM import).
	sex: text('sex', { enum: ['male', 'female'] }),
	birthDate: text('birth_date'),
	deathDate: text('death_date'),
	causeOfDeath: text('cause_of_death'),
	occupation: text('occupation'),
	// Alternate names (married, former, nickname, title) as a free-text list.
	otherNames: text('other_names'),
	bio: text('bio'),
	// Aggregated source citations (imported from GEDCOM), free text.
	sources: text('sources'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// A single generic edge table.
//   type 'parent-child' : fromId = parent, toId = child
//   type 'spouse'       : fromId / toId order is irrelevant
// `kind` maps to relatives-tree RelType. Siblings are derived from shared
// parents in buildGraph, so they are not stored here.
export const relationships = sqliteTable('relationships', {
	id: text('id').primaryKey(),
	type: text('type', { enum: ['parent-child', 'spouse'] }).notNull(),
	fromId: text('from_id')
		.notNull()
		.references(() => people.id, { onDelete: 'cascade' }),
	toId: text('to_id')
		.notNull()
		.references(() => people.id, { onDelete: 'cascade' }),
	kind: text('kind', { enum: ['blood', 'married', 'divorced', 'adopted', 'half'] })
		.notNull()
		.default('blood'),
	// For spouse relationships: marriage date/place (free text like other dates).
	date: text('date'),
	place: text('place')
});

export const lifeEvents = sqliteTable('life_events', {
	id: text('id').primaryKey(),
	personId: text('person_id')
		.notNull()
		.references(() => people.id, { onDelete: 'cascade' }),
	type: text('type').notNull(),
	date: text('date'),
	place: text('place'),
	description: text('description')
});

export const photos = sqliteTable('photos', {
	id: text('id').primaryKey(),
	personId: text('person_id')
		.notNull()
		.references(() => people.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false)
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Relationship = typeof relationships.$inferSelect;
export type LifeEvent = typeof lifeEvents.$inferSelect;
export type Photo = typeof photos.$inferSelect;
