# Changelog

## [Unreleased] - 2025-10-01

### Added
- **Appwrite Cloud Persistence**: Full chat synchronization for logged-in users
  - Automated database setup script (`scripts/setup-appwrite.ts`)
  - Server-side persistence layer with node-appwrite SDK
  - REST API endpoints for thread CRUD operations
  - Client-side remote sync with auth-triggered sync
  - Chat serialization utilities for JSON-safe data transfers
  - Branch selection tracking and conversation computation
  - Comprehensive setup documentation
- **Chat Branch Navigation UI**
  - Inline branch switcher with `<current/total>` indicator
  - Keyboard-accessible previous/next controls for alternate replies
  - Mode badge for quickly identifying the generating model
  - Single-click rewrite now spawns a fresh branch while keeping model options available

### Changed
- **Chat Store Enhancements**:
  - Added `syncMode` state for local/cloud persistence toggle
  - Implemented remote sync scheduling with throttling
  - Branch-aware conversation getters for proper history resolution
  - Auth provider integration for automatic sync enable/disable

- **Agent Workflow Updates**:
  - Branch-aware message submission with proper parent linkage
  - Conversation history now respects selected branches
  - Support for creating new branches on rewrite/retry

### Removed
- **Sentry Integration**: Removed all Sentry error tracking
  - Deleted Sentry configuration files
  - Removed Sentry SDK dependency
  - Simplified logger to console-only output
  - Removed Sentry from global error handler

- **Hotjar Analytics**: Completely removed Hotjar integration
  - Deleted Hotjar utility files
  - Removed @hotjar/browser dependency
  - Cleaned up root provider initialization

### Fixed
- Eliminated critical dependency warnings from Sentry's OpenTelemetry instrumentation
- Removed unnecessary analytics overhead
- Simplified error handling and logging

### Technical Details
**Database Schema** (Appwrite):
- Collection: `threads`
- Attributes: `threadId`, `userId`, `title`, `updatedAt`, `payload` (JSON)
- Indexes: `userId_index`, `updatedAt_index`

**Environment Variables Required**:
```bash
APPWRITE_ENDPOINT
APPWRITE_PROJECT_ID
APPWRITE_API_KEY
APPWRITE_DATABASE_ID
APPWRITE_THREADS_COLLECTION_ID
```

**API Routes**:
- `GET /api/chat/threads` - List user's threads
- `POST /api/chat/threads` - Create new thread
- `PATCH /api/chat/threads/[threadId]` - Update thread
- `DELETE /api/chat/threads/[threadId]` - Delete thread

**Branch Feature**:
- Users can rewrite messages with different models
- Each rewrite creates a new branch from the parent message
- UI maintains branch selection per parent message
- Conversation history computed based on selected branches

---

## Migration Guide

### For Existing Users
1. Run `bun run setup-appwrite` to provision database
2. Add generated IDs to `.env` file
3. Sign in to sync existing local chats to cloud
4. Guest users continue using local IndexedDB storage

### For Production Deployment
1. Create Appwrite API key with only `documents.read` + `documents.write` scopes
2. Add all required environment variables to Vercel
3. Ensure CORS settings allow your production domain
4. Consider implementing rate limiting on API routes

---

**Commit**: 66b92e3
**Author**: Aditya Mer <adityamer1908@gmail.com>
**Date**: 2025-10-01
