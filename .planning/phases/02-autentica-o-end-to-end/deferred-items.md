# Deferred Items — Phase 02

Issues discovered during execution that are out of scope for the current task's changes
(per the executor's scope-boundary rule) and therefore logged here instead of auto-fixed.

## `check:no-secrets` false positive on vendored `@supabase/auth-js` code

**Found during:** 02-04 Task 3 (continuation) — first time `npm run build` output (`dist/`)
was inspected end-to-end in this repo with real credentials.

**Script** (introduced in phase 01, plan 01-04, commit `3f6b68f`):
```json
"check:no-secrets": "! grep -rEi 'service_role|sb_secret_' src/ && ! grep -rEi 'service_role|sb_secret_' dist/"
```

**Issue:** `dist/amigo-secreto/browser/chunk-VNQ55WCU.js` contains the literal string
`sb_secret_` as part of `@supabase/auth-js`'s own vendored key-format-detection helper:

```js
Ng=e=>e.startsWith("sb_publishable_")||e.startsWith("sb_secret_")
```

This is the SDK's internal logic for recognizing *if a given string looks like* a secret
key (e.g., to warn/reject using one client-side) — not an actual secret value. `src/` is
clean; `environment.ts` contains only the publishable key. There is no real credential
leak.

**Why deferred, not fixed:** The script itself predates this plan (phase 01) and this
plan's Tasks 1–2 only touched `login.page.ts/html` and `register.page.ts/html` — neither
is the cause of this false positive, and fixing shared build tooling is outside this
plan's file scope.

**Suggested fix for a future `/gsd:quick` or phase touching CI/build tooling:**
Exclude vendor/library chunk files from the `dist/` grep, e.g. restrict the second grep to
app-authored chunks, or search for the key pattern anchored to the actual app's own
environment injection point (`main-*.js` only) rather than every chunk, or simply grep for
the actual format of a realistic leaked key (`sb_secret_[A-Za-z0-9]{20,}`) instead of the
bare 10-char prefix literal, since the SDK's own prefix-detection code will always contain
that bare literal.

**Status:** Not fixed. No actual secret leak confirmed by manual inspection of `src/` and
`environment.ts`.
