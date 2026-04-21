---
status: proposed
date: 2026-04-21
decision-makers: [joe]
---

# Enable PWA features for improved mobile experience

## Context and Problem Statement

Mobile users currently need to navigate to the website, open the upload modal, and manually select files to upload photos. This friction reduces engagement. Modern web standards enable a native-app-like experience.

## Decision Drivers

- Web Share Target API enables receiving shared photos from other apps
- PWA manifest makes the app installable on home screen
- Service worker enables background uploads and offline capability
- Better mobile UX increases photo upload frequency

## Considered Options

1. **Full PWA** — manifest.json + service worker + Share Target API
2. **Partial PWA** — manifest.json only (no service worker)
3. **No PWA** — keep current browser-based upload

## Decision Outcome

Chosen option: "Full PWA", because Share Target API is the primary driver and requires full PWA support. Service worker enables reliable background uploads which is important for mobile.

### Consequences

- Good: Users can share photos directly from Camera/Photos apps
- Good: App feels like a native app when installed
- Good: Background uploads survive app switching
- Bad: Requires HTTPS (already configured)
- Bad: Service worker caching requires careful cache strategy

### Cost of Ownership

- **Maintenance burden**: Service worker updates require cache invalidation strategy, manifest must be kept current
- **Ongoing benefits**: Improved mobile engagement, reduced friction for photo uploads
- **Sunset criteria**: If browser support drops significantly or if native apps are developed

### Confirmation

Verify with mobile device testing that:

1. Share Target works on iOS Safari and Android Chrome
2. "Add to Home Screen" prompt appears on supported browsers
3. App launches in standalone mode after installation
