# TestBench

TestBench is an English-first diagnostic assessment and repair-planning product for Pakistani secondary students.

**Attempt → Mark → Understand → Rewrite → Retest**

## Current product slice

The first implementation targets FBISE Grade 10 English and includes a public landing page, student dashboard, five-part diagnostic, results, seven-day repair plan and teacher marking queue.

The screens currently use demonstration data while the real student, scoring and teacher-review workflows are built.

## Technology

- Next.js App Router and TypeScript
- Vercel deployment from the `main` GitHub branch
- Neon PostgreSQL
- Drizzle ORM and generated SQL migrations

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Replace the placeholder `DATABASE_URL` in `.env.local` with a Neon pooled connection string before running database commands.

## Database workflow

```powershell
npm run db:generate
npm run db:push
```

`db:generate` creates reviewable SQL migrations. `db:push` applies the schema to the configured database. Production credentials belong in Vercel environment variables and must never be committed.

## Deployment

Import `maniharafiqkr-hue/testbench-edu-pak` into Vercel, use the standard Next.js preset, add `DATABASE_URL` to Development, Preview and Production, then deploy the `main` branch.
