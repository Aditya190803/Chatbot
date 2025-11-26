### 1. Mobile Enter Key Behavior
- **Status:** 🔴 Critical
- **Issue:** Mobile devices should send message on newline instead of Enter key
- **Files:** `packages/common/components/chat-input/`, `packages/common/hooks/use-chat-input.ts`
- **Action Items:**
    - [ ] Detect mobile/touch devices
    - [ ] Disable Enter-to-send on mobile (use newline instead)
    - [ ] Add send button as primary action on mobile
    - [ ] Test on iOS and Android devices
    - [ ] Handle landscape/portrait orientation changes

### 2. Deep Research Mode Not Working
- **Status:** 🔴 Critical
- **Issue:** Deep research mode appears broken - likely API key routing issue where same key is used everywhere
- **Files:** `packages/ai/workflow/tasks/`, `packages/ai/providers.ts`
- **Action Items:**
    - [ ] Debug API key retrieval in workflow tasks (reflector, planner, writer, etc.)
    - [ ] Ensure correct provider keys are used for each task
    - [ ] Add proper error handling for missing API keys per provider
    - [ ] Test deep research flow end-to-end

---

## 🟠 Important Improvements (Medium Priority)

### 5. Chat Response Latency Optimization
- **Status:** 🟡 In Progress
- **Files:** `packages/common/store/chat.store.ts`, `packages/common/hooks/agent-provider.tsx`
- **Action Items:**
  - [ ] Optimize IndexedDB batch writes (current: `BATCH_PROCESS_INTERVAL = 500ms`)
  - [ ] Implement request deduplication for streaming updates
  - [ ] Add skeleton/placeholder UI during initial stream
  - [ ] Profile and optimize `handleThreadItemUpdate` callback
  - [ ] Consider web worker for heavy processing

### 9. Temporary Chat Sessions
- **Status:** 🟡 Partial (isTemporary flag exists)
- **Files:** `packages/common/store/chat.store.ts`
- **Action Items:**
  - [ ] Add UI toggle for temporary mode
  - [ ] Ensure temporary threads don't sync to cloud
  - [ ] Auto-cleanup temporary threads on session end
  - [ ] Add visual indicator for temporary chats

### 10. Remove Excessive Console Logging
- **Status:** 🔧 Tech Debt
- **Impact:** ~50+ console.log/error/warn statements in production code
- **Action Items:**
  - [ ] Replace with structured logger (`packages/shared/logger.ts`)
  - [ ] Add log levels (debug, info, warn, error)
  - [ ] Remove debug logs before production builds
  - [ ] Add error tracking (e.g., Sentry integration)

### 11. Add Unit & Integration Tests
- **Status:** 🔴 Missing
- **Impact:** No test files found in codebase
- **Action Items:**
  - [ ] Set up Vitest/Jest testing framework
  - [ ] Add tests for core utilities (`packages/shared/utils/`)
  - [ ] Add tests for chat store actions
  - [ ] Add API route integration tests
  - [ ] Add component tests for critical UI

### 12. Error Handling Improvements
- **Status:** 🔧 Tech Debt
- **Files:** `apps/web/app/error.tsx`, various components
- **Action Items:**
  - [ ] Implement consistent error boundary strategy
  - [ ] Add user-friendly error messages
  - [ ] Add retry mechanisms for transient failures
  - [ ] Implement proper error recovery in streams

### 13. TypeScript Strict Mode
- **Status:** 🔧 Tech Debt
- **Action Items:**
  - [ ] Enable strict mode in tsconfig
  - [ ] Fix type errors (any types, missing types)
  - [ ] Add proper types for API responses
  - [ ] Remove `as any` type assertions

### 14. Provider Instance Caching Bug
- **Status:** 🐛 Bug
- **Files:** `packages/ai/providers.ts`
- **Issue:** Missing `break` statements in switch case causes fallthrough
- **Action Items:**
  - [ ] Fix switch case fallthrough in `getProviderInstance()`
  - [ ] Add unit tests for provider factory

---

## 📱 Mobile & UX Improvements

### 15. Mobile Sidebar Behavior
- **Status:** 🟡 Enhancement
- **Files:** `packages/common/components/side-bar.tsx`
- **Action Items:**
  - [ ] Improve mobile hamburger menu transitions
  - [ ] Add swipe gestures for sidebar
  - [ ] Optimize touch targets for mobile

### 16. Pagination for Thread History
- **Status:** 📋 Planned
- **Files:** `packages/common/components/side-bar.tsx` (TODO comment exists)
- **Action Items:**
  - [ ] Implement infinite scroll for thread list
  - [ ] Add "Load more" button as fallback
  - [ ] Optimize for large thread counts (100+)

### 17. Keyboard Shortcuts
- **Status:** 🟡 Enhancement  
- **Action Items:**
  - [ ] Document existing shortcuts (Cmd+K for search)
  - [ ] Add Escape to close modals
  - [ ] Add keyboard navigation for thread list
  - [ ] Add shortcut for new thread (Cmd+N)

---

## 🔒 Security & Performance

### 18. API Key Security
- **Status:** 🔧 Review Needed
- **Files:** `packages/common/store/api-keys.store.ts`
- **Action Items:**
  - [ ] Ensure API keys are stored securely (localStorage encryption?)
  - [ ] Add key validation before saving
  - [ ] Implement key rotation reminders

### 19. Rate Limiting
- **Status:** 🟡 Partial
- **Files:** API routes in `apps/web/app/api/`
- **Action Items:**
  - [ ] Implement proper rate limiting per user
  - [ ] Add rate limit headers to responses
  - [ ] Create user-friendly rate limit exceeded messages

### 20. Bundle Size Optimization
- **Status:** 📋 Review
- **Action Items:**
  - [ ] Analyze bundle with `@next/bundle-analyzer`
  - [ ] Code-split heavy dependencies (moment.js → day.js?)
  - [ ] Lazy load non-critical components

---

## 📚 Documentation

### 21. Update README
- **Status:** 🟡 Enhancement
- **Action Items:**
  - [ ] Add API key setup instructions
  - [ ] Document environment variables
  - [ ] Add contribution guidelines
  - [ ] Update tech stack section

### 22. Add JSDoc Comments
- **Status:** 📋 Planned
- **Action Items:**
  - [ ] Document public APIs in packages
  - [ ] Add inline comments for complex logic
  - [ ] Generate API documentation

---

## 📊 Priority Matrix

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| P0 | Deep Research Mode | High | Medium |
| P0 | Image Generation | High | Medium |
| P0 | Thinking Display | High | Low |
| P0 | Mobile Enter Key | High | Low |
| P1 | Response Latency | High | High |
| P1 | Stop Button Position | Medium | Low |
| P1 | Provider Switch Bug | Medium | Low |
| P2 | Cloud Sync | Medium | Medium |
| P3 | Document Uploads | Medium | High |
| P3 | Add Tests | High | High |

---

## 🎯 Sprint Suggestions

### Sprint 1 (Critical Fixes)
- Deep Research Mode debugging
- Image Generation fixes  
- Thinking display styling
- Mobile Enter Key behavior
- Provider switch bug fix

### Sprint 2 (UX Polish)
- Stop button positioning
- Response latency optimization
- Cloud sync reliability

### Sprint 3 (Features)
- Temporary chat improvements
- Mobile UX improvements
- Document upload support

### Sprint 4 (Tech Debt)
- Add test coverage
- Remove console logs
- TypeScript strict mode
- Documentation updates