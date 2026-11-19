# PrepSpark

Mock technical interviews that read your resume, adapt to how you answer, and remember what you got wrong last time.

PrepSpark was built as an internship project at Indira Gandhi Delhi Technical University for Women. You upload a PDF resume, choose a target role, and get a five question interview where every question is written after your previous answer. At the end you get scores, a transcript with feedback beside each answer, and a list of topics to revise. The next interview starts from those weak spots.

## What it does

- **Resume aware questions.** The PDF is parsed on the server and kept as context for the whole session, so questions name your actual projects and stack.
- **Adaptive follow ups.** Each answer is rated strong, partial or weak. Weak answers get a narrower question on the same concept, partial answers get a question aimed at the missing piece, and strong answers raise the difficulty or move to another skill.
- **Memory across sessions.** Topic proficiency and recurring mistakes are stored per user and fed into the next interview. A mistake is marked resolved when you get it right later.
- **Voice or text.** Record an answer and it is transcribed with Whisper. Speaking pace, filler words and duration are measured for spoken answers. Questions can be read aloud.
- **Results and history.** Overall, technical, communication, confidence and problem solving scores, strengths, weaknesses, suggestions, and the full transcript. A history page tracks scores and topic proficiency over time.
- **Accounts.** Email and password sign up, with sessions held in an httpOnly JWT cookie. Every interview is private to its owner.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, `proxy.ts` for route protection) |
| UI | React 19, hand written CSS, OGL shaders for the backgrounds |
| Database | PostgreSQL through Prisma 7 with the `pg` driver adapter |
| LLM | Groq, `openai/gpt-oss-120b` with JSON output |
| Speech to text | Groq, `whisper-large-v3` |
| Resume parsing | LangChain `PDFLoader` |
| Auth | `bcryptjs` and `jose` |

## Getting started

You need Node 20 or newer, a PostgreSQL database and a Groq API key.

```bash
git clone https://github.com/saanvisarawat/PrepSpark.git
cd PrepSpark
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Neon, Supabase or a local instance all work. |
| `GROQ_API_KEY` | Key from [console.groq.com](https://console.groq.com). |
| `JWT_SECRET` | Any random string of 16 or more characters. `openssl rand -base64 32` works. |

Create the tables and start the dev server:

```bash
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm install` reads `.npmrc`, which sets `legacy-peer-deps` because `@langchain/community` and Prisma ask for different `dotenv` ranges.

## How a session works

1. `POST /api/resume` extracts text from the uploaded PDF.
2. `POST /api/interview/start` loads the user's weak topics and open mistakes, then asks the model for a first question grounded in the resume and role.
3. `POST /api/interview/:id/answer` stores the answer, rates it, writes one line of feedback and generates the next question using the adaptive rules. After the fifth answer it signals completion.
4. `POST /api/interview/:id/complete` scores the whole transcript, saves the evaluation, updates topic proficiency with a weighted average, logs new mistakes and resolves old ones.

Interviews are stored turn by turn, so closing the tab mid session is safe. An unfinished interview resumes from the open question.

## Project structure

```
app/
  page.tsx                  landing page and resume upload
  login, signup/            authentication pages
  dashboard/                stats, recent interviews, weak topics
  setup/                    resume and role selection
  interview/[id]/           live interview, voice recording
  results/[id]/             scores, feedback and transcript
  history/                  all sessions and topic proficiency
  components/               Nav, AuthForm, ScoreRing, Backdrop, shaders
  api/
    auth/                   signup, login, logout, me
    interview/              start, history, [id], [id]/answer, [id]/complete
    resume/                 PDF text extraction
    transcribe/             speech to text
lib/
  engine.ts                 prompts and adaptive question logic
  memory.ts                 topic proficiency and mistake tracking
  groq.ts                   Groq client helpers
  auth.ts                   JWT and cookie helpers
  prisma.ts                 Prisma client with the pg adapter
  types.ts                  shared types, roles, question limit
prisma/schema.prisma        User, InterviewSession, TopicPerformance, MistakeLog
proxy.ts                    redirects signed out users away from app pages
```

## Data model

- `User`: name, email, password hash.
- `InterviewSession`: role, resume text, turns (JSON), evaluation (JSON), scores, status, duration.
- `TopicPerformance`: one row per user and topic with a 0 to 100 proficiency.
- `MistakeLog`: recurring errors with a frequency counter and a resolved flag.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint the project |

## Deploying

Set the three environment variables on your host, run `npx prisma db push` once against the production database, then build and start. On Vercel, add the variables in the project settings and set the install command to `npm install` so `.npmrc` is respected.

## Limitations

- Scanned PDFs are not supported because there is no OCR step. The resume needs selectable text.
- Voice recording needs a browser with `MediaRecorder` and microphone permission. Reading questions aloud uses the browser's built in speech synthesis, so the voice varies by device.
- Scoring comes from a language model. Treat the numbers as practice feedback and not as a hiring signal.
- Passwords can only be changed by editing the database. There is no reset flow yet.

## Roadmap

- Password reset and email verification
- Choice of interview length
- Coding questions with an in-browser editor
- Exporting a results page as PDF
