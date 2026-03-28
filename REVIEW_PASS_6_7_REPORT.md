# Production Review — Pass 6 & 7 Report

## Pass 6: Feature Implementation

### Community Creation (with smart validation)
- **pg_trgm similarity**: Names compared against existing communities using trigram similarity > 0.4 threshold
- **Verified**: "programing" correctly flagged as similar to "programming"
- **Blocklist scan**: ~80 offensive terms checked against both name and display_name
- **Frontend**: CreateCommunityModal in sidebar with debounced real-time validation
- **Endpoint**: `GET /communities/check-name?name=X&display_name=Y`

### Link Post Type Removed
- Removed `'link'` from PostType enum and Zod schema
- Removed Link tab and URL input from PostForm
- Existing link posts still render (backwards compatible via `"url" in post` check)
- Updated test: "should require URL for link posts" → "should reject link post type"

### Flagging/Reporting System
**Database**: `reports` table + `is_hidden` column on posts/comments + `is_admin` on users

**Automated Review Pipeline**:
1. Keyword scan against blocklist → immediate auto-hide
2. Report volume: 3+ distinct reporters → auto-hide
3. Reporter credibility: >60% dismissal rate → deprioritized
4. Default: pending → human review queue

**API**:
- `POST /reports` — create report (triggers automated review)
- `GET /reports?status=pending` — admin queue
- `PATCH /reports/:id` — admin approve/dismiss (with hide/unhide)

**Frontend**:
- Flag icon (ReportButton) on every post and comment
- ReportModal: reason dropdown + optional description
- Admin dashboard at `/admin/reports` with filter tabs

**Feed filtering**: All post/comment queries now include `is_hidden = false`

### Block Users
**Database**: `user_blocks` table with unique(blocker_id, blocked_id)

**API**:
- `POST /users/block` — block user
- `DELETE /users/block/:userId` — unblock
- `GET /users/blocks` — list blocked users

**Behavior**:
- Blocked users' posts/comments hidden from blocker's feeds
- Blocked users cannot reply to blocker's comments
- One-directional blocking

**Frontend**:
- Blocked users list in settings page with unblock buttons
- Block filtering applied server-side in all feed/comment queries

### Security
- `requireAdmin` middleware for admin-only routes
- `is_admin` column on users table

## Pass 7: Test Coverage

### New Tests (37)
| File | Tests | Coverage |
|------|-------|----------|
| report-schemas.test.ts | 10 | Report/review schema validation |
| community-schemas.test.ts | 8 | Community name/description validation |
| blocklist.test.ts | 7 | Term detection, case insensitivity, substrings |
| blockService.test.ts | 12 | Self-block prevention, service exports |

### Total Test Count: 195
- 12 test files across API package
- 5 test files in bots package
- All pass

## Verification Results

| Test | Status |
|------|--------|
| Community check-name (available) | "cooking" → available: true |
| Community check-name (taken) | "general" → available: false, "already taken" |
| Community check-name (similar) | "programing" → similar: ["programming"] |
| Report endpoint (requires auth) | 401 UNAUTHORIZED |
| Report queue (requires admin) | 401 UNAUTHORIZED |
| Block endpoint (requires auth) | 401 UNAUTHORIZED |
| Link post type (rejected) | Schema validation fails |
| Feed queries (is_hidden filter) | Working, verified in postService.ts |
| All 195 tests | PASS |
