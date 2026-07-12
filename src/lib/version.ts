// Single source of truth for the app's user-facing version.
// Bump this (minor by default) in the same commit you tag a GitHub release,
// e.g. 0.1 -> 0.2. The release tag (v0.2) drives the published Docker image
// tags, and this constant drives what the admin view shows.
export const APP_VERSION = '0.1';
