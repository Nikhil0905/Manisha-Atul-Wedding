# Manisha & Atul — Wedding Web App

A production-ready, bilingual wedding web app built to solve real-world guest coordination and logistics for an Indian wedding (~500 guests). 

🌐 **Live Website:** [nikhil0905.github.io/Manisha-Atul-Wedding](https://nikhil0905.github.io/Manisha-Atul-Wedding/)

---

## 💡 Why I Built This
Traditional wedding invitations leave families juggling phone calls, WhatsApp messages, and messy spreadsheets to figure out who is coming, when they arrive, and how they're travelling. 

I built this project to streamline that entire process into a single, clean link. 

- **Timeline:** Built and shipped in **3 days**.
- **Cost:** **$0** (built entirely on free-tier infrastructure).
- **Lifecycle:** Active through the wedding season (November 2026); backend services will sunset after the event.

---

## ✨ Key Features

### For Guests
- **Bilingual Support:** One-tap toggle between English and Hindi with saved preference.
- **Smart RSVP Flow:** Multi-step wizard capturing guest count, attending ceremonies, and travel logistics (dynamically asks for Flight or Train numbers when relevant).
- **Interactive Celebrations:**
  - **Pushp Varsha:** Live petal shower synced in real-time across active visitors.
  - **Sangeet Jukebox:** Guests submit song requests and upvote favorites.
  - **Floating Diyas & Guestbook:** Leave blessings and virtual floating candles.
- **Seamless Music:** Background wedding shehnai/instrumental audio tuned to work reliably across mobile devices, including iOS Safari.
- **Event Schedule & Maps:** Direct Google Maps navigation to venues and 1-tap "Add to Google Calendar" for each ceremony.

### For the Hosts (Backstage)
- **Host Dashboard:** Hidden admin view (triple-tap footer + passcode protected).
- **Real-Time Headcounts:** Live stats on confirmed guests, party sizes, and arrival dates.
- **One-Click Excel Export:** Instant UTF-8 BOM Excel/CSV download with guest travel info, party size, and arrival details for on-ground logistics.
- **WhatsApp Invite Generator:** Generates personalized greeting links for families in seconds.

---

## 🛠️ Tech Stack
- **Frontend:** Pure Vanilla HTML5, CSS3, JavaScript (zero external framework bloat, fast mobile load).
- **Database & Realtime:** [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security and Realtime channels).
- **Hosting:** GitHub Pages.
- **Security:** Strict Content Security Policy (CSP), Subresource Integrity (SRI) CDN pinning, and PostgreSQL RLS keeping guest contact details strictly private.

---

## 👤 Author
Built with ❤️ for family by Nikhil.
