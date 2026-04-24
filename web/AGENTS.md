# AGENTS.md

**Tech Stack**: React 19 + Rsbuild + Ant Design 6 + TailwindCSS V4 + TypeScript + TanStack Router + TanStack Query + Zustand + Zod + MSW + motion (framer-motion) + lucide-react

**Architecture**: 模板化管理系统框架，配置化主题，结构化日志，请求链路追踪

## Commands

- `bun run dev` - Start dev server (http://localhost:3000)
- `bun run build` - Production build to dist/
- `bun run build:go` - Build for Go embed
- `bun run preview` - Preview production build
- `bun run test` - Run tests
- `bun run test:watch` - Run tests in watch mode

## Directory Structure

```
src/
├── routes/           # TanStack Router file routes
├── components/       # Reusable UI components
│   ├── Layout/       # MainLayout, Sidebar, Header, UserMenu, AppFooter
│   ├── DataTable/    # Enhanced table with skeleton & empty state
│   ├── FormModal/    # Form + Modal integration
│   ├── FilterToolbar/# Responsive filter bar
│   ├── PageContainer/# Page wrapper with title & animation
│   ├── ErrorBoundary/# AI-friendly error boundary
│   ├── Auth/         # Permission-based rendering
│   ├── Aurora/       # Login page background effect
│   └── NotFound/     # 404 page
├── core/             # Core infrastructure
│   ├── http/         # HTTP client, errors, interceptors, request tracker
│   ├── logger/       # Structured logging, AI export, log collector
│   ├── theme/        # Configurable theme engine (presets, tokens, provider)
│   ├── motion/       # Animation system (presets, page transition, list animation)
│   ├── icons/        # Icon registry (lucide-react + custom)
│   └── auth/         # Authentication guard, permissions, session
├── stores/           # Zustand stores (auth, settings)
├── api/              # API definitions (schemas, endpoints)
├── hooks/            # Custom hooks
├── utils/            # Utilities (constants, menu config, helpers)
├── mocks/            # MSW mock handlers
└── types/            # Global type definitions
```

## Adding a New Page

1. Create `src/routes/_auth/<page-name>/index.tsx`
2. Use `createFileRoute` with `staticData: { breadcrumb: '...' }`
3. Add menu item in `src/utils/app-menu.ts` with icon and permissions
4. Wrap content with `<PageContainer>` component

## Key Patterns

- **Routing**: TanStack Router file-based routing, `_auth` layout for protected routes
- **State**: Zustand with persist middleware, `createPersistentStore` factory
- **API**: `httpClient` with Zod validation, structured error classes
- **Theme**: Configurable via `core/theme/presets.ts`, supports custom presets
- **Animation**: motion (framer-motion) with reduced-motion respect
- **Logging**: Structured JSON logs, AI-friendly export, request tracing
- **Icons**: Unified via `AppIcon` component, register custom icons
- **Auth**: Permission-based with `<Auth>` component and `usePermission` hook

## Styling

- **Ant Design**: Component library with Design Token system
- **TailwindCSS V4**: Utility-first CSS with @layer directive
- **CSS Layering**: `@layer antd, tailwind` ensures correct cascade order
- **Theme switching**: `data-theme` attribute on `<html>` for dark mode

## Build for Go Embed

```bash
bun run build:go
# Output: dist/
# Go: use embed.FS to serve dist/ with SPA fallback to index.html
```

## Documentation

- `docs/refs/` - Reference materials (Ant Design, Rsbuild, Tailwind, Rstest)
- `docs/llms/` - LLM-friendly full documentation files
