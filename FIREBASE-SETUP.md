# Live guestbook storage – one-time setup (about 5 minutes, free)

These parts of the site now save to a shared Firebase Realtime Database, so
every visitor sees what every other visitor adds, live:

- **Send Your Wishes** (guestbook) - wishes and ❤️ blessings
- **Float a Diya** - a diya lit by one guest floats across everyone's lake
- **Song Request Jukebox** - requests and 🔥 votes
- **Pushp Varsha** - the petal-shower total

You can collect all the wishes at any time (see step 4). Until you finish the
steps below, the page keeps working exactly as before (everything stays on the
guest's own device).

## 1. Create the database
1. Go to https://console.firebase.google.com and sign in with your Google account.
2. **Add project** → name it (e.g. `manisha-atul-wedding`) → you can turn Google Analytics off → Create.
3. Left menu → **Build → Realtime Database → Create Database**.
   - Location: choose **Singapore (asia-southeast1)** (closest to India).
   - Start in **locked mode** (we replace the rules in step 2).

## 2. Paste the security rules
Realtime Database → **Rules** tab → replace everything with the contents of
`database.rules.json` (included next to this file) → **Publish**.

These rules let anyone read, and add *new* wishes, diyas and song requests
(with length limits), plus ❤️ / 🔥 votes and petal counts. Nobody can edit or
delete entries from the website; you do that from the console.

## 3. Connect the website
1. Firebase console → ⚙️ **Project settings** → **General** → *Your apps* →
   click the **`</>` (Web)** icon → register the app (skip Hosting).
2. Copy the `firebaseConfig` values it shows.
3. Open `app.js`, find `FB_CONFIG` near the top of the second block and fill in:
   ```js
   var FB_CONFIG={
     apiKey:'…',
     authDomain:'…firebaseapp.com',
     databaseURL:'https://…-default-rtdb.asia-southeast1.firebasedatabase.app',
     projectId:'…',
     appId:'…'
   };
   ```
   `databaseURL` must be included (Realtime Database → Data tab, the URL at the top).
4. Re-upload `index.html`, `app.js` and `style.css` to your host.

(The apiKey in a web app is not a secret. What protects your data are the rules
from step 2. Optional: in Google Cloud Console → APIs & Services → Credentials,
restrict that key to your website's address.)

## 4. Collecting all the wishes later
- **On the website:** triple-tap the footer (`Manisha · Atul · 16.11.2026`) to
  open the Host Panel → *Guest wishes* shows every wish, with **Download CSV**
  (opens in Excel / Google Sheets, Hindi text included) and **Copy all**.
- **In Firebase:** Realtime Database → Data → `wishes`. The ⋮ menu →
  **Export JSON** downloads everything. Delete an unwanted wish by hovering over
  it and clicking the ✕.

## Notes
- Spark (free) plan is plenty: 1 GB stored and 10 GB/month of traffic.
- To prevent spam, a device can post one wish every 15 seconds, one diya every
  8 seconds and one new song request every 10 seconds.
- Diyas: each guest's lake shows the 10 most recent diyas. A new one appears on
  everyone's screen within a second or two.
- If Firebase can't be reached (e.g. the guest is offline), the page falls back to
  showing wishes saved on that device, so nothing breaks.
- RSVPs are still stored per device (they contain phone numbers, so they are
  deliberately not made publicly readable). Each RSVP still reaches you on WhatsApp.
