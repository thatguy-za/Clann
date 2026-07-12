# Clann

Clann is a lightweight, self-hosted family-tree app with a modern UI. Admins
build and edit the tree; viewers browse it read-only. Runs as a single container
backed by a single SQLite file — easy to host and back up.

- **Stack:** SvelteKit (`adapter-node`) · SQLite via Drizzle ORM (`better-sqlite3`) · hand-rolled cookie sessions (scrypt password hashing)
- **Tree layout:** [`relatives-tree`](https://github.com/SanichKotikov/relatives-tree)
- **Data:** people with sex, birth/death dates, occupation, biography, multiple photos, and life events; parent–child and spouse relationships (siblings derived automatically)

## First run

There is **no seeded admin account**. On first boot the app has zero users and
redirects every request to `/setup`, where you create the first administrator
(username + password). Once that account exists, `/setup` locks itself off and
everyone else signs in at `/login`. Admins can create further admin/viewer
accounts under **Manage → User accounts**.

## Run with Docker (recommended)

```sh
docker compose up -d
```

Then open http://localhost:3000 and complete first-run setup.

Data (the SQLite database + uploaded photos) persists in the `clann_data`
volume. Edit `docker-compose.yml` to change the port or set `ORIGIN`.

> **Set `ORIGIN` in production.** SvelteKit validates the request `Origin`
> against it on form submissions. Use the exact URL users visit, e.g.
> `ORIGIN=https://tree.example.com`. Session cookies are marked `Secure`
> automatically when `ORIGIN` is `https://…`, and left non-secure for plain
> HTTP so LAN/HTTP deployments still work.

### Multi-arch image (amd64 + arm64)

```sh
docker buildx create --use            # once
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t youruser/clann:latest --push .
```

The image is based on `node:22-bookworm-slim` (glibc) so `better-sqlite3` uses
its prebuilt binary rather than compiling from source.

## Local development

```sh
npm install
npm run dev
```

The dev server auto-creates `data/app.db` and applies migrations on boot.

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Type-check | `npm run check` |
| Production build | `npm run build` then `node build` |
| Generate a migration after schema edits | `npm run db:generate` |
| Browse the DB | `npm run db:studio` |

### Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `data/app.db` | SQLite file location |
| `UPLOAD_DIR` | `data/uploads` | Uploaded photo storage |
| `PORT` | `3000` | HTTP port (production) |
| `ORIGIN` | — | Public URL; required in production behind a proxy |

Migrations live in `./drizzle` and are applied automatically on server start
(`src/hooks.server.ts`). After changing `src/lib/server/schema.ts`, run
`npm run db:generate` and commit the new migration.
