
### 1. Chat Response Latency Optimization
- **Status:** 🟡 In Progress
- **Files:** `packages/common/store/chat.store.ts`, `packages/common/hooks/agent-provider.tsx`
- **Action Items:**
  - [ ] Optimize IndexedDB batch writes (current: `BATCH_PROCESS_INTERVAL = 500ms`)
  - [ ] Implement request deduplication for streaming updates
  - [ ] Add skeleton/placeholder UI during initial stream
  - [ ] Profile and optimize `handleThreadItemUpdate` callback
  - [ ] Consider web worker for heavy processing

### 2. Temporary Chat Sessions
- **Status:** 🟡 Partial (isTemporary flag exists)
- **Files:** `packages/common/store/chat.store.ts`
- **Action Items:**
  - [ ] Add UI toggle for temporary mode
  - [ ] Ensure temporary threads don't sync to cloud
  - [ ] Auto-cleanup temporary threads on session end
  - [ ] Add visual indicator for temporary chats

### 3. Remove Excessive Console Logging
- **Status:** 🟡 In Progress
- **Impact:** Reduced from ~100+ to 16 console.log/error/warn statements
- **Action Items:**
  - [ ] Remaining 16 console statements in UI/UX code (clipboard, MDX rendering) - lower priority

### 4. Add Unit & Integration Tests
- **Status:** 🟡 In Progress
- **Impact:** 55 tests passing for core utilities
- **Action Items:**
  - [ ] Add tests for chat store actions
  - [ ] Add API route integration tests
  - [ ] Add component tests for critical UI
  - [ ] Add unit tests for provider factory

### 5. Error Handling Improvements
- **Status:** 🔧 Tech Debt
- **Files:** `apps/web/app/error.tsx`, various components
- **Action Items:**
  - [ ] Implement consistent error boundary strategy
  - [ ] Add user-friendly error messages
  - [ ] Add retry mechanisms for transient failures
  - [ ] Implement proper error recovery in streams

### 6. TypeScript Strict Mode
- **Status:** 🔧 Tech Debt
- **Action Items:**
  - [ ] Enable strict mode in tsconfig
  - [ ] Fix type errors (any types, missing types)
  - [ ] Add proper types for API responses
  - [ ] Remove `as any` type assertions

### 7. Mobile Sidebar Behavior
- **Status:** 🟡 Enhancement
- **Files:** `packages/common/components/side-bar.tsx`
- **Action Items:**
  - [ ] Improve mobile hamburger menu transitions
  - [ ] Add swipe gestures for sidebar
  - [ ] Optimize touch targets for mobile

### 8. Pagination for Thread History
- **Status:** 📋 Planned
- **Files:** `packages/common/components/side-bar.tsx` (TODO comment exists)
- **Action Items:**
  - [ ] Implement infinite scroll for thread list
  - [ ] Add "Load more" button as fallback
  - [ ] Optimize for large thread counts (100+)

### 9. Keyboard Shortcuts
- **Status:** 🟡 Enhancement  
- **Action Items:**
  - [ ] Document existing shortcuts (Cmd+K for search)
  - [ ] Add Escape to close modals
  - [ ] Add keyboard navigation for thread list
  - [ ] Add shortcut for new thread (Cmd+N)

### 10. API Key Security
- **Status:** 🔧 Review Needed
- **Files:** `packages/common/store/api-keys.store.ts`
- **Action Items:**
  - [ ] Ensure API keys are stored securely (localStorage encryption?)
  - [ ] Add key validation before saving
  - [ ] Implement key rotation reminders

### 11. Rate Limiting
- **Status:** 🟡 Partial
- **Files:** API routes in `apps/web/app/api/`
- **Action Items:**
  - [ ] Implement proper rate limiting per user
  - [ ] Add rate limit headers to responses
  - [ ] Create user-friendly rate limit exceeded messages

