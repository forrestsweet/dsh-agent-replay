# Security Policy

## Supported versions

Security fixes are provided for the latest released version.

## Reporting a vulnerability

Please do not open a public issue for redaction bypasses, unintended session-data exposure, unsafe exported HTML, dependency compromise, or another security-sensitive problem.

Use [GitHub private vulnerability reporting](https://github.com/forrestsweet/dsh-agent-replay/security/advisories/new). Include:

- affected Agent Replay and DeepSeek Harness versions;
- a minimal reproduction with synthetic data only;
- the impact and whether exported content is involved;
- any suggested mitigation.

You should receive an acknowledgment within 72 hours and a status update within 7 days. Please allow time for a fix before public disclosure.

## Export responsibility

Automatic redaction covers common patterns but cannot understand every private value. Review every exported replay before sharing it, and avoid attaching a real sensitive session even to a private report when a synthetic reproduction is possible.
