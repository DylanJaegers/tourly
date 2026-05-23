# Tourly — Agent Coding Guide

## What this project is
Tourly is a TikTok-style real estate listing platform. Agents and FSBO sellers upload short-form and long-form listing videos. Buyers browse in a vertical swipe feed, save listings, and contact agents directly. Built for web (Next.js) and mobile (React Native + Expo).

## Tech stack
- **Frontend web**: Next.js (App Router), React, Tailwind CSS
- **Mobile**: React Native + Expo (separate repo — not in this folder)
- **Backend**: Node.js + Express (separate repo — not in this folder)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email + password, Google OAuth)
- **Video**: Mux (short-form 9:16 and long-form 16:9)
- **Maps**: Google Maps JavaScript API
- **Email**: Resend
- **Hosting**: Vercel (web), Railway (backend)

## Folder structuresrc/
  app/
    (buyer)/
    (agent)/
    (auth)/
    (shared)/
    admin/
    layout.js
    page.js
  components/
    buyer/
    agent/
    shared/
    ui/
  lib/
    supabase.js
    mux.js
    resend.js
    maps.js
  hooks/
  utils/
  styles/
public/
## Coding conventions
- Use the **App Router** exclusively — never use the Pages Router
- All components are **functional components** with hooks — never class components
- Use **Tailwind CSS** for all styling — no CSS modules, no inline styles
- Use **'use client'** directive only when the component needs interactivity (onClick, useState, etc.) — keep as many components server components as possible
- File names use **kebab-case** (e.g. listing-card.js, agent-dashboard.js)
- Component names use **PascalCase** (e.g. ListingCard, AgentDashboard)
- All Supabase calls go through **src/lib/supabase.js** — never import Supabase directly in components
- Environment variables are prefixed with **NEXT_PUBLIC_** for client-side and without prefix for server-side

## Environment variables
Store in `.env.local` — never commit this file to GitHub (already in .gitignore)NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
RESEND_API_KEY=
## Page inventory (15 pages)
1. Landing page — `src/app/page.js`
2. Video feed — `src/app/(buyer)/feed/page.js`
3. Listing detail — `src/app/(buyer)/listing/[id]/page.js`
4. Search & filter — component, not a page
5. Saved listings — `src/app/(buyer)/saved/page.js`
6. Buyer profile — `src/app/(buyer)/profile/page.js`
7. Agent sign-up — `src/app/(auth)/agent-signup/page.js`
8. Upload listing — `src/app/(agent)/upload/page.js`
9. Agent dashboard — `src/app/(agent)/dashboard/page.js`
10. Per-listing KPIs — `src/app/(agent)/listing/[id]/stats/page.js`
11. Lead inbox — `src/app/(agent)/leads/page.js`
12. Agent public profile — `src/app/(agent)/profile/[id]/page.js`
13. Auth — `src/app/(auth)/login/page.js` + `src/app/(auth)/signup/page.js`
14. Contact modal — `src/components/shared/contact-modal.js`
15. Map view — `src/app/(shared)/map/page.js`
16. Admin panel — `src/app/admin/page.js`

## Key product decisions
- Buyers can browse without an account — sign-up gate only on save and contact
- Short-form video (9:16) lives on the feed only
- Long-form video (16:9) lives on the listing detail page only
- First photo uploaded = cover photo automatically
- Swipe left on feed = go to listing detail. Swipe right = back to feed
- Edits to listings do NOT require re-approval — only new submissions do
- FSBO sellers bypass license verification — shown FSBO badge on profile
- Agent phone number is never shown publicly — only revealed in contact modal if agent opted in
- Map address is blurred for guests — full address shown to logged-in users only

## Database tables (Supabase)
- `users` — all users (buyers and agents), role field distinguishes type
- `agents` — agent profile data linked to users table
- `listings` — all property listings with status (pending/active/sold/draft)
- `listing_videos` — short-form and long-form video references (Mux asset IDs)
- `listing_photos` — photo URLs linked to listings, position order preserved
- `leads` — buyer contact form submissions linked to listing and agent
- `saves` — buyer saved listings (user_id + listing_id)
- `follows` — buyer follows agent (user_id + agent_id)

## What to read before writing any Next.js code
Read `node_modules/next/dist/docs/` for the current API. The App Router, server components, and data fetching patterns may differ from training data. Always use the file-based routing conventions of the App Router.
git add . && git commit -m "Fix AGENTS.md" && git push

