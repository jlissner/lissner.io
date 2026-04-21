---
status: complete
---

# Change: Improve mobile photo upload experience

## Why

Uploading photos from a phone requires navigating to the website, finding the upload button, and selecting files. Modern PWA standards enable a much better experience: share photos directly from the Camera or Photos app, install the app on the home screen, and handle large uploads reliably on mobile networks.

## Assumptions

- [ ] Site is served over HTTPS (required for PWA and Share Target API)
- [ ] Server can handle chunked/resumable uploads
- [ ] Service worker caching won't interfere with real-time features

## Pre-Mortem

- Share Target not supported in all browsers: graceful degradation, upload still works via browser
- Service worker caching breaks real-time updates: use appropriate cache strategies
- Large uploads fail on mobile networks: implement retry logic with exponential backoff

## Feature Changes

- **ADDED** `upload/mobile-upload.feature` — Share Target API, PWA manifest, camera capture
- **ADDED** `upload/resumable-uploads.feature` — Chunked uploads with progress and retry

## Scenarios Added

- `mobile-upload.feature`: "User shares photo from iOS Photos app", "User shares photo from Android gallery", "User takes photo directly", "App is installable on home screen"
- `resumable-uploads.feature`: "Upload resumes after network drop", "Upload shows accurate progress"

## Decisions

- **ADDED** `NNNN-pwa-installable.md` — Web App Manifest configuration
