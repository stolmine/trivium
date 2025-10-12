# Frontend Dependencies Setup Documentation

## Overview
This document details the frontend dependencies installed for the Trivium application, following the architecture specified in architecture-frontend.md.

## Installation Date
October 12, 2025

## Installed Dependencies

### 1. State Management - Zustand
**Package:** `zustand@^5.0.8`
**Type:** Runtime dependency
**Purpose:** Lightweight state management library for React
**Documentation:** https://zustand.docs.pmnd.rs/

### 2. Rich Text Editor - Lexical
**Packages:**
- `lexical@^0.37.0` - Core Lexical framework
- `@lexical/react@^0.37.0` - React bindings and components

**Type:** Runtime dependencies
**Purpose:** Extensible text editor framework for building rich content editors
**Documentation:** https://lexical.dev/

### 3. UI Components - shadcn/ui with Tailwind CSS v4
**Core UI Dependencies:**
- `class-variance-authority@^0.7.1` - Utility for managing component variants
- `clsx@^2.1.1` - Utility for constructing className strings
- `tailwind-merge@^3.3.1` - Utility for merging Tailwind CSS classes
- `lucide-react@^0.545.0` - Icon library

**Development Dependencies:**
- `tailwindcss@^4.1.14` - Utility-first CSS framework (v4)
- `autoprefixer@^10.4.21` - PostCSS plugin for vendor prefixes
- `postcss@^8.5.6` - CSS transformation tool
- `tw-animate-css@^1.4.0` - Animation utilities for Tailwind v4
- `@types/node@^24.7.2` - TypeScript definitions for Node.js

**Type:** Mixed (runtime and development)
**Purpose:** Component library infrastructure using Radix UI primitives with Tailwind CSS styling
**Documentation:** https://ui.shadcn.com/

## Configuration Files Created/Modified

### 1. /Users/why/repos/trivium/components.json
shadcn/ui configuration file specifying:
- Style: "new-york"
- TypeScript: Enabled
- Tailwind CSS integration with v4 support
- Path aliases for components and utilities
- Icon library: lucide-react

### 2. /Users/why/repos/trivium/tsconfig.json
Updated with path aliases:
```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

### 3. /Users/why/repos/trivium/vite.config.ts
Added path resolution:
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

### 4. /Users/why/repos/trivium/src/index.css
Created with Tailwind CSS v4 configuration:
- `@import "tailwindcss"` - Main Tailwind import
- `@import "tw-animate-css"` - Animation utilities
- `@custom-variant dark` - Dark mode support
- `@theme` blocks with CSS variables for light/dark color schemes
- Complete color palette using both HSL and OKLCH color spaces

### 5. /Users/why/repos/trivium/src/main.tsx
Updated to import index.css for Tailwind styles

### 6. /Users/why/repos/trivium/src/lib/utils.ts
Created utility file with `cn()` helper function for merging Tailwind classes

## Key Configuration Choices

### Tailwind CSS Version
- **Version 4.1.14** was installed (latest stable v4)
- Uses new `@import` syntax instead of traditional config file
- CSS-based theme configuration using `@theme` directive
- Modern color spaces (OKLCH) for better color management
- No separate tailwind.config.js file (v4 uses CSS-based config)

### shadcn/ui Style
- **Style:** "new-york" (default, clean design)
- **Base Color:** neutral
- **CSS Variables:** Enabled for theme customization
- **No prefix** for Tailwind utilities

### Path Aliases
All imports use `@/` prefix for cleaner imports:
- `@/components` - UI components
- `@/lib` - Utility functions
- `@/hooks` - React hooks
- `@/components/ui` - shadcn/ui components

## Browser Requirements
Tailwind CSS v4 requires modern browsers:
- Safari 16.4+
- Chrome 111+
- Firefox 128+

## Next Steps

### Adding UI Components
To add shadcn/ui components:
```bash
npx shadcn@latest add [component-name]
```

Example:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

### Zustand Store Usage
Stores should be created in `/Users/why/repos/trivium/src/lib/stores/` following the existing pattern.

### Lexical Editor Integration
Lexical components should be implemented in `/Users/why/repos/trivium/src/lib/components/editor/` using `@lexical/react` hooks and components.

## Verification Status

### Successful Installations
- All npm packages installed successfully
- No dependency conflicts detected
- TypeScript types available for all packages

### Configuration Validation
- Path aliases working correctly
- Tailwind CSS v4 configuration validated by shadcn/ui CLI
- Component infrastructure ready for use

### Known Issues
Pre-existing TypeScript errors in component stubs (unrelated to dependency installation):
- Unused destructured elements in component files
- Unused type imports in store files

These are expected for stub components and will resolve when components are implemented.

## Package Manager
Using **npm** (not yarn or pnpm) for consistency with project setup.

## Total Dependencies Added
- **Runtime dependencies:** 7 packages
- **Development dependencies:** 5 packages
- **Total new packages (including transitive):** 111 packages

## Installation Workaround
Note: Due to npm cache permission issues, installations used `--cache /tmp/npm-cache` flag. This does not affect the final installation in node_modules.
