# ✨ Sparkle — University Societies & Events Platform

A Next.js 14 + Supabase platform for discovering and joining university societies and events across Australia.

---

## 🗂 Project Structure

```
sparkle/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Design tokens + global styles
│   ├── auth/
│   │   ├── login/page.tsx        # Login page (email + Google OAuth)
│   │   └── callback/route.ts     # OAuth callback handler
│   ├── dashboard/
│   │   ├── layout.tsx            # Sidebar layout
│   │   └── page.tsx              # Home dashboard
│   ├── events/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Events list
│   │   └── [id]/page.tsx         # Event detail
│   ├── societies/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Societies list
│   │   └── [id]/page.tsx         # Society detail
│   └── profile/
│       ├── layout.tsx
│       └── page.tsx              # User account page
├── components/
│   └── layout/
│       └── Sidebar.tsx           # Vertical nav sidebar
├── lib/
│   ├── supabase.ts               # Browser client
│   └── supabase-server.ts        # Server client
├── types/index.ts                # TypeScript interfaces
├── middleware.ts                 # Auth route protection
└── supabase-schema.sql           # Full DB schema (run in Supabase)
```

---

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In **SQL Editor**, paste and run the contents of `supabase-schema.sql`

### 3. Enable Google OAuth in Supabase

1. In your Supabase project → **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials (from [console.cloud.google.com](https://console.cloud.google.com))
4. Set the **redirect URL** to: `https://your-project.supabase.co/auth/v1/callback`

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are found in Supabase → **Settings** → **API**.

### 5. Add the Neue Haas Grotesk font (optional)

The app uses **Neue Haas Grotesk Display** via Adobe Fonts or a licensed font file.
If you have a license, add the font files to `/public/fonts/` and update the `@font-face` in `globals.css`.

The fallback chain is: `NeueHaasGroteskDisplay → Barlow (Google Fonts) → Helvetica Neue → Arial`.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🗃 Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Extended user info (auto-created on signup) |
| `societies` | University clubs/societies |
| `events` | Events run by societies |
| `society_memberships` | User ↔ society join table |
| `event_registrations` | User ↔ event join table |
| `team_members` | Society committee/team members |

---

## 🔐 Auth Flow

1. User visits `/auth/login`
2. Clicks **Continue with Google** → Supabase OAuth redirect
3. After auth, Supabase redirects to `/auth/callback`
4. Callback exchanges code for session, redirects to `/dashboard`
5. Middleware protects `/dashboard`, `/events`, `/societies`, `/profile`

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| `--color-yellow` | `#FFD600` |
| `--color-accent-blue` | `#5B8DB8` |
| `--color-navy` | `#0D0D0D` |
| `--color-bg` | `#F5F5F5` |
| Font | Neue Haas Grotesk → Barlow fallback |

---

## 📦 Key Dependencies

- **Next.js 14** — App Router
- **@supabase/supabase-js** + **@supabase/ssr** — Auth + DB
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility styles
- **lucide-react** — Icons

---

## 🛠 Adding Seed Data

To populate the DB with sample societies and events, run this in Supabase SQL Editor:

```sql
-- Insert a sample society
INSERT INTO societies (name, short_name, description, type, university, founded_year, size)
VALUES
  ('UNSW Business Society', 'UNSW BSoc', 'The constituent society for all students studying at UNSW Business School.', 'Academic', 'UNSW', 1988, 15000),
  ('UNSW EcoSoc', 'UNSW EcoSoc', 'Sustainability and environmental action at UNSW.', 'Hobbies', 'UNSW', 2005, 2000);

-- Insert a sample event (replace society_id with real UUID)
INSERT INTO events (society_id, title, description, date, start_time, end_time, location, arc_member_price, non_arc_member_price, registered_count, is_featured, category)
VALUES
  ((SELECT id FROM societies WHERE short_name = 'UNSW BSoc'),
   'Annual Cruise Ride', 'Join us for an incredible cruise night!', '2026-03-21', '16:00', '22:00',
   'King Wharf C, Sydney NSW 2000', 3.00, 6.00, 452, true, 'Social');
```
