# Contributing

Thanks for helping make Agent Replay useful to the DeepSeek Harness community.

## Before opening an issue

- Search existing issues first.
- Use the bug form for reproducible defects and the feature form for proposals.
- Never include session exports, tokens, personal paths, or other private data in a public issue.
- Report redaction or data-exposure problems through [SECURITY.md](SECURITY.md).

## Local development

```bash
pnpm install
pnpm check
```

To test inside Harness:

```bash
pnpm build
dsh plugin --profile web add .
dsh web
```

## Pull requests

1. Keep each pull request focused on one change.
2. Add or update tests for privacy and data-selection behavior.
3. Update both `README.md` and `README.en.md` when user-facing documentation changes.
4. Run `pnpm check` and `npm pack --dry-run --ignore-scripts`.
5. Describe how you verified the change.

## UI principles

Agent Replay is a native Harness surface, not a separate dashboard.

- Reuse `@deepseek-ai/dsh-client-ui-primitives` before adding custom controls.
- Use Harness `--dsw-*` semantic tokens and the dimensions/states established by `ui-trajectory`.
- Support light mode, dark mode, reduced motion, keyboard focus, and narrow windows.
- Treat telemetry and outbound calls as privacy-sensitive changes requiring explicit review.
- Public README illustrations must be clearly illustrative; product screenshots must come from real, privacy-safe sessions.

## Commit and release notes

Use clear imperative commit subjects. Add user-visible changes to `CHANGELOG.md` under `Unreleased`.

By contributing, you agree that your contribution is licensed under the repository's MIT License and that you will follow the [Code of Conduct](CODE_OF_CONDUCT.md).
