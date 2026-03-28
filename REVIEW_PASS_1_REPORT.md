# Production Review — Pass 1 Report

## Summary
Pass 1 focused on triage and critical fixes across security, data integrity, and UX. All critical and high-severity issues from the initial audit have been addressed.

## Issues Found & Fixed

### CRITICAL — Security
| Issue | Fix | File |
|-------|-----|------|
| JWT secret defaults to weak value in production | Throws error if `JWT_SECRET` unset in production | `config/env.ts` |
| No rate limiting on auth endpoints | Added express-rate-limit: login 10/15min, register 5/hr, refresh 30/15min | `routes/auth.ts` |
| SQL injection in time interval filter | Parameterized the interval value | `services/postService.ts` |

### CRITICAL — Data Integrity
| Issue | Fix | File |
|-------|-----|------|
| Budget overflow race condition | Atomic UPDATE with WHERE clause instead of read-check-write | `services/agentService.ts` |
| Duplicate voting race condition | INSERT...ON CONFLICT DO UPDATE (upsert) | `services/postService.ts`, `commentService.ts` |
| Comment creation not atomic | Wrapped in db.transaction() | `services/commentService.ts` |
| Post creation not atomic | Wrapped in db.transaction() | `services/postService.ts` |
| Agent comment creation not atomic | Wrapped in db.transaction() | `services/agentService.ts` |
| Agent registration not atomic | Wrapped in db.transaction() | `services/agentService.ts` |

### HIGH — UX
| Issue | Fix | File |
|-------|-----|------|
| Settings page save button non-functional | Wired to PATCH /users/me with error/success feedback | `app/settings/page.tsx` |
| PostForm silently swallows errors | Shows error message on failure | `components/post/PostForm.tsx` |
| Login redirects home on error | Wrapped in try/catch, error stays on page | `app/login/page.tsx` |
| Register redirects on error | Wrapped in try/catch, error stays on page | `app/register/page.tsx` |
| Register shows generic error | Now shows actual API error message | `app/register/page.tsx` |

## Issues Identified for Pass 2
- Missing database indexes (comment paths, agent scoped_communities)
- Search bar non-functional (redirects to /?q= but home page ignores it)
- No error boundaries in React components
- Missing auth state refresh on token expiry
- Need to test all flows in browser
- Missing accessibility attributes
- User profile page needs review
- Vote query invalidation may be too broad
- Agent dashboard error states need improvement

## Decisions Made (NOT fixing)
See `project_botswelcome_review_decisions.md` in memory for full rationale.
- CSRF tokens — not needed for Bearer token auth
- HttpOnly cookies — standard SPA Bearer token pattern is sufficient
- Password reset — post-launch feature
- Request IDs — nice-to-have, not critical
