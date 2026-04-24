# Rsbuild project

## Setup

Install the dependencies:

```bash
bun install
```

## Get started

Start the dev server, and the app will be available at [http://localhost:3000](http://localhost:3000).

```bash
bun run dev
```

Build the app for production:

```bash
bun run build
```

Preview the production build locally:

```bash
bun run preview
```

## Testing

Run component and unit tests:

```bash
bun run test
```

Run Playwright end-to-end coverage for the full app:

```bash
bun run test:e2e
```

Open the Playwright UI runner:

```bash
bun run test:e2e:ui
```

The e2e suite covers login, dashboard access protection, user CRUD flows, filtering, settings persistence, and logout.

## Learn more

To learn more about Rsbuild, check out the following resources:

- [Rsbuild documentation](https://rsbuild.rs) - explore Rsbuild features and APIs.
- [Rsbuild GitHub repository](https://github.com/web-infra-dev/rsbuild) - your feedback and contributions are welcome!
