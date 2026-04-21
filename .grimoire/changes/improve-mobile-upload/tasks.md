# Tasks: improve-mobile-upload

## Implementation

- [x] 1.1 Create web app manifest (manifest.json) with PWA configuration
- [x] 1.2 Add service worker for background sync and caching
- [x] 1.3 Implement Web Share Target API handler in index.html
- [x] 1.4 Add "Take Photo" button with camera access in upload modal
- [x] 1.5 Update Vite config for PWA plugin

## Resumable Uploads

- [x] 2.1 Create chunked upload API endpoint on server
- [x] 2.2 Add upload progress tracking with chunk support
- [x] 2.3 Implement client-side chunk upload with retry logic
- [x] 2.4 Add pause/resume functionality for in-progress uploads

## Verification

- [ ] 3.1 Verify Share Target works on iOS Safari
- [ ] 3.2 Verify Share Target works on Android Chrome
- [ ] 3.3 Verify "Add to Home Screen" prompt appears
- [ ] 3.4 Verify app launches in standalone mode
- [ ] 3.5 Test upload resumption after network drop
- [ ] 3.6 Test camera capture on mobile
