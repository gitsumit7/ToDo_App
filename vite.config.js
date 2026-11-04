import { defineConfig, loadEnv } from 'vite'

// markWay is a plain HTML + JavaScript app (index.html -> src/main.js).
//
// The app sends Supabase auth requests to "/supabase/..." on its own server,
// and Vite forwards them to VITE_SUPABASE_URL. The browser only ever talks to
// localhost, so ad-blockers or filters that block *.supabase.co don't break OTP.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const proxy = target
    ? {
        '/supabase': {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/supabase/, ''),
        },
      }
    : undefined

  return {
    server: { proxy },
    preview: { proxy },
  }
})
