# UI Directory Structure Migration Guide

## Overview
This guide outlines the migration from the current flat structure to a more organized structure with UI code in a dedicated `ui/` directory.

## New Directory Structure

```
project-root/
├── api/                    # Backend API (unchanged)
├── ui/                     # All frontend code
│   ├── app/               # Next.js app directory (moved from root)
│   ├── components/        # React components (moved from root)
│   ├── hooks/            # Custom React hooks (moved from root) 
│   ├── lib/              # Client libraries (moved from root)
│   ├── utils/            # Frontend utilities (moved from root)
│   └── types/            # TypeScript types (new location)
├── scripts/              # Build/deployment scripts (unchanged)
├── coverage/             # Test coverage (unchanged)
├── src/                  # Test setup (unchanged)
└── config files          # Root config files (unchanged)
```

## Migration Steps

### 1. Create UI Directory Structure
```bash
mkdir ui
mkdir ui/types
```

### 2. Move Directories
```bash
# Move frontend directories into ui/
mv app ui/
mv components ui/
mv hooks ui/
mv lib ui/
mv utils ui/

# Create types directory and move component types
mkdir ui/types
mv components/types/* ui/types/
```

### 3. Update Configuration Files

#### tsconfig.json
Update paths to include the new ui directory structure.

#### next.config.js  
Update any path references if needed.

#### package.json
Update scripts if they reference moved directories.

### 4. Update Import Paths

All imports that reference:
- `@/components/*` → `@/ui/components/*`
- `@/hooks/*` → `@/ui/hooks/*`  
- `@/lib/*` → `@/ui/lib/*`
- `@/utils/*` → `@/ui/utils/*`

### 5. Update Test Files
Update test imports to reflect new structure.

## Benefits

1. **Clear Separation**: Frontend and backend code are clearly separated
2. **Better Organization**: Related UI code is grouped together
3. **Scalability**: Easier to manage as the project grows
4. **Consistency**: Matches the API directory pattern

## Files That Stay at Root Level

- Configuration files (tsconfig.json, next.config.js, etc.)
- Package files (package.json, package-lock.json)
- Documentation (README.md, TODO.md)
- Deployment and scripts
- Test configuration (src/test/)

## Import Path Examples

### Before:
```typescript
import { PhotoGrid } from '@/components/PhotoGrid'
import { usePhotoData } from '@/hooks/usePhotoData'
import { api } from '@/lib/api'
import { photoUtils } from '@/utils/photoUtils'
```

### After:
```typescript
import { PhotoGrid } from '@/ui/components/PhotoGrid'
import { usePhotoData } from '@/ui/hooks/usePhotoData'
import { api } from '@/ui/lib/api'
import { photoUtils } from '@/ui/utils/photoUtils'
```
