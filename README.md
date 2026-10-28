# Manisha weds Atul — Wedding Invitation, RSVP & Guestbook Web Application

Production-ready bilingual (Hindi / English) wedding invitation website built with HTML5, CSS3, vanilla JavaScript, Supabase (PostgreSQL with Row Level Security & Realtime), and hosted on GitHub Pages.

---

## 🌸 Overview

- **Wedding Date:** 16 November 2026, 8:00 PM IST (Amritsar)
- **Scale:** Designed for ~500 guests
- **Stack:** HTML5, CSS3, Vanilla JS, Supabase, GitHub Pages

---

## ✨ Features & Architecture

### 1. Public Visitor Interactions
- **Bilingual Interface:** Instant Hindi ⇄ English toggle with persistent user preference (`localStorage`).
- **Personalized Invites:** Supports `?guest=Name` URL parameter for tailored greetings.
- **Pushp Varsha:** Canvas particle petal shower with an atomic live counter synchronized across all visitors via Supabase Realtime (`pushp_counter` table).
- **Ceremonies & Timeline:** Complete 4-day ceremony schedule with dress code advice and Google Calendar deep integration.
- **RSVP Multi-Step Wizard:**
  - Step 1: Name, 10-digit mobile number, attendance confirmation.
  - Step 2: Guest count, exact numbers (for 16+), ceremony day selection.
  - Step 3: Arrival date, time slot, exact time, and travel mode.
  - Step 4: Attendance summary, WhatsApp group link, direct WhatsApp host handoff, and dynamic canvas-generated VIP Welcome Pass PNG download.
  - **Security & Integrity:** Max 3 RSVP records per phone number strictly enforced at the database level (`BEFORE INSERT` trigger). All RSVP records are strictly private via Supabase Row Level Security (no public read).
- **Guest Wishes:** Guests can send blessings with one-tap badges and custom messages. Submissions are saved securely to Supabase.
- **Sangeet Jukebox:** Song request submissions with live upvoting (`🔥`) and real-time community ranking powered by Supabase.
- **Floating Diyas:** Guests float diyas that drift across a virtual lake in real time for all active visitors.
- **Venue & Travel:** Interactive Google Maps links, airport/railway station routes, and one-tap address copying.

---

### 2. Host Administration Panel
- **Access:** Triple-tap the footer (`Manisha · Atul · 16.11.2026`).
- **Security:** Protected by server-side passcode authentication (`host_verify_passcode`).
- **Live RSVP Analytics:** Real-time stats directly from Supabase:
  - Total replies
  - Total attending guests
  - Total party members
  - WhatsApp group joining count
  - Full guest RSVP list
- **Guestbook Archive & Export:**
  - Complete list of submitted blessings with timestamps, badges, and relations.
  - One-click **Download CSV** (Excel & Google Sheets compatible with Hindi Unicode support).
  - One-click **Copy all** text.
- **Personalized Invite Generator:** Create and share WhatsApp invitations tailored to families with a single tap.

---

## 🗄️ Database Architecture (Supabase)

### Schema & Tables

1. **`rsvps`**
   - Private attendance records (`id`, `name`, `phone`, `attending`, `member_count`, `days`, `arrival_date`, `arrival_slot`, `arrival_time`, `travel_mode`, `wa_group_joined`, `wa_group_count`, `created_at`, `updated_at`).
   - **Constraint:** Maximum 3 RSVPs per phone number enforced by `check_rsvp_phone_limit` trigger.
   - **RLS:** Public users can only `INSERT`. Anonymous `SELECT` is strictly blocked. Host accesses data via authenticated RPC `host_get_rsvps`.

2. **`wishes`**
   - Guestbook submissions (`id`, `name`, `city`, `message`, `badge`, `likes`, `created_at`).
   - **RLS:** Public can `INSERT`. Host accesses complete archive via `host_get_wishes`.

3. **`songs`**
   - Jukebox tracks (`id`, `title`, `artist`, `requested_by`, `votes`, `created_at`).
   - **RLS:** Public `SELECT` and `INSERT`. Public votes via `vote_song` RPC.

4. **`diyas`**
   - Floating candles (`id`, `name`, `created_at`).
   - **RLS:** Public `SELECT` (last 10) and `INSERT`.

5. **`pushp_counter`**
   - Shared petal shower counter (`id = 1`, `count`).
   - **RLS:** Public `SELECT`. Incremented via atomic `increment_pushp` RPC.

---

## 🚀 Deployment & GitHub Pages Setup

1. In GitHub, open repository **Settings** → **Pages**.
2. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **`main`** / Folder: **`/ (root)`**
   - Click **Save**.
3. Within 1–2 minutes, your website will be live at:
   `https://nikhil0905.github.io/Manisha-Atul-Wedding/`

---

## 🔐 Administrative Access
To access the Host Panel:
1. Triple-tap the footer at the bottom of the page (`Manisha · Atul · 16.11.2026`).
2. Enter your host passcode:
3. Click **Unlock**.
