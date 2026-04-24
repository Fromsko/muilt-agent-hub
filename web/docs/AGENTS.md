# AGENTS.md - Documentation Rules

This file contains rules and guidelines for managing documentation in the gateway-manager project.

## Documentation Structure

- `docs/llms/` - LLM-related documentation and resources
- `docs/refs/` - Reference materials and external documentation
- `docs/reports/` - Analysis reports, review notes, test summaries, audit outputs
- `docs/designs/` - Design documents and specifications
- `docs/plans/` - Project plans and roadmaps
- `docs/maps/` - Architecture maps and diagrams

## Documentation Guidelines

1. Keep documentation clear and concise
2. Use Markdown formatting consistently
3. Update documentation when code changes
4. Include examples where helpful
5. Maintain consistency with existing documentation style

## File Naming

- Use lowercase with hyphens for multi-word names
- Use descriptive names that reflect content
- Keep names relatively short but meaningful
- Analysis and review notes should use the `*-report.md`, `*-review.md`, or `*-note.md` suffixes

## Content Standards

- Provide context and purpose for each document
- Include relevant code examples when applicable
- Link to related documentation when helpful
- Keep content up-to-date with the codebase

## Placement Rules

- Standalone process notes, UI/UX reviews, test summaries, and audit-style outputs should live under `docs/reports/`
- `docs/refs/` is only for external references, upstream docs, and collected source material
- `docs/llms/` is only for long-form LLM-friendly documentation snapshots
- Avoid placing report-style Markdown files directly under `docs/` unless they define docs-wide rules such as this file
