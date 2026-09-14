# Learn with me

A year of industrial design practice, one day at a time. Static site, no server,
no database. Deployed at **https://dudurudh.github.io/learn-with-me/**

The plan advances on completion, never on the calendar. Disappear for two weeks
and you come back to the next day, not to fourteen overdue ones. There is no
backlog anywhere in this app and no screen that counts days missed.

---

## Which reminder actually reaches you

This is the part most likely to disappoint you silently, so it is first.

**A static site on GitHub Pages cannot push you a notification.** The browser can
only fire one while a tab is open, and scheduled local notifications are not
broadly supported. Three mechanisms exist here and only two survive the app
being closed.

| Mechanism | Works when the app is closed | Set up |
|---|---|---|
| **Calendar subscription** (.ics) | **Yes** — a real system alarm | Settings → *Download the calendar file*, then open it on your phone. **This is the primary one.** |
| **ntfy push** | **Yes** — via a scheduled Action | Four steps below. |
| Browser notification | **No** — only while a tab is open | Settings → *Allow browser notifications* |

### ntfy, in four steps

1. Install the free **ntfy** app and subscribe to a topic name only you know.
   Treat it as a password: anyone who knows it can read your reminders or send
   you their own.
2. In this repo: **Settings → Secrets and variables → Actions → New repository
   secret**, named `NTFY_TOPIC`, value = that topic name.
3. Adjust the cron in [`.github/workflows/ntfy.yml`](.github/workflows/ntfy.yml)
   if 19:30 Eastern is not your evening. It is written in UTC.
4. Run the workflow once by hand to check it arrives.

Without the secret the job exits quietly rather than failing every morning.

---

## Your data

**Progress lives only in your browser**, in IndexedDB, on whichever device you
used. It is never committed to this repo — the repo is public.

- **Back up from Settings → Export.** One file, all progress, notes, resource
  states and settings. **Tokens are deliberately excluded**, because a backup is
  the file most likely to end up emailed to yourself.
- **Import merges by default**, keeping whichever copy of a day was completed
  later. If your phone has day 4 and your laptop has days 1–3, you end up with
  all four. *Replace everything here* is available as an explicit choice.
- The app nags for a backup after 30 completed days, or 45 days since the last
  one. It is one quiet line, not a modal.
- **There is no copy anywhere else.** Losing the browser profile without an
  export loses the year.

### Syncing between your phone and your laptop

Optional, and off until you set it up. Settings → *Sync between your devices*:
paste a token with **`gist` scope** (nothing else), then press *Make me a secret
Gist* and it creates one and fills in the id.

- **Pull happens once when the app loads. Push happens after each completed day.**
- **Conflicts resolve per day, not per file.** Whichever copy of a given day was
  completed later wins, and a day only one device knows about is never dropped.
  Straight last-write-wins on the whole file would delete real work the moment
  two devices are out of step — which is the situation sync exists to handle.
- **Photos are excluded.** A year of them is far too much for a Gist; they go to
  the repo instead.
- A "secret" Gist is unlisted, not private. Anyone with the id can read it, so
  the id is the secret.

### Photos

Compressed in the browser before anything is stored: **max 1600px on the long
edge, JPEG, target under 400 KB**. A 7 MB phone photo lands around 350 KB. This
is not tunable-by-accident — uncompressed, 365 photos would put over a gigabyte
into a repo that keeps every blob forever.

Photos go to IndexedDB first and to GitHub second. A failed push queues for
retry and never touches the local copy.

To push them to the repo, in Settings → *Pushing photos*:

- Use a **fine-grained personal access token**, scoped to **this one
  repository**, with **Contents: read and write**. Not a classic token with full
  `repo` scope.
- The token is kept in this browser's IndexedDB. That is a real if modest risk:
  anything that can run JavaScript on this origin can read it. It is never
  exported and never committed.
- Photos land at `progress-photos/day-047.jpg` in a **public** repo, so they are
  publicly accessible URLs. That is deliberate — they survive a browser wipe and
  can be seen from any device. Do not shoot with mail, screens or documents in
  frame.

The app works completely without a token. Photos simply stay on the device.

---

## Editing the plan

Every content file is plain JSON in `public/` and editable directly on
github.com from a phone.

| File | What it is |
|---|---|
| `curriculum.json` | All 365 days, six phases, the resource registry |
| `feeds.json` | RSS sources and the relevance keywords |
| `designers.json` | 52 weekly designer entries |
| `programs.json` | School watchlist and funding sources |

**Progress records key on `dayId`, never on the day number or array position.**
So you can retitle a task, reorder days, or delete one, and your history
survives. A record whose `dayId` no longer exists is kept and marked *orphaned*
in the log rather than dropped. A new day slots in without disturbing anything.

`schemaVersion` is at the top of each file.

---

## The Actions

| Workflow | When | What it does |
|---|---|---|
| [`deploy.yml`](.github/workflows/deploy.yml) | push to `main` | Builds and deploys to Pages |
| [`news.yml`](.github/workflows/news.yml) | daily, 09:15 UTC | Fetches RSS server-side, picks five, commits `public/news.json` |
| [`programs.yml`](.github/workflows/programs.yml) | Sundays | Diffs admissions pages against last week's snapshot |
| [`ntfy.yml`](.github/workflows/ntfy.yml) | daily | Posts the reminder, if `NTFY_TOPIC` is set |

The digest sits below the task on the Today view and is always visible.

**News is fetched in the Action, not the browser**, because CORS blocks every
one of these feeds and public proxies are unreliable. The app then reads
`news.json` same-origin, with no key and no quota, and it works offline from the
service worker cache. Feeds that 404 are skipped rather than failing the run,
and the file is only committed when the stories actually changed.

**The programme watcher diffs text; it does not parse pages into fields.** A
scraper that turns a page into `{deadline: "..."}` breaks silently the moment a
school restructures its site, and a silently wrong deadline is the worst failure
this could have. Instead it strips markup, diffs against last week, and shows
*what changed* with a link. A page that 404s is flagged **check manually**, never
reported as "no change".

Everything about applications — your deadlines, the school watchlist, funding
sources and what changed this week — is on the **Schools** tab, available every
day.

**The watchlist ships with school domains, not deep admissions links.** Inventing
URL paths that may not exist would be worse than useless. Paste the real
admissions pages into `programs.json` and set `urlConfirmed: true` — until then
each entry is reported as unconfirmed and nothing is diffed for it.

---

## Running it locally

```bash
npm install
npm run dev        # http://localhost:5173/learn-with-me/
npm run test       # 59 tests
npm run build
```

Node 22. `base` is `/learn-with-me/` in `vite.config.ts` and must match the repo
name, or every asset 404s in production while working perfectly on localhost.

**Seed mode** (Settings → *Fill to day 200*) fills the app with plausible
history — mixed full, minimum and skipped days, notes, photos, and one bad
fortnight around day 130 — so the heatmap and log can be looked at populated. It
refuses to run if you have any real progress, and removing it deletes only the
rows it created.

---

## What is deliberately not here

- No confetti, no mascot, no streak-shaming. Skipped days are grey, not red.
- No backlog, ever.
- No LLM in the news pipeline. The ranking heuristic is recency, keyword
  relevance, source diversity and deduplication, and you can read all of it in
  [`scripts/fetch-news.mjs`](scripts/fetch-news.mjs).
- No invented facts in `designers.json`. Where I was not confident of a
  designer's key works the field is empty and `needsFillingIn` is `true`.
