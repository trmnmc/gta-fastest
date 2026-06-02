# 🟩 CreeperClips

Self-hosted tool to turn your friend's long-form **Minecraft gameplay recordings** into
polished **9:16 short clips** — with auto-detected highlights, animated word-by-word
captions, and your **server branding** — ready to export or schedule for TikTok, Instagram
Reels, and YouTube Shorts.

> Single-user, runs on your own machine. No accounts, no multi-tenant complexity.
> **It never downloads videos from YouTube or any site** — all source footage is
> imported from files you provide.

---

## How it works

```
 Friend's gameplay file ──▶  Library (import / batch upload / watch folder)
                                  │  enqueue "analyze"
                                  ▼
   Python worker:  ffprobe ▸ faster-whisper ▸ loudness + scene detection
                                  │  store top ~10 Highlights
                                  ▼
            Highlights / Review  (pick moments, trim in/out, "Make Clip")
                                  │  enqueue "render"
                                  ▼
   Python worker:  cut ▸ 9:16 reframe ▸ ASS karaoke captions ▸ branding overlay ▸ thumbnail
                                  │
                                  ▼
        Clip Editor (tweak captions/branding, re-render)  ──▶  Schedule (export / plan posts)
```

**Four parts:** a **Next.js** web UI, an **API layer** (Next.js route handlers),
a **BullMQ + Redis** job queue, and a **Python** processing worker (ffmpeg +
faster-whisper). The UI talks to the API, the API enqueues jobs, and the worker
processes them and writes results back to **PostgreSQL** + `MEDIA_DIR`.

---

## Tech stack

| Area | Tech |
| --- | --- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| API | Next.js route handlers (Node) |
| Queue | BullMQ + Redis |
| DB / ORM | PostgreSQL + Prisma |
| Video | ffmpeg / ffprobe |
| Transcription | faster-whisper (Python) |
| Highlight detection | librosa (loudness) + ffmpeg scene detection |

---

## Prerequisites

- **Node.js** ≥ 18.18 (tested on 20/22)
- **Python** ≥ 3.10
- **ffmpeg + ffprobe** on your `PATH` — `brew install ffmpeg` / `apt install ffmpeg`
- **Docker** (for the bundled Postgres + Redis) — or bring your own

---

## Quick start

```bash
# 1. Install JS deps
npm install

# 2. Python worker deps (in a venv)
cd python
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. Config
cp .env.example .env          # tweak if needed; point PYTHON_BIN at python/.venv/bin/python

# 4. Start Postgres + Redis
docker compose up -d

# 5. Create the schema + seed demo data
npm run setup                 # prisma generate + migrate deploy + seed
# (first time you may prefer: npx prisma migrate dev --name init)

# 6. Run it (three processes)
npm run dev            # web UI      -> http://localhost:3000
npm run worker         # job worker  (processing)
npm run watch-folder   # OPTIONAL: auto-import from WATCH_FOLDER
```

Open **http://localhost:3000**, drop a gameplay file on the Library page, and watch it
get analyzed.

> Point `PYTHON_BIN` in `.env` at the venv interpreter (e.g.
> `PYTHON_BIN="./python/.venv/bin/python"`) so the worker uses the right one.

---

## Build order (how to test as you go)

The project is structured so each layer is verifiable on its own:

1. **Setup + schema + docker-compose** — `docker compose up -d`, `npm run setup`,
   open the app; the seed gives you a demo video + highlights.
2. **Import + Library** — drag a file onto the Library; it appears with status
   `imported` → `processing`.
3. **Analyze pipeline** — with the worker running, status moves to `analyzed`; open
   **Review** to see ranked highlights on the timeline.
4. **Render pipeline** — click **Make Clip**; the clip goes `rendering` → `ready` and
   the 9:16 preview plays in the **Clip Editor**.
5. **Export + Schedule** — add a clip to the **Schedule** calendar and hit **Export**;
   the mp4 + thumbnail + `caption.txt` land in `MEDIA_DIR/exports/<clipId>`.
6. **Optional posting + Discord** — see below.

---

## Data model (Prisma)

`SourceVideo` → `Highlight` → `Clip` → `ScheduledPost`, plus a key/value `Setting`
table. See [`prisma/schema.prisma`](prisma/schema.prisma). Source footage carries a
`creatorName` so your friend always gets credited.

---

## Configuration

All via `.env` (see [`.env.example`](.env.example)):

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection (matches docker-compose) |
| `REDIS_URL` | Redis for BullMQ |
| `MEDIA_DIR` | Where source videos & rendered clips live |
| `WATCH_FOLDER` | Optional auto-import folder (e.g. synced Dropbox/Drive) |
| `PYTHON_BIN` | Python interpreter with the worker deps |
| `WHISPER_MODEL` / `WHISPER_DEVICE` | faster-whisper model + cpu/cuda |

Files are organized under `MEDIA_DIR`:
`source/` (imports), `clips/` (renders), `thumbnails/`, `exports/`.

---

## Error handling & resilience

- Failed analyze/render jobs mark the row `error` and store the captured
  ffmpeg/whisper output (`SourceVideo.errorMessage` / `Clip.errorMessage`), surfaced
  in the UI. Use **Re-analyze** / **Save & Re-render** to retry.
- The pipeline **degrades gracefully**: if `faster-whisper` or `librosa` aren't
  installed, analysis still runs on the signals that are available (e.g. scene
  changes), just without transcript snippets/captions.

---

## Optional: enabling direct social posting

**Off by default.** The core workflow exports clips to a folder for manual upload —
no third-party API keys required. To let CreeperClips post for you:

1. Set `ENABLE_DIRECT_POSTING="true"` in `.env`.
2. Create your **own** developer app on each platform and complete its auth +
   app-review process yourself (this is required by each platform and only you can
   do it for your accounts):
   - **YouTube Data API** — `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`
   - **Instagram Graph API** — `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`
   - **TikTok Content Posting API** — `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_ACCESS_TOKEN`
3. Implement the upload calls in [`src/lib/integrations/posting.ts`](src/lib/integrations/posting.ts)
   (scaffolded with clear TODOs). Until then, the Schedule **Export** action always
   produces a manual-upload folder.

### Optional: Discord webhook

Set `DISCORD_WEBHOOK_URL` to get a message in your server's Discord whenever a new clip
finishes rendering — handy for announcing fresh content.

---

## Project layout

```
prisma/schema.prisma      Data model + seed
src/app/                  Next.js pages (Library, Review, Clips, Schedule, Settings) + API routes
src/lib/                  prisma, config, queue (BullMQ), media, settings, integrations
worker/index.ts           BullMQ worker: orchestrates analyze + render jobs
worker/watcher.ts         Optional watch-folder importer
python/analyze.py         probe + transcribe + highlight detection
python/render.py          cut + 9:16 reframe + captions + branding + thumbnail
python/captions.py        ASS karaoke caption generation
docker-compose.yml        Postgres + Redis
```

---

## Notes

- All source footage comes from your friend **with permission**; the `creatorName`
  field + the auto-appended **credit tagline** (Settings) keep them credited on exports.
- Everything runs locally: `docker compose up` + `npm run dev` + `npm run worker`.
