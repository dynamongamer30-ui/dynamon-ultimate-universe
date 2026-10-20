# Neon migration test API

This isolated Cloudflare Worker serves the local migration test UI only. It is
not the website production API and does not replace the existing Supabase
Worker.

Routes:

- GET /health — public liveness response.
- GET /api/profile — the signed-in user's mapped legacy profile.
- GET /api/favorites and POST /api/favorites — own favorites only.
- GET /api/likes and POST /api/likes — own mod likes only.
- GET /api/progress — XP, streak, and achievements for the verified user.
- POST /api/check-in — records a daily streak for the verified user.

All /api routes require a valid Neon Auth JWT. The API derives the legacy
profile ID from the migration identity map; clients cannot pass a user ID.
Database access uses a dedicated role that can execute only the migration
API functions.

The SQL migration in migrations/0001_neon_api_functions.sql must be applied to
the Neon supabase-migration-test branch before API routes can serve data.

The Worker is configured for localhost origins only. Do not add production
origins or deploy it as the production website API during this test stage.
