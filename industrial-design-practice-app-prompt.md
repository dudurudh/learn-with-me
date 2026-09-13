# Claude Code Prompt: 365-Day Industrial Design Practice App (GitHub Pages)

Copy everything below the line into Claude Code.

---

Build me a static web app, deployed on GitHub Pages, that runs a 365-day industrial design skill-building curriculum. I'm a working engineer switching into industrial design. I have a full-time job, I'm starting from zero portfolio, and my main problem is consistency, not ambition. Design this app so that it is very hard for me to quit.

## Non-negotiable design principles

Read these first. They matter more than features.

1. **The plan advances on completion, not on the calendar.** Day 47 is whatever day I next open the app after finishing Day 46. If I disappear for two weeks, I come back to Day 47, not to a screen full of 14 overdue items. Never show a backlog. Never show "days missed."
2. **Every day has a floor and a ceiling.** Each day's task has a `full` version (20–30 min) and a `minimum` version (5–10 min). On a bad day I tap "minimum" and it counts as done. The minimum is always something real, never a token gesture.
3. **Streaks tolerate misses.** The streak counter uses a grace budget: 2 skips allowed per rolling 14 days without breaking. Show the grace remaining, not a scolding.
4. **Weekends do the heavy lifting.** Weekday tasks are short. Saturday is a 60–90 minute project block. Sunday is rest or catch-up — genuinely optional, marked as such, and never counted against me.
5. **Built-in deload.** Every 7th week is a light week: review, revisit old work, no new material. This is scheduled, not earned.
6. **No guilt copy anywhere.** No red, no "you broke your streak," no exclamation marks about falling behind. Neutral, quiet tone throughout.

## Architecture

GitHub Pages serves static files only — no server, no database, no runtime backend. Everything below follows from that, so don't try to work around it.

**Stack.** Vite + React + TypeScript, built to `/docs` or deployed via a GitHub Actions build. Tailwind for styling. Keep dependencies minimal. Deployed at `username.github.io/repo-name`, so set Vite's `base` correctly or routing will silently break on deploy.

**Libraries.** Small and specific, not a framework:

- **Radix UI primitives** (via shadcn/ui if convenient) for dialog, select, toggle, tooltip, popover. Take these for the accessibility — focus management and keyboard handling are genuinely hard and not worth rebuilding. But **strip the default shadcn theme entirely** and restyle against the tokens below. The stock look is instantly recognizable and this is a design-training app; shipping the default is a bad look on its own terms.
- **`idb`** (Jake Archibald's thin IndexedDB wrapper) or Dexie. Not raw IndexedDB.
- **`browser-image-compression`** for the photo pipeline.
- **`date-fns`** for date math — tree-shakeable, unlike moment.
- **`lucide-react`** for icons, used sparingly.
- **`ics`** for calendar file generation.
- **`rss-parser`** in the GitHub Action only, never in the client.
- **No charting library.** The drift and skip-rate views are three simple bar comparisons; CSS handles them. Recharts would be 90KB for that.
- **No heatmap library.** `react-calendar-heatmap` and friends carry GitHub's visual defaults with them. Build it as a CSS grid of 365 cells — it's the centerpiece and it should be yours.

## Visual design direction

The hero is the heatmap: 365 cells showing a year of work. Spend the boldness there and keep everything else quiet. This is an object I will open every day for a year.

**The feeling I want is childlike curiosity — but the kind a nine-year-old has with a bug collection, not the kind an app has with confetti.** Curiosity is wonder at accumulation, the urge to poke at things, permission to make bad work, and a genuine question you haven't answered yet. It is not cuteness. Nothing here should be cute.

**The governing metaphor: a naturalist's field journal and specimen drawer.** This is a good fit because it's literally what the app is — 365 dated specimens, collected, arranged, and compared over a year. Darwin's notebooks, a kid's shoebox of pressed leaves and beetles, a nature journal with measurements in the margins. That gets curiosity without a single rounded pastel card.

Work in two passes: propose a compact token system first (4–6 named hex values, typefaces and their roles, a layout concept, principles), show it to me, and only build after I've signed off.

**Palette.** Keep the material vernacular of industrial design: **blue modelling foam**, the signature material of ID prototyping, is a very particular chalky cyan and a far more specific accent than any default. Around it, paper whites, the warm greys of marker paper, and graphite for text. Add exactly one found colour — something that appears rarely, for discoveries and benchmark days only. Completion reads as a foam block getting worked: pale for untouched, saturated for a full day.

**Where the curiosity actually lives** — in behaviour and copy, not decoration:

- **Accumulation as the reward.** The specimen drawer should get visibly richer over time. A wall of 200 dated sketch photos is more compelling than any animation. Make the collection views the best-looking screens in the app.
- **Things found, not pushed.** The weekly designer arrives as something closed that I open, not a banner that announces itself. Small discoveries reward poking around.
- **Real questions in the task copy.** Alongside the instruction, one genuine prompt: *"What happens if you draw it wrong on purpose?"* *"Which line did you commit to and which did you hedge?"* Written as questions I might actually wonder about, never as encouragement. This is where most of the character should come from — copy is cheaper and more distinctive than pixels.
- **Specimen labelling.** Photos carry a date and day number like a collected sample. The notes field reads as marginalia beside the entry, not a form textarea.
- **Weight, not bounce.** Interactions can feel physical — drag, flip, pull — but with real mass and short travel. Springy overshoot on everything is the tell.
- **The developmental series.** The five benchmark drawings shown together is the single most curiosity-satisfying thing in the app: the same specimen at five stages. Design that screen first and let it set the tone for everything else.

**Hard avoid list.** These are what "playful" looks like when it's generated rather than designed:

- confetti, celebration bursts, or anything that pops on completion
- a mascot or character of any kind
- emoji used as interface elements
- pastel gradient blobs, soft-glow orbs, rounded everything
- bouncy spring easing applied globally
- handwriting or marker typefaces for body text — one may appear for real marginalia, nowhere else
- exclamation marks anywhere in the copy
- and the general defaults: cream-plus-serif-plus-terracotta, identical rounded cards with matching grey shadows, tracked-out all-caps eyebrow labels, arrows appended to button text, fade-and-slide-up on every section

**Resolving the tension with the tone rule.** The no-guilt, quiet-tone principle still holds for anything about performance, streaks, or missed days — that stays neutral and plain. The curiosity lives in the collection views, the discoveries, and the questions attached to the work itself. Never mix them: an app that is chirpy about whether I showed up is exactly the thing that makes me stop showing up.

Typography: technical sans rather than serif display. Inter is the reflexive default — look at Archivo, Instrument Sans or similar first, and pay attention to the numerals, since day counts are the most-read elements here.

Motion only where it confirms something I did. Marking a day complete deserves one considered moment; nothing else does.

Quality floor, unannounced: phone first, visible keyboard focus, reduced motion respected, legible contrast throughout.

**Repo visibility.** Public repo — free Pages, free unlimited Actions minutes. My progress data must therefore never be committed to the repo. See storage below.

**Progress storage — this is the part most likely to ruin the year, so treat it carefully.**

- **IndexedDB** as the primary store, not localStorage. localStorage is 5MB, synchronous, and gets cleared by browser cleanup more aggressively.
- Write-through on every action. Never hold state only in React.
- **Export to JSON** with one click, and **import** to restore. Non-negotiable.
- **Nag me to back up**: after every 30 completed days, and any time it's been 45+ days since my last export, show a quiet one-line prompt on the Today view offering a download. Not a modal, not dismissible-forever.
- **Optional GitHub Gist sync.** In Settings, let me paste a personal access token with `gist` scope and a secret Gist ID. When present, push progress to that Gist after each completed day and pull on load, with last-write-wins and a visible "last synced" timestamp. Store the token in IndexedDB, never in the repo, and warn me in the UI that a token in browser storage is a real if modest risk. The app must work fully without this configured.
- Handle the case where I open the app on my phone and my laptop with different local state. Without Gist sync, show which device's data is loaded and let me export from one and import to the other. Don't silently pick one and destroy the other.

**PWA.** Web app manifest, icons, service worker caching the app shell and `curriculum.json` so it works offline once loaded. I want to install it to my phone home screen. This matters more than it sounds — a home screen icon gets opened; a bookmark doesn't.

**Content files.** `curriculum.json` and `feeds.json` live in the repo as static assets, human-editable, fetched at runtime. I can edit them directly on github.com from my phone if I want to tweak a task.

## Reminders — read this before building

**GitHub Pages cannot reliably push me a daily notification.** A static site can only fire a browser notification while a tab is open, and scheduled local notifications via the Notification Triggers API are not broadly supported. Don't fake this or build something that silently fails. Build all three of the following:

1. **In-app notification** via the Notification API when the app is open, at my configured time. Cheap, works, limited.
2. **Downloadable `.ics` calendar file**, generated in-browser from Settings: a daily recurring event at my chosen time with an alarm, titled with a link back to the app. I subscribe once in my phone's calendar and get a real system-level reminder every day. This is the primary mechanism — make it prominent, not buried.
3. **Optional [ntfy.sh](https://ntfy.sh) push.** In Settings, let me enter an ntfy topic. A scheduled GitHub Action then POSTs a daily reminder to that topic, and I get a genuine push notification on my phone via the free ntfy app. No account, no key. Document the setup in the README in four steps or fewer.

Be explicit in the README about which mechanism actually delivers when the app is closed.

## App features

**Today view (the home screen).** Shows only today's task. Activity type, title, what to do, the full and minimum versions, estimated minutes, linked resource if any. Three buttons: Done, Minimum done, Skip. One free-text note field.

**Calendar heatmap.** 365 cells, color-coded by full / minimum / skipped / rest. This is the motivational core — make it look good.

**Log view.** Scrollable history of completed days with my notes, so I can see what I actually did.

**Phase progress.** Which of the six phases I'm in, how far through, what skill it's building.

**Settings.** Reminder time, grace budget size, ability to jump to a specific day, reset, day-boundary hour, seed/demo mode.

**Defer and swap.** Alongside Done / Minimum / Skip, a fourth control: **Not this one today.** It swaps in a lighter task of a *different* activity type from the same phase and pushes the original forward to the next slot of its type. One unappealing task should never become a three-day gap. Cap it at two swaps per week so it doesn't become the default.

**Day boundary is 4am, not midnight.** I will be sketching at 11:30pm and I don't want that landing on tomorrow, or a 12:20am session breaking a streak. Make the boundary hour configurable but default it to 04:00 local.

**Seed mode.** A settings toggle that fills the app with plausible fake history at day 200 — mixed full/minimum/skipped, notes, photos — so I can see what the heatmap and log actually look like populated, without waiting seven months. Must be clearly labeled and one-click reversible.

## Progress photos

Every day's entry can hold **one or more photos** — my sketchbook page, a foam model, a screen grab of a Rhino file. This is the most important feature in the app after the task itself: a year of dated, sequential sketch photos *is* the evidence of improvement, and it's what makes the benchmark-object comparison work.

- Capture from the device camera or file picker. On mobile, `<input type="file" accept="image/*" capture="environment">` is enough.
- **Compress client-side before storing: max 1600px on the long edge, JPEG quality ~0.85, target under 400KB.** Non-negotiable. Uncompressed phone photos would put well over a gigabyte into git history over 365 days, and git keeps every blob forever.
- Write to **IndexedDB first**, always. Instant, offline, never blocks marking a day done.
- **Then push to the public GitHub repo**, when a token is configured. Path: `progress-photos/day-047.jpg`, with a suffix for multiples. Use the GitHub contents API with a **fine-grained personal access token scoped to this one repo with contents:write** — not a classic token with full `repo` scope. Queue uploads and retry when offline; never let a failed upload lose the local copy.
- Public repo is fine and deliberate — it means the photos are durable, viewable from any device, and survive a browser wipe. One consequence to surface in the UI once, not repeatedly: these images are publicly accessible URLs, so don't shoot with mail, screens, or documents in frame.
- **Benchmark comparison view.** Days 1, 90, 180, 270 and 365 render side by side in a dedicated screen. Make this genuinely nice to look at; it's the payoff.
- Heatmap cells with photos get a subtle marker and open the image on tap.

## Instrumentation — let the plan correct itself

The curriculum I wrote is a guess. The app should tell me where the guess was wrong.

**Log actual time.** On completion, a quick tap-to-select of how long it really took (under 10 / 10–20 / 20–40 / 40+ min). Don't make me type.

**Surface the drift.** On the phase progress screen, show estimated versus actual median by activity type. If Tuesdays consistently run 45 minutes against a 25-minute estimate, the curriculum is wrong and I need to cut it, not push through it. Say so plainly when the gap exceeds 50%.

**Track what I skip, by type.** Not just how often but *what*. If I've silently dropped 80% of `make` days and only do sketching, I need to know that at day 60, not day 300. Show it as a neutral breakdown on the phase screen — no judgment language — and if any activity type falls below 40% completion over 30 days, surface a single quiet line suggesting I either make those tasks smaller or deliberately drop that strand.

**Re-entry flow.** If more than 10 days have passed since my last completed day, don't drop me cold at the next task. Offer a shortened re-entry day first: warm-up ritual plus a light drill from a phase I've already finished, 10–15 minutes, which counts as a full completion. Skill decays and the first day back is when people quit for good. Make coming back feel easy, not like a debt.

**Deadline countdown.** In settings, let me enter target application deadlines with school names. The phase screen shows days remaining alongside my projected Day 365 date, computed from my actual completion rate rather than the calendar. I need to see early whether Phase 6 lands before or after the deadlines — that's the number that should make me adjust, and it's the only place in the app where a little pressure is appropriate.

## Daily news digest

A small panel showing **five design stories from the past 24–48 hours**. Purpose: keep me plugged into the field's conversation, and give me real material for the `read` days and for grad school interviews, where "what's happening in design right now" is a standard question.

**Placement rule, and this matters:** the digest renders *below* the fold on the Today view and is collapsed by default. It does not appear at the top. A news feed is the single most likely thing to become the activity I do *instead* of sketching, so it must never be the first thing I see. Consider gating expansion behind marking the day complete, and make that behavior a setting I can toggle.

**Sourcing — use RSS, not a news API.** No key, no quota, no account. Google News offers RSS search feeds at `news.google.com/rss/search?q=...` which work without credentials, but a bare "industrial design" query returns heavy noise — industrial real estate, manufacturing earnings, industrial park permits. So make dedicated design publications the primary source and treat Google News as a supplementary query only:

Primary feeds (fetch the RSS, check each still resolves and drop any that 404 rather than crashing):
- Core77
- Dezeen
- designboom
- Yanko Design
- Fast Company — Co.Design / design section
- Wallpaper\*
- It's Nice That
- IDSA

Supplementary: two or three narrow Google News RSS queries — `"industrial design"`, `"product design" award`, `"design studio" launch` — with results filtered hard against the noise terms above.

Feed URLs live in an editable `feeds.json` alongside `curriculum.json` so I can add and remove sources without touching code.

**Fetching — via GitHub Actions, not the browser.** The browser cannot fetch these feeds directly; CORS will block every one of them, and public CORS proxies are rate-limited and unreliable. Don't use a proxy. Instead:

- A **scheduled GitHub Action** runs once daily (cron, early morning my timezone). It fetches every feed in `feeds.json` server-side, ranks and trims to the top five, and commits the result to `public/news.json` in the repo.
- The app then just fetches `news.json` same-origin. No CORS, no key, no quota, and it works offline from the service worker cache.
- The Action should use `actions/checkout` plus a small Node script, insert a 1-second delay between feed requests, set a real User-Agent, skip any feed that 404s or times out rather than failing the run, and only commit when the content actually changed.
- Add `workflow_dispatch` so I can trigger it by hand.
- Include the previous seven days of digests in `news.json` so the app has something to show if I don't open it daily.
- If the Action hasn't run in over 48 hours, the app shows a quiet timestamp rather than an error.

**Selecting the five** — done in the Action, using a transparent heuristic, no LLM required:
- recency weight (last 24h scores highest)
- source diversity: **never more than two stories from the same publication**
- keyword relevance to industrial, product, furniture, transport, and materials design, downweighting pure graphic design, interiors, and architecture
- deduplicate stories covering the same subject across publications

Optionally, if I add an `ANTHROPIC_API_KEY` as a **GitHub repository secret**, the Action uses it to rank and write one-line summaries instead. Strictly optional; the Action must run fine without it, and the key must never reach the client.

**Display.** Headline, publication, relative time, one-line summary from the RSS description, link opening in a new tab. Nothing more.

**Tie it into the curriculum.** Add a **Save for later** control on each story, saving to IndexedDB. On `read` days, the task should preferentially point at my saved queue: *"Read two saved articles properly and write three sentences on each in the notes field."* This is the whole point — it converts passive scrolling into the deliberate reading the plan already calls for. If the saved queue is empty, fall back to the day's assigned book reading.

## Weekly designer spotlight

Every Sunday, surface **one designer** — who they are, where and when they worked, two or three defining pieces, and why they matter. Over a year this gives me a real map of the field's history and a list of people worth following. It also gives me something to say when an admissions interviewer asks whose work I admire, which is a question I will definitely be asked.

**This is curated static data, not a live pull.** Auto-generating designer bios from search results produces confident nonsense and a roster of the same eight Europeans. Build `designers.json` in the repo with 52 entries, one per week, from the roster below. Each entry: name, nationality, era, discipline, two or three key works, one line on why they matter, and a `searchQuery` field the app turns into a button that opens a web search so I can go look at the actual work. **Do not invent works, dates, or biographical claims** — where you're not confident, leave the field empty and let me fill it in. The app renders what's in the file; it doesn't generate.

Sequence them so the year moves roughly chronologically but never runs more than three consecutive weeks from the same country, and lands at least 40% women and at least a third from outside Europe and North America.

**The roster** (use these; swap freely if you have better anchors, but keep the spread):

*Early and mid-century:* Michael Thonet, Josef Hoffmann, Marianne Brandt, Raymond Loewy, Henry Dreyfuss, Belle Kogan, Eva Zeisel, Charlotte Perriand, Jean Prouvé, Gio Ponti, Alvar Aalto, Greta Magnusson Grossman, Florence Knoll, Ray and Charles Eames, Isamu Noguchi, Clara Porset, Lina Bo Bardi, Kaare Klint, Hans Wegner, Arne Jacobsen, Sori Yanagi, Kenji Ekuan, Eliot Noyes, Niels Diffrient, Sergio Rodrigues.

*Late century:* Dieter Rams, Richard Sapper, Achille Castiglioni, Marco Zanuso, Mario Bellini, Ettore Sottsass, Enzo Mari, Gaetano Pesce, Verner Panton, Ingo Maurer, Shiro Kuramata, Hartmut Esslinger, Philippe Starck, Lella Vignelli.

*Contemporary:* Jasper Morrison, Naoto Fukasawa, Konstantin Grcic, Hella Jongerius, Patricia Urquiola, Ronan and Erwan Bouroullec, Ayse Birsel, Satyendra Pakhalé, Oki Sato (Nendo), Jomo Tariku, Nifemi Marcus-Bello, Bibi Seck, Yves Béhar, Marc Newson.

Add a **Follow** control that saves a designer to a running list, and let a `read` day occasionally point at it: *"Spend 20 minutes looking at the work of someone from your follow list. Two sentences on what you'd steal."*

## Weekly programs and funding tracker

Every Sunday alongside the spotlight, a panel on graduate programs and money. I'm applying to ID grad programs and the two things that change without warning are **deadlines** and **funding**.

**Curate the watchlist, diff it weekly — don't scrape and parse.** Parsing admissions pages into structured fields is brittle and will break silently, which is the worst failure mode for deadline data. Instead:

- `programs.json` holds my watchlist: school name, program name, admissions URL, funding URL, my target deadline, priority.
- A **weekly GitHub Action** fetches each URL, strips markup to plain text, and **diffs against last week's stored snapshot**. It surfaces *what changed* — a moved date, a new fellowship, a changed portfolio requirement — rather than trying to understand the page. Changed pages get flagged with a link and the diff excerpt.
- Snapshots live in the repo under `snapshots/`. Cap history at 8 weeks so it doesn't bloat.
- If a page 404s or a school restructures its site, flag it as "check manually" rather than silently reporting no change. A silent no-change on a broken URL is exactly how I'd miss a deadline.

**Seed the watchlist with:** RISD (MID, including the extended track for students without a design background), IIT Institute of Design, UIC School of Design, ArtCenter, Pratt, CCA, Georgia Tech, University of Cincinnati DAAP, Carnegie Mellon, Umeå Institute of Design, Royal College of Art, TU Delft IDE, Politecnico di Milano, Aalto University.

**Funding sources to track separately** in the same file, since these have their own deadlines and are usually the difference between doable and not:

- **Assistantships and departmental fellowships** — at US schools this is the single biggest lever and it's usually decided with admission, not after. Flag any school page that mentions TA/RA funding.
- **Fulbright** (study abroad from the US, and foreign students to the US)
- **DAAD** (Germany), **Chevening** (UK), **Swedish Institute Scholarships**, **Erasmus Mundus** joint masters, which are often fully funded
- **MEXT** (Japan), **Global Korea Scholarship**, **Invest Your Talent in Italy**
- **IDSA** scholarships and student awards
- School-specific merit awards at each program on the watchlist

**Deadline urgency.** Any deadline inside 60 days pins to the top of the Today view — the one exception to the below-the-fold rule, and the one place the app is allowed to be a little insistent. Tie this to the deadline countdown already in the phase screen.

## Curriculum structure

Generate all 365 days into `curriculum.json`. Each day object:

```json
{
  "dayId": "p1-d001-lines-ghosting",
  "day": 1,
  "phase": 1,
  "type": "sketch",
  "title": "Straight lines, ghosting drill",
  "full": "Fill two pages with straight lines...",
  "minimum": "One page of lines, 10 minutes.",
  "minutes": 25,
  "resource": "Robertson, How to Draw — ch. 1",
  "resourceType": "book",
  "cost": "owned",
  "isProjectBlock": false,
  "isRest": false,
  "isBenchmark": false
}
```

**Schema versioning matters more than it looks.** I will absolutely edit this file mid-year — retitle tasks, reorder days, delete ones that don't work. Progress records must therefore key on the stable `dayId` string, never on array position or the `day` integer. Put a `schemaVersion` at the top of the file. If a `dayId` in my progress data no longer exists in the curriculum, keep the record and mark it orphaned in the log rather than dropping it or crashing. If new days appear, slot them in without disturbing what I've already done.

**Activity types and rough mix:** `sketch` (~55%), `watch` (~10%), `read` (~10%), `cad` (~8%), `make` — physical model work (~7%), `review` (~5%), `rest` (~5%).

Never schedule more than two consecutive days of the same type except sketching. Put `read` and `watch` days on Wednesdays and Thursdays — those are my low-energy days. Saturdays are `isProjectBlock: true`. Sundays are `isRest: true`.

### Three rules that run across all 365 days

**The warm-up ritual.** Every `sketch` day opens with the same 5 minutes: a page of straight lines, then a page of ellipses on varying minor axes. This never stops, not even on Day 360. It is the first thing in every sketch task's `full` description, and it *is* the `minimum` version on hard days.

**The benchmark object.** On Day 1 I pick one physical object I own — something with a bit of complexity, a stapler or a shoe or a kettle — and draw it cold, 15 minutes, no reference technique. I redraw it on Days 90, 180, 270, and 365 under the same conditions. The app should flag these five days specially and show the five drawings side by side in the log view. This is the single most motivating thing in the whole plan; don't bury it.

**Spaced resurfacing.** Fundamentals don't get retired when a phase ends. Perspective and ellipse drills reappear roughly every 10–14 days through Phases 2 and 3, and every 3 weeks after that. Value studies resurface in Phases 4–6. Tag these days `review` so the mix stays honest.

### The six phases

**Phase 1 — Days 1–60: Mark-making and perspective.**
The goal is that my hand stops embarrassing me. Almost pure repetition, very little "design."

- Days 1–14: Line control. Point-to-point straight lines with ghosting, no rulers ever. Line weight variation. Long sweeping arcs. Hatching and cross-hatching for tone. Confidence over accuracy — a fast wrong line beats a slow tentative one.
- Days 15–28: Ellipses. Minor-axis discipline, ellipse degree, ellipses stacked on a shared axis, ellipses tilted in space. This is the drill most beginners skip and most schools test for.
- Days 29–42: Boxes freehand in one- and two-point perspective. Box grids, rotating a box through orientations, subdividing planes, finding the true center with the X method, extending and mirroring forms.
- Days 43–56: Cylinders, cones, spheres. Ellipse-in-box construction. Cutting planes and section views through primitives.
- Days 57–60: Combining primitives into crude assemblies. Phase review.

**Phase 2 — Days 61–120: Form building and proportion.**
Primitives become products. This is where your engineering brain is an advantage — lean on it.

- Days 61–74: Additive and subtractive form. Boolean thinking on paper. Draw simple real products as primitive stacks: a TV remote, a brick charger, a Bluetooth speaker.
- Days 75–88: Corner treatment. Fillets and radii drawn convincingly, variable-radius edges, parting lines, draft angles, shutlines. Engineers usually get this faster than art-background students, so push the difficulty here.
- Days 89–100: Observational drawing from life. Five real objects a week from my own desk and kitchen, measured by eye, no photo reference. Proportion is the whole point.
- Days 101–112: Cross-contours and surface flow. Tangency and continuity. Speed forms. Organic and compound-curved surfaces.
- Days 113–120: Silhouette and stance studies. Thumbnail exploration — twenty small variants of one form on a single page. First real design prompt: redesign a familiar object, 30 thumbnails, no rendering.

**Phase 3 — Days 121–180: Value, materials, rendering.**

- Days 121–134: Value structure in grayscale only. Light logic, terminator and core shadow, cast shadow construction, occlusion, reflected light. Three-value then five-value studies.
- Days 135–148: Materials, roughly one per day then combined. Matte plastic, gloss plastic, rubber, brushed aluminum, chrome, glass, anodized finish, fabric, wood. Same form drawn in different materials.
- Days 149–158: Marker rendering. Layering, blending, underlays, working light to dark, knowing when to stop.
- Days 159–166: Digital rendering in Procreate or Photoshop. Layers, masking, gradients, cleaning up scanned analog sketches.
- Days 167–180: **Project 1.** A simple object with few parts — a desk lamp, a hand tool, a water bottle. Full sequence: brief, 50 thumbnails, three directions, one refined, orthographic views, final rendering. Ends as an 8–10 page process document. Deliberately modest scope; the point is completing a full loop.

**Phase 4 — Days 181–240: Process and CAD.**

- Days 181–194: Research methods. Structured observation, five-user interviews, journey mapping, reframing a problem as a point-of-view statement. Reading-heavy; use Core77 and IDEO material.
- Days 195–208: Ideation volume. One week with a hard target of 100 concept sketches. Divergent techniques — analogy, forced connection, constraint inversion. Then concept selection: criteria matrices and knowing how to kill your favorite.
- Days 209–228: Rhino, working through McNeel's Level 1 then Level 2 material. Curve quality, surfacing, blends and fillets, SubD for organic forms, translating my own Phase 3 sketch into a model.
- Days 229–236: KeyShot. Materials, HDRI lighting, studio setups, camera framing, turntables.
- Days 237–240: **Project 2 kickoff.** More complex object, a genuine user need I've observed, not an invented one. Research and framing only in this phase.

**Phase 5 — Days 241–300: Making and photography.**

- Days 241–254: Shop fundamentals at home. Foam core construction, blue foam shaping, sanding grits, Bondo and spot putty, primer and paint. Safety and dust.
- Days 255–268: Iterative physical prototyping. Appearance models versus works-like models. Ergonomic mockups held in the hand and revised. Three rounds minimum on the Project 2 form — schools want to see the ugly middle.
- Days 269–282: CMF. Color palettes, material boards, finish specification, why a soft-touch coating is a business decision as well as an aesthetic one.
- Days 283–292: Photographing models. Seamless backdrop, single-light setups, phone camera discipline, retouching, consistency across a set.
- Days 293–300: **Project 2 completed and documented.** 12–15 pages.

**Phase 6 — Days 301–365: Portfolio.**

- Days 301–330: **Project 3**, run compressed in four weeks now that the process is familiar. Higher ambition — a product with a system or service around it, or a genuinely hard constraint. This is the project that should lead the portfolio.
- Days 331–344: InDesign and layout. Grid systems, typographic hierarchy, pacing across spreads, sequencing images so a reviewer's eye lands where I want it.
- Days 345–355: Writing case studies. The narrative spine of context → insight → exploration → the decision I made and why → outcome. Reviewers read for judgment, so the dead ends get shown, not hidden.
- Days 356–365: Assembly and application materials. PDF and web versions, a tightened image set, statement of purpose drafting, and a checklist against specific school requirements — RISD wants 10–20 images, IIT wants a 500–2,000 word essay. Day 365 is the final benchmark drawing.

## Resource library

**Rule: the `resource` field on every day must name something from this list.** Do not invent book titles, course names, video titles, or URLs. If a day's task has no natural source here, set `resource` to `null` rather than making something up. Where I've given a chapter or section, use it; where I haven't, reference the work generally and let me find the page.

Add a `resourceType` field (`book` / `video` / `course` / `web`) and a `cost` field (`owned` / `free` / `paid`) so I can see what I need to buy before each phase starts.

### Core books to buy up front

- **Scott Robertson & Thomas Bertling, *How to Draw*** (Design Studio Press). The spine of Phases 1 and 2. Perspective construction, ellipses, form development.
- **Koos Eissen & Roselien Steur, *Sketching: The Basics*** (BIS Publishers, 2011). The gentler on-ramp; use it alongside Robertson in Phase 1.
- **Eissen & Steur, *Sketching: Drawing Techniques for Product Designers*** (BIS Publishers, 2007, ISBN 9789063691714). Eissen ran the design sketching curriculum at TU Delft's Faculty of Industrial Design Engineering. This is the standard text — side views, perspective, simplifying shape, ellipses, rounding, cross-sections, ideation, surface and texture, light and ambiance. Phase 2 and 3 backbone.
- **Scott Robertson, *How to Render*** (Design Studio Press). Phase 3. Light logic, shadow construction, materials.
- **Eissen & Steur, *Sketching: Product Design Presentation*** (BIS Publishers, ISBN 9789063693299). Their third book, on presentation-level work. Late Phase 3 and Phase 6.

### Phase-by-phase assignments

**Phase 1 (Days 1–60) — Mark-making and perspective**
- Books: Robertson, *How to Draw*, chapters on line quality, basic perspective, ellipses and cylinders. Eissen & Steur, *Sketching: The Basics*, front sections.
- Video: **Spencer Nugent — Sketch-A-Day / IDSketching** (YouTube, sketch-a-day.com). Free ID sketching tutorials since 2008; he's ex-GM and ex-Astro Studios and took IDSA's Individual Achievement Award in 2020. Use his line and ellipse drills directly.
- Video: **The Design Sketchbook** (Chou-Tac Chung, YouTube / thedesignsketchbook.com). Step-by-step, beginner-paced, good on the days Robertson feels too dense.
- Book/prompt source: **Spencer Nugent, *Sketch Every Damn Day*** — a 52-week structure of lessons, demos and prompts covering perspective, form building, line quality, CMT and presentation. Pull daily prompts from here when you need variety.

**Phase 2 (Days 61–120) — Form building and proportion**
- Books: Eissen & Steur, *Drawing Techniques for Product Designers* — simplifying shape, elementary geometric shapes, the ellipses section, rounding, cross-sections. Robertson, *How to Draw*, later construction chapters.
- Reference: **Rob Thompson, *Manufacturing Processes for Design Professionals*** (Thames & Hudson). Use for the fillet, draft, parting-line and shutline days — it's an encyclopedic process reference and it's where your engineering background pays off. Read narrow sections, not cover to cover.
- Video: Nugent's form-building and product-teardown sketch videos.
- Course: **Domestika — *Concept Sketching for Industrial Design*** (Adam Miklosi). Cheap, and it runs analog-to-digital: sketchbook and pens, iPad and Apple Pencil, mood boards, concept iteration, digitizing sketches, documenting process and exporting as PDFs. Start it here and let it run through Phase 3.

**Phase 3 (Days 121–180) — Value, materials, rendering**
- Books: Robertson, *How to Render*, worked through roughly in order — this phase is essentially that book. Eissen & Steur, *Drawing Techniques*, sections on surface and texture, light, ambiance and surroundings.
- Book: **Mike Ashby & Kara Johnson, *Materials and Design***, for the material days — why a material reads the way it does, not just how to draw it.
- Course: Miklosi's Domestika course, the digital rendering and presentation modules.
- Video: Nugent on CMT and presentation; The Design Sketchbook marker tutorials.
- Presentation: Eissen & Steur, *Product Design Presentation*, for the Project 1 layout days.

**Phase 4 (Days 181–240) — Process and CAD**
- Book: **Bella Martin & Bruce Hanington, *Universal Methods of Design*** (Rockport). 100 research and design methods with case studies, from CMU's School of Design. This is your Phase 4 reading spine — assign two or three methods per reading day and apply one that week.
- Book: **Don Norman, *The Design of Everyday Things*** (revised edition). Read in the background across the phase.
- Book: **Henry Dreyfuss, *Designing for People***, for the human-factors days.
- CAD: **McNeel's official Rhino training materials** — the Level 1 and Level 2 guides are published free on rhino3d.com. Work Level 1 straight through, then Level 2's surfacing sections.
- Rendering: **KeyShot's own learning resources** on keyshot.com — materials, HDRI lighting, camera setup.
- Course (optional, paid): **IDEO U — *Insights for Innovation*** for the research-and-synthesis stretch, if you want structure and feedback.
- Web: **Core77** and **IDSA** articles and case studies for the industry-reading days.

**Phase 5 (Days 241–300) — Making and photography**
- Book: **Bjarki Hallgrimsson, *Prototyping and Modelmaking for Product Design*, 2nd ed.** (Laurence King, 2019, ISBN 9781786275110). Hallgrimsson teaches industrial design at Carleton. Materials, tools and techniques with step-by-step tutorials, plus an expanded digital section on 3D printing and laser cutting. This phase is built on this book.
- Reference: Thompson, *Manufacturing Processes for Design Professionals*, for the CMF and finish days.
- Web: Core77 model-making and photography how-tos for the shooting days.

**Phase 6 (Days 301–365) — Portfolio**
- Book: Eissen & Steur, *Product Design Presentation*, for layout and page-level decisions.
- Layout: Adobe's own official InDesign tutorials — free, and enough for a portfolio.
- Web: **Core77** portfolio critiques and articles; **Core77 Design Awards** entries as worked examples of case study structure.
- Application-specific: the live admissions pages for the schools I'm targeting — RISD's MID portfolio brief, IIT Institute of Design's application page, UIC's MDes application requirements. Flag these as things to check myself rather than baking in details that may have changed.

## Realism check

Total weekly load should land around **3 to 4 hours**, not more. If you find yourself writing a Tuesday task that takes 45 minutes, cut it. I would rather do 20 minutes for 300 days than 90 minutes for 30 days and stop.

## Build order

1. Scaffold Vite + React + TS, configure the Pages `base` path, and get a hello-world deployed to GitHub Pages before writing any features. Confirm the live URL loads.
2. Generate `curriculum.json` for all 365 days with stable `dayId`s. Do this in phase-sized chunks and show me Phase 1 for approval before continuing.
3. IndexedDB layer plus export/import and seed mode. Test that a full year of seeded data survives a hard refresh, and that editing `curriculum.json` doesn't corrupt progress.
4. Today view with Done / Minimum / Skip / Not-this-one and time logging, then heatmap, then log, then settings.
5. Photo capture, compression, and IndexedDB storage. Then GitHub push and the benchmark comparison view.
6. Instrumentation: drift, skip-by-type, re-entry flow, deadline countdown.
7. News Action and `news.json`, then the digest panel.
8. `designers.json` and the weekly spotlight, then `programs.json`, the weekly diff Action, and the funding panel.
9. PWA manifest and service worker.
10. Reminders: `.ics` generation, then optional ntfy Action.
11. README covering deploy, token setup, backup, and which reminder mechanism does what.

Ask me questions if something is ambiguous rather than guessing. Start with step 1.
