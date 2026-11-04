# markWay — To-do

A small to-do app built with plain HTML, CSS and JavaScript, bundled with Vite.

Features: tasks with projects / priority / tags, Today / Upcoming / Completed views,
Daily Check list, light/dark theme, and an encrypted private Notes vault
(with optional email-OTP password reset through Supabase).

## Run it

```sh
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # production build into dist/
npm run preview   # serve the production build
```

## Optional: email OTP for Notes password reset

Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key,
then follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Keyboard shortcuts

- `N` — new task
- `Ctrl K` / `⌘ K` — search
- `Esc` — close dialog or menu

## Project layout

- `index.html` — page shell, loads `src/main.js`
- `src/main.js` — all app logic
- `src/style.css` — styles
- `vite.config.js` — dev server; forwards `/supabase/*` to your Supabase URL so ad-blockers can't break OTP
- `supabase/schema.sql` — optional database table for Notes
- `.env.example` — template for the Supabase settings (copy to `.env`)
