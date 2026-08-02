# TestBench

TestBench is an English-first diagnostic assessment and repair-planning product for Pakistani secondary students.

**Attempt → Mark → Understand → Rewrite → Retest**

## Current product slice

The first implementation targets FBISE Grade 10 English and includes a public landing page, a persistent five-part diagnostic, objective scoring, a protected teacher marking queue, rubric-based writing feedback and student results. The student dashboard and seven-day repair plan still use demonstration content.

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
Set `TEACHER_ACCESS_CODE` to a private random value of at least 12 characters before using the teacher workspace.

## Database workflow

```powershell
npm run db:generate
npm run db:push
```

`db:generate` creates reviewable SQL migrations. `db:push` applies the schema to the configured database. Production credentials belong in Vercel environment variables and must never be committed.

## Deployment

Import `maniharafiqkr-hue/testbench-edu-pak` into Vercel, use the standard Next.js preset, add `DATABASE_URL` and `TEACHER_ACCESS_CODE` to Development, Preview and Production, then deploy the `main` branch.
