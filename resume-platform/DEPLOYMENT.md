# ResumeMatch — Deployment Guide

A complete resume matching and scoring platform. This guide takes you from zero to live in ~20 minutes.

---

## What you built

- **Resume Library** — Upload DOCX/PDF resumes into role buckets (Software Engineer, Java Developer, etc.)
- **JD Intake** — Paste job descriptions (or use the Chrome extension) to score against your resumes
- **Scoring Engine** — 5-component weighted scorer: keywords (35%), semantic similarity (25%), qualifications (20%), experience (10%), context (10%)
- **Results Dashboard** — Ranked resume results with full score breakdown, keyword clouds, visa/security flags
- **Chrome Extension** — One-click JD capture from LinkedIn, Indeed, Greenhouse, Lever, Workday

---

## Step 1 — Set up Railway (Database)

1. Go to **https://railway.app** → Sign up (free)
2. Click **New Project** → **Provision PostgreSQL**
3. Click on the PostgreSQL service → **Connect** tab
4. Copy the **DATABASE_URL** (looks like `postgresql://postgres:...@...railway.app:PORT/railway`)
5. Keep this tab open — you'll need it in Step 3

---

## Step 2 — Push code to GitHub

```bash
# In the resume-platform folder:
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/resume-platform.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **Add New Project** → Import your `resume-platform` repo
3. Before clicking Deploy, click **Environment Variables** and add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Your Railway PostgreSQL URL from Step 1 |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` in your terminal and paste the output |
| `NEXTAUTH_URL` | Leave blank for now — Vercel fills this automatically |

4. Click **Deploy** and wait ~2 minutes

5. Once deployed, copy your Vercel URL (e.g. `https://resume-platform-abc.vercel.app`)
6. Go back to Vercel → Settings → Environment Variables → Add:
   - `NEXTAUTH_URL` = `https://your-actual-vercel-url.vercel.app`
7. Go to Deployments → click the 3 dots → **Redeploy**

---

## Step 4 — Initialize the database

After deployment, run the database migration once:

```bash
# In the resume-platform folder on your computer:
npx prisma db push
```

This creates all the tables in your Railway PostgreSQL database.

---

## Step 5 — Create your account

1. Open your Vercel URL in the browser
2. Click **Create Account**
3. Enter your name, email, password
4. You're in — 6 default role buckets are created automatically

---

## Step 6 — Install the Chrome Extension

1. Open Chrome → go to `chrome://extensions`
2. Turn on **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder inside your `resume-platform` project
5. The ResumeMatch icon appears in your toolbar
6. Click it → enter your Vercel app URL in the "App URL" field → click Save

### Using the extension:
- Go to any job listing on **LinkedIn, Indeed, Greenhouse, Lever, or Workday**
- Click the extension icon
- Click **Analyze Now** to immediately score → opens results in a new tab
- Or click **Add to Batch** to queue multiple JDs
- When you have multiple JDs queued, click **Send Batch** to process them all at once

---

## How to use the platform

### 1. Upload your resumes
- Go to **Resume Library**
- Click **Upload** on any role bucket (or create a new bucket first)
- Upload your DOCX or PDF resume
- Give it a display name (e.g. "KK_Resume_Java") and optional focus label (e.g. "AWS Focus")
- Repeat for all your resume variants

### 2. Analyze a job description
**Option A — Dashboard paste:**
- Go to **Dashboard**
- Fill in job title and company (optional)
- Paste the full JD text
- Click **Analyze Now** → immediately see results
- Or click **Add to Batch** → queue multiple JDs → click **Send Batch**

**Option B — Chrome extension:**
- Browse to any job listing
- Click the extension icon → **Analyze Now**

### 3. Read your results
- Click any JD in **Job Results** or **Dashboard**
- See all scored resumes ranked by overall score
- Click any resume card to expand the full breakdown:
  - Score bars for each component
  - ✓ Matched keywords (green) and ✗ Missing keywords (red)
  - Qualification gaps
  - Experience comparison
  - Visa/security flags with details
  - Semantic similarity signals

---

## Scoring explained

| Component | Weight | What it measures |
|-----------|--------|-----------------|
| Keyword & Skill Match | 35% | Exact overlap of skills/tools between JD and resume |
| Semantic Similarity | 25% | TF-IDF cosine similarity — related concepts even without exact matches |
| Qualification Fit | 20% | How many stated JD requirements appear in the resume |
| Experience Alignment | 10% | Years of experience vs. what the JD requires |
| Context & Domain | 10% | Industry, deployment context, seniority signals |
| Penalties | −pts | Visa mismatch (−10), clearance mismatch (−15) |

**Score ranges:**
- 🟢 80–100% — Excellent match, strong candidate
- 🟡 60–79% — Good match, worth tailoring
- 🟠 40–59% — Partial match, significant gaps
- 🔴 0–39% — Low match, likely wrong role bucket

---

## Local development (optional)

If you want to run locally before deploying:

```bash
cd resume-platform

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and NEXTAUTH_SECRET

# Push schema to database
npx prisma db push

# Start dev server
npm run dev
```

Open http://localhost:3000

---

## Troubleshooting

**"Unauthorized" in the extension**
→ Open your app URL in the browser and sign in first. The extension uses your browser session.

**"Upload failed"**
→ Make sure the file is PDF or DOCX. Other formats are not supported.

**Extension can't extract JD**
→ Make sure the job description is fully loaded on the page. Scroll down to load lazy content, then try again.

**Score is 0% or very low**
→ Check that your resume is in the correct role bucket. The JD classifier routes to matching buckets only — a Python Developer JD won't score against resumes in a Java Developer bucket.

**Database connection error**
→ Check that your `DATABASE_URL` in Vercel environment variables matches your Railway PostgreSQL connection string exactly.

---

## File structure

```
resume-platform/
├── src/
│   ├── app/
│   │   ├── api/           # All backend API routes
│   │   ├── dashboard/     # Main JD intake page
│   │   ├── library/       # Resume library
│   │   ├── jobs/          # Results list + detail
│   │   └── login/         # Auth page
│   ├── components/ui/     # Reusable UI components
│   ├── lib/
│   │   ├── parser/        # Resume + JD parsers
│   │   ├── scorer/        # 5-component scoring engine
│   │   └── auth.ts        # NextAuth config
│   └── types/             # TypeScript types
├── prisma/
│   └── schema.prisma      # Database schema
├── extension/             # Chrome extension
│   ├── manifest.json
│   ├── content/           # Site-specific JD scrapers
│   ├── background/        # Service worker
│   └── popup/             # Extension UI
├── .env.example           # Environment variable template
└── DEPLOYMENT.md          # This file
```
