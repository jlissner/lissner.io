# UI (`family-image-manager` / Vite + React)

## Layout (bulletproof-react style)

| Path | Role |
|------|------|
| `src/app/` | Application shell: default export `app.tsx`, `provider.tsx` (global providers), `authenticated-app.tsx` (nav + page composition). **Only here** should multiple features be wired together. |
| `src/config/` | Global config with **no** imports from `features/` or `app/` (e.g. `nav.ts`). |
| `src/components/` | **Shared** presentation + providers used across features (e.g. `components/activity/`). Must not import from `features/` or `app/`. |
| `src/components/ui/` | **Reusable primitives** — `Button`, `Modal*` (compound), `Alert`, `Banner`, `Card`, `NavMenu` / `NavMenuItem`, `DropdownMenu` / `DropdownMenuItem`. Styles stay in `styles/components.css` (`.btn`, `.modal`, etc.); components map props → those classes. |
| `src/lib/` | Shared utilities (e.g. `utils.ts` `cn()` for class names). |
| `src/features/<feature>/` | Vertical slices: `components/`, `hooks/`, `types/`, `utils/` — only what that feature needs. |
| `src/hooks/`, `src/types/`, `src/utils/` | Cross-cutting shared code (create subfolders/files as needed). |

## Rules of thumb

1. **Compose features in `app/`** — e.g. `AuthenticatedApp` imports pages from `features/*`; features do not import each other.
2. **No barrel `index.ts` exports** for features — import concrete files so Vite can tree-shake (see bulletproof-react docs).
3. **Import alias** — use `@/` for `src/`, e.g. `import { X } from "@/features/media/components/home-page"`.
4. **File names** — kebab-case; exported React components stay PascalCase.
5. **ESLint** — `import/no-restricted-paths` enforces layering for `ui/src` (see root `eslint.config.js`).

## Commands

- Dev: `npm run dev` (from repo root) or `vite --config ui/vite.config.ts`
- Build: `npm run build` (root `tsc -b` + Vite)
