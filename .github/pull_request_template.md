## What changed

<!-- Explain the user-visible outcome and why it belongs in Agent Replay. -->

## Verification

- [ ] `pnpm check`
- [ ] `npm pack --dry-run --ignore-scripts`
- [ ] Tested against a real, privacy-safe Harness session when UI behavior changed
- [ ] Updated both English and Chinese docs when user-facing documentation changed
- [ ] Added a changelog entry when appropriate

## Privacy and UI

- [ ] No private session data, secrets, or personal paths are included
- [ ] Export selection/redaction behavior is covered by tests when changed
- [ ] UI changes reuse official Harness primitives, semantic tokens, and interaction states
- [ ] Privacy-sensitive network or telemetry behavior is clearly disclosed and reviewed
