# YUKUN

A gentle, English-language journaling website for meals, movement, mood, cycle notes, and optional weight. This repository contains the deployable **adult, browser-local preview** of the wider YUKUN product.

![YUKUN public homepage](docs/screenshots/home.png)

## What works in this preview

- Anonymous dated journal: add, edit, delete, and undo entries for meals, movement, mood, cycle, and notes.
- One optional weight value per day, with a chart of recorded points and neutral calendar and Insights views.
- Meal photo stickers. Users write their own food names and may enter calories manually; the app does not identify food or estimate calories.
- Companion room, naming, and Light Seeds earned from qualifying journal activity.
- Structured “Help me pause” choices and a JSON export of local records and photos.
- Responsive desktop and mobile browser layouts.

![YUKUN My Day preview with example entries](docs/screenshots/my-day.png)

**Preview boundary:** Records and photos are stored in the visitor’s browser with IndexedDB. Clearing site data or switching devices can remove them. There is no account, cloud sync, AI plan generation, payment, youth journal, or clinical service in this release. Those routes describe availability rather than pretending to complete an action. The private journal in this development preview requires an adult self-declaration; this is not a production age-verification system.

## Run locally

Requires Node.js 22.12 or later.

```bash
npm ci
npm run dev
```

Run the quality checks:

```bash
npm run lint
npm test
npm run build
```

`npm run build` writes a static site to `dist/`.

## Deploy to Vercel

Import this repository as a Vercel project. Use the repository root as the project root. Vercel can detect Vite; the build command is `npm run build` and the output directory is `dist`. No environment variables are needed for this browser-local preview. `vercel.json` rewrites deep links such as `/my-day` and `/calendar` to the app entry point, so a refreshed page still opens.

This preview is marked `noindex, nofollow`. Keep it labelled as a preview when sharing it. Before opening a public health product, the planned account, AI, youth, privacy, clinical, and payment flows need their own implementation and review.

## Engineering notes

- React 19, TypeScript, Vite, IndexedDB, Vitest, and GitHub Actions CI.
- `src/domain.ts` owns journal invariants and Light Seed rules; `src/storage.ts` owns local persistence and export.
- No user data is sent to a server by this preview. Uploaded photos remain local to the browser until the user explicitly downloads an export.
- Source code and the generated visual assets in `public/assets/` are versioned here. Demo entries in screenshots are examples, not user data.
