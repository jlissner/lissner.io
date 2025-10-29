# Configuration Directory

This directory contains all configuration files for the Lissner Family Photos project.

## Files

- **`.eslintrc.js`** - ESLint configuration for code linting
- **`postcss.config.js`** - PostCSS configuration for CSS processing
- **`tailwind.config.js`** - Tailwind CSS configuration and theme
- **`tsconfig.json`** - TypeScript configuration for the entire project
- **`tsconfig.node.json`** - TypeScript configuration for Node.js tools
- **`vite.config.js`** - Vite build tool configuration

## Usage

All npm scripts automatically reference these config files:

```bash
npm run dev:frontend     # Uses vite.config.js
npm run build           # Uses vite.config.js + tailwind.config.js + postcss.config.js
npm run lint            # Uses .eslintrc.js + tsconfig.json
npm run test            # Uses vite.config.js
```

## Path Configuration

Config files use relative paths to reference the project structure:
- `../ui/` - Frontend code directory
- `../api/` - Backend code directory
- `../` - Project root directory
