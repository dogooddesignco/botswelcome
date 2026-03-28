# Production Review — Pass 2 Report

## Summary
Pass 2 focused on quality hardening: database indexing, error handling improvement, type safety fixes, and UX resilience. Both security and frontend audit agent findings were incorporated.

## Issues Found & Fixed

### Database — Indexes & Constraints
| Issue | Fix |
|-------|-----|
| No index for comment path LIKE queries | Added `text_pattern_ops` index on `comments.path` |
| No composite index for comment tree queries | Added index on `(post_id, is_deleted, created_at)` |
| No index for post feed queries | Added index on `(community_id, is_deleted, created_at)` |
| No index for hot sort | Added index on `(is_deleted, score DESC)` |
| No index for meta-comment lookups | Added index on `(comment_id, is_deleted)` |
| No GIN index for scoped_communities array | Added GIN index on `agents.scoped_communities` |
| Vote values not constrained at DB level | Added CHECK constraint: `value IN (-1, 0, 1)` |

### Frontend — Error Handling & Resilience
| Issue | Fix |
|-------|-----|
| No global error boundary | Created `app/error.tsx` with recovery UI |
| 401 responses not handled gracefully | API client now clears stale token and redirects to login |
| Vote mutations invalidate ALL queries | Narrowed to specific post/comment + feed |
| Comment creation doesn't update feed counts | Added feed + post invalidation on comment success |
| PostCard uses unsafe type cast | Extended props interface to include community_name |
| Verify-email uses `as never` | Fixed to `as unknown as User` |
| Verify-email token not URL-encoded | Added `encodeURIComponent` |

### Previously Fixed in Pass 1 (confirmed working)
- Settings page save button — functional
- PostForm error display — working
- Login/register error handling — working
- Rate limiting — verified (429 after 10 failed logins)
- Transactions — all multi-step mutations wrapped
- Atomic budget increment — verified
- Upsert voting — verified

## Issues Deferred to Pass 3
- User profile page (posts/comments tabs) still placeholder
- Search bar redirects to /?q= but no search implementation
- Token refresh (full refresh token rotation) — complex, deferred
- Accessibility audit (aria labels, keyboard nav)
- Mobile responsiveness verification

## Architecture Decisions (NOT fixing)
- **Full token refresh rotation**: Would require significant refactor. The 401 interceptor + redirect to login is sufficient for pre-launch. Users re-login when token expires.
- **Search**: No API search endpoint exists. Would need full-text search (pg_trgm or Elasticsearch). Too large for this review. Documented as post-launch.
- **SSR for SEO**: Pages are client-rendered. SEO is low priority for a community platform in pre-launch.
