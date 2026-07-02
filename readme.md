# Resume Builder MVP

This repo now contains a working MVP from the PRD with Mongo intentionally deferred.

What is included:

- React + Vite client with warm-up state, PDF upload, GitHub sync, quick basics editing, live preview, and JSON export.
- Express backend with `POST /api/v1/resume/parse`, `GET /api/v1/github/sync/:username`, and `GET /health`.
- Gemini integration when `GEMINI_API_KEY` is configured.
- Local `pdf-parse` fallback when Gemini is not configured or fails.
- Browser-only draft persistence using `localStorage` until Mongo is added later.

## Local setup

1. Install dependencies from the repo root.
2. Copy `server/.env.example` to `server/.env`.
3. Copy `client/.env.example` to `client/.env` if you want a custom API URL.
4. Start the local app from the root with `npm.cmd run dev` on Windows, or `npm run dev` elsewhere.
5. Open `http://localhost:4000` and choose **Continue locally** to parse a PDF without MongoDB.

## Environment

Server variables:

- `PORT`: backend port, default `4000`
- `CLIENT_ORIGIN`: allowed frontend origin, default `http://localhost:5173`
- `GEMINI_API_KEY`: optional, enables multimodal parsing and README summarization
- `GITHUB_TOKEN`: optional default GitHub token for server-side sync
- `MAX_UPLOAD_MB`: optional upload cap, default `50`
- `REQUIRE_MONGO`: optional, set to `true` only when you want account persistence and have a working `MONGO_URI`

Client variables:

- `VITE_API_BASE_URL`: defaults to `/api/v1`, which works with the Vite dev proxy

## Notes

- Mongo persistence is optional for local demos. PDF parsing, preview, GitHub sync, and browser draft persistence work without Mongo.
- GitHub sync works without a token, but rate limits are much lower.
- The fallback parser is intentionally conservative. For better extraction quality, add a Gemini API key.
