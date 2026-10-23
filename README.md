# InterviewIQ

A student-friendly, voice-first mock interview website. It asks five questions aloud, records each spoken answer, automatically transcribes and submits it, and reports on filler words, speaking pace, relevance, answer structure, and next steps. Gemini also explains what each specific answer communicated, what could be improved, and gives a stronger version using the candidate's own facts.

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run `npm start`.
4. Visit http://localhost:3000.

**No npm install required:** the backend uses Node's built-in modules.

## Add AI and voice later

1. Copy `.env.example` to `.env`.
2. Add `GEMINI_API_KEY` and `DEEPGRAM_API_KEY` there.
3. Restart `npm start`.
4. Allow microphone access in the browser when recording. Localhost is allowed for microphone access; a deployed app needs HTTPS.

Never put API keys in `public/app.js` or commit the `.env` file. When using APIs, audio goes to Deepgram for transcription and transcript text goes to Gemini for generating questions and feedback. When keys are missing, the project uses sample voice transcripts, predetermined questions, and rule-based feedback rather than pretending it is using AI.

## How to explain the project

- `public/index.html`: the three screens: setup, interview, report.
- `public/style.css`: layout and an animated face made entirely with CSS.
- `public/app.js`: tracks five questions, stores answers, calculates practice metrics, and shows a report.
- `server.js`: sends requests to Gemini/Deepgram without revealing secret API keys.

## Honest limitations

- In demo mode, questions are predetermined; they are **not AI-generated**.
- Filler counts depend on the words appearing in the transcript. Speech recognition can miss or remove hesitations.
- The interview flow is voice-only; users do not type or edit their answers.
- Relevance and STAR-structure checks in demo mode are simple keyword-based estimates, not objective scores.
- The app doesn't diagnose stuttering or determine personality or actual confidence.
- Current recording uses a finished audio clip, not streaming. Keep answers short so uploads remain small.
- Interview transcripts stay in browser memory for the session; this simple version does not have accounts or a database.

Made for the Congressional App Challenge as an educational project. Be transparent about any AI assistance used while creating it.
