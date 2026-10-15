- `npm run check:no-secrets` fails on production build: grep matches `sb_secret_` inside bundled supabase-js (key-prefix validation), a false positive independent of plan 05-02. Gate regex needs refining (e.g. match `sb_secret_[A-Za-z0-9]{10,}`).
# Deferred items - phase 05

- (05-04) christmas-countdown.card.html: DatePipe sem locale pt-BR registrado (nenhum LOCALE_ID/registerLocaleData em src/) renderiza o mes em ingles ("25 de December de 2026"). Fora do escopo da 05-04 (docs-only). Corrigir com registerLocaleData(localePt) + LOCALE_ID "pt-BR" em app.config.ts.
