# Changelog

## [Unreleased] - 2025-11-27

### Added
- **Temporary Chat Mode**: Private conversations that aren't saved to history
  - Ghost icon toggle in sidebar for quick access to temp chats
  - Visual indicators (subtle slate/gray styling) for temporary chat state
  - `TemporaryChatGreeting` component for temp chat welcome screen
  - Automatic cleanup when browser closes or session ends
  
- **Rate Limiting System**: Server-side request throttling
  - Tiered rate limits (anonymous, free, pro) for different endpoints
  - In-memory rate limit store with automatic cleanup
  - `RateLimitExceeded` and `RateLimitBanner` UI components
  - Comprehensive test coverage for rate limiting logic

- **Keyboard Shortcuts Framework**
  - `useKeyboardShortcuts` hook for registering shortcuts
  - `KeyboardShortcutsHelp` component showing all available shortcuts
  - Changed new thread shortcut from `Cmd+N` to `Alt+N` (avoids browser conflict)
  - Platform-aware shortcut display (⌘ on Mac, Ctrl on Windows)

- **Export/Import Conversations**
  - Export current thread as JSON or Markdown
  - Bulk export all conversations
  - Import conversations from JSON backup files
  - `ExportImportMenu` component in settings

- **Enhanced Mobile UX**
  - `useMobileSidebar` hook with swipe gestures
  - Edge swipe to open sidebar
  - Touch target size optimization
  - Reduced motion preference support

- **Thread Pagination**
  - `usePaginatedThreads` hook for large thread lists
  - Infinite scroll with `useInfiniteScroll` hook
  - `LoadMoreButton` and `InfiniteScrollSentinel` components

- **Streaming Skeleton Components**
  - `StreamingSkeleton` for AI response loading state
  - `LoadingDots` and `TypingIndicator` animations
  - `ResponseSkeleton` with animated gradient overlay

- **Centralized Error Handling**
  - `ErrorCategory` enum for error classification
  - `withRetry` function with exponential backoff
  - `safeAsync` wrapper for graceful error handling
  - User-friendly error messages and toast formatting

- **Theme Utilities**
  - `useEnhancedTheme` hook with toggle/cycle functions
  - `useSystemTheme` for OS preference detection
  - `useThemeTransition` for smooth theme switching
  - `useContrastColors` for accessibility-compliant colors

### Changed
- **Sidebar Layout Improvements**
  - New Thread and Temp Chat buttons now in same row
  - Search button moved below action buttons
  - Temporary threads filtered from date groups
  - Pinned threads exclude temporary chats

- **Logging Standardization**
  - Replaced `console.error/warn/log` with structured `logger` calls
  - Silent failures for non-critical operations (clipboard, speech)
  - Debug-level logging for stream completion and abort events

- **Performance Optimizations**
  - Reduced batch process interval from 500ms to 100ms
  - Request deduplication with hash tracking
  - Improved perceived latency for thread updates

- **ESLint Configuration**
  - Migrated to flat config format (`eslint.config.js`)
  - Added TypeScript, React, and React Hooks plugins
  - Configured proper rule sets for different file types

### Technical Details
**New Components**:
- `TemporaryChatToggle`, `TemporaryChatBadge`, `TemporaryChatBanner`
- `RateLimitExceeded`, `RateLimitBanner`
- `KeyboardShortcutsHelp`, `ShortcutBadge`, `ShortcutHint`
- `ExportImportMenu`
- `LoadMoreButton`, `InfiniteScrollSentinel`, `PaginationInfo`
- `StreamingSkeleton`, `LoadingDots`, `TypingIndicator`, `ResponseSkeleton`

**New Hooks**:
- `useKeyboardShortcuts`, `useMobileSidebar`, `useSwipeGesture`
- `usePaginatedThreads`, `useInfiniteScroll`
- `useEnhancedTheme`, `useSystemTheme`, `useThemeTransition`
- `useTouchTargetSize`, `usePrefersReducedMotion`

**New Utilities**:
- Rate limiting: `checkRateLimit`, `createRateLimitMiddleware`
- Error handling: `categorizeError`, `createAppError`, `withRetry`
- Export: `downloadThreadAsJson`, `downloadThreadAsMarkdown`

---

## [Previous Release] - 2025-10-01

### Added
- **Appwrite Cloud Persistence**: Full chat synchronization for logged-in users
  - Automated database setup script (`scripts/setup-appwrite.ts`)
  - Server-side persistence layer with node-appwrite SDK
  - REST API endpoints for thread CRUD operations
  - Client-side remote sync with auth-triggered sync
  - Chat serialization utilities for JSON-safe data transfers
  - Branch selection tracking and conversation computation
  - Comprehensive setup documentation
- **Speech-to-Text Composer Controls**
  - In-browser microphone capture powered by the Web Speech API
  - Live transcript preview with accessible status updates
  - Seamless insertion of dictated text into the Tiptap composer
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
- Branch rewrites now render in-place with synchronized branch switchers and arrow-key navigation in chat actions

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
