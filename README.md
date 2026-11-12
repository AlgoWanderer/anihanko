# AniHanko

A frontend-only anime database. Browse top anime, seasonal lineups and genres, search with filters, and view details for any title. Data comes from the free [AniList GraphQL API](https://docs.anilist.co).

**Stack:** Vite · React · TypeScript · Tailwind CSS · React Router · TanStack Query

## Run it

```bash
npm install     # first time only
npm run dev     # open http://localhost:5173
```

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Check the code for problems |
| `npm run search-index` | Refresh `public/search-index.json` (takes ~4 min, see below) |

## Pages

| URL | Page |
|---|---|
| `/` | Home: trending, this season, all-time popular, coming soon |
| `/search?q=&genre=&tag=&format=&status=&year=&sort=` | Search with filters (all stored in the URL) |
| `/anime/:id` | Anime details (AniList id): stats, synopsis, trailer, tags, characters, related anime, recommendations |
| `/top?filter=` | Top 100 (highest rated / airing / upcoming / popular / favorites) |
| `/season` and `/season/:year/:season` | Seasonal anime |
| `/genres` | Genres, plus tags grouped into demographics, themes and settings |
| `/schedule?week=&day=` | Weekly airing schedule with countdowns (your time zone) |
| `/studio/:id` | Everything a studio has made |
| `/person/:id` | A voice actor's profile and voice roles |
| `/character/:id` | A character's profile, the anime they appear in, and who voiced them |
| `/tonight?time=&mood=&era=` | "What should I watch tonight?": 3 questions, 3 random picks (shareable link) |
| `/year/:year` | Year in anime: top shows, top genres and busiest studios of any year since 1970 |
| `/stamps` | Stamp book: every anime you've stamped as watched, with totals and backup/restore |

The anime page also has: a **Stamp as watched** button (red 済 stamp), a **watch-time calculator**, the **full watch order** of the franchise, and **opening & ending songs**. The home page shows **character birthdays** for today.

## How the code is organized

`scripts/build-search-index.mjs` builds the search suggestion list (see below); it's not part of the app itself.

```
src/
  api/anilist.ts       Every GraphQL request to AniList (plus a rate-limit queue)
  types/anime.ts       TypeScript shapes of the API data
  hooks/useAnime.ts    TanStack Query hooks used by pages (caching, loading states)
  lib/utils.ts         Small helpers (season math, scores, dates, titles)
  lib/localSearch.ts   Instant title matching for search suggestions
  index.css            Color tokens (paper, ink, accent...) for light and dark mode
  components/          Reusable UI: Layout (navbar/footer), AnimeCard, AnimeGrid,
                       Pagination, Section, ErrorMessage, ThemeToggle,
                       SearchBox (navbar search + suggestions), RandomButton
  pages/               One file per page
  App.tsx              Routes (URL → page) and the QueryClient
  main.tsx             Entry point
```

**Fast page loads:** anime links use `components/AnimeLink.tsx`. When you rest the mouse on one (or touch it on a phone), the anime's data starts loading in the background, so its page usually opens instantly. Images use `components/FadeImage.tsx` to fade in smoothly once loaded.

**How data flows:** a page calls a hook (e.g. `useTopAnime`) → the hook calls a function in `api/anilist.ts` → that function sends a GraphQL query to AniList → TanStack Query caches the result and gives the page `data`, `isPending` and `isError`.

**Where to start reading:** `App.tsx` → `pages/HomePage.tsx` → `hooks/useAnime.ts` → `api/anilist.ts`.

## AniList API and rate limit

AniList is a GraphQL API: every request is a `POST` to `https://graphql.anilist.co` with a query naming the exact fields we want. It allows roughly 30–90 requests per minute. `api/anilist.ts` spaces requests out (one every 250ms) and, on `429 Too Many Requests`, waits as long as AniList's `Retry-After` header says. Cached results don't make new requests at all. Adult content is filtered out in every query.

## Search suggestions

The navbar search bar suggests anime from the very first letter you type. AniList's own search only matches whole words ("frier" finds nothing, "frieren" works), so suggestions come from two places:

1. **`public/search-index.json`**: the titles of the 5,000 most popular anime, matched instantly in the browser (`src/lib/localSearch.ts`). Downloaded the first time someone clicks the search bar.
2. **AniList live search**: fills in when the list has fewer than 6 matches (whole words only).

The JSON file is committed to the repo, so Vercel just serves it. It is **not** rebuilt on deploy. To pick up new shows, run `npm run search-index` every month or so (it waits between requests to respect AniList's 30/minute limit), then commit the updated file.

## Stamp book (no backend)

Stamps are saved in the browser's `localStorage` (`src/lib/stamps.ts`), so they stay on one device. The Stamp book page can download them as a `.json` backup and load them back. A future Express + MongoDB backend could replace `lib/stamps.ts` without touching the pages.

## Opening & ending songs

Song data comes from the free [AnimeThemes API](https://api-docs.animethemes.moe) (`src/api/animethemes.ts`), not AniList. If it can't be reached, the anime page shows YouTube and Spotify search links instead.

## Changing the look

All colors are tokens in `src/index.css` (`--paper`, `--surface`, `--line`, `--ink`, `--muted`, `--accent`), with a second set for dark mode. Change a value there and the whole site follows. Headings use Bricolage Grotesque, body text uses Inter.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repo.
3. Vercel detects Vite automatically. Click **Deploy**.

`vercel.json` makes page refreshes work on URLs like `/anime/52991`.

## Ideas for later

- Express backend that caches AniList data in MongoDB
- User accounts (JWT) with personal watch lists and reviews
- Compare two anime, anime tier list maker, guess-the-anime daily game
