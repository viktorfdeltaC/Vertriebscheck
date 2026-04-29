# Unterlagen-Check

Document-checklist tool for Wertentwickler real estate sales reps.
Stack: Vite + React (JS) · Tailwind v3 · Supabase (Frankfurt) · Vercel.

## Lokale Entwicklung

```bash
cp .env.example .env
# fülle VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Supabase einrichten

1. Projekt in Frankfurt anlegen.
2. SQL Editor → `supabase/migrations/0001_init.sql` ausführen, dann `0002_seed.sql`.
3. **Storage** → Bucket `lead-docs` anlegen, **Public = OFF** (privat).
4. Edge-Funktion deployen:
   ```bash
   supabase functions deploy notify-rep
   supabase secrets set APP_URL=https://your-vercel-app.vercel.app
   # später, sobald Resend bereitsteht:
   # supabase secrets set RESEND_API_KEY=... EMAIL_FROM="Wertentwickler <noreply@example.com>"
   # und in supabase/functions/notify-rep/index.ts RESEND_ENABLED = true setzen.
   ```
5. Ersten Admin-User per Auth-Dashboard anlegen, dann
   ```sql
   update profiles set is_admin = true where id = '<USER-UUID>';
   ```
6. Weitere Berater per Auth-Dashboard anlegen (kein öffentliches Signup).

## Deploy auf Vercel

1. Repository nach GitHub pushen.
2. In Vercel importieren (Framework wird automatisch als Vite erkannt).
3. ENV-Variablen setzen (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.

`vercel.json` enthält die SPA-Rewrite-Regel auf `/index.html`.

## Routen

| Pfad                 | Zugriff      | Zweck                                     |
|----------------------|--------------|-------------------------------------------|
| `/login`             | öffentlich   | Berater-Login                             |
| `/dashboard`         | geschützt    | Lead-Liste                                |
| `/leads/new`         | geschützt    | Neuer Lead + Share-Link generieren        |
| `/leads/:id`         | geschützt    | Lead-Detail (Admin sieht „Erstellt von") |
| `/check/:share_uuid` | öffentlich   | Klienten-Checklist + Upload + Einreichen  |

## Branding

Logo unter `public/logo.svg` ablegen (vom Auftraggeber zu liefern). Bis dahin
zeigt der Header den Wortmarken-Schriftzug **UNTERLAGEN-CHECK**.

## Verifikation

1. `npm run dev`, einloggen, Lead anlegen → 14 `lead_items`-Zeilen werden erzeugt.
2. Share-Link in Inkognito-Fenster öffnen → Items abhaken, PDF hochladen, Notiz speichern.
3. „Unterlagen einreichen" → `leads.status = 'vollständig'`, `submitted_at` gesetzt,
   `notify-rep` loggt im Stub-Modus den Mail-Payload (`supabase functions logs notify-rep`).
4. Share-Link erneut öffnen → Erfolgsbildschirm mit Einreichungs-Zeitpunkt.
5. Als Admin einloggen → Dashboard zeigt alle Leads mit Spalte „Erstellt von".
