# Evident

Evident is a developer-first repository intelligence CLI. It orchestrates security
signals, normalizes findings, removes duplicates, discovers technical evidence,
maps that evidence to technical controls, and produces actionable local reports.

Evident does not replace Semgrep, Trivy, TruffleHog, npm audit, or GitHub security
features. It provides the layer above them: one scan model, source attribution,
repository context, evidence references, and regression-friendly fingerprints.

## Current Capabilities

- Scan Node.js and TypeScript repositories.
- Detect package managers, Express, NestJS, React, Vue, Next.js, GitHub Actions,
  Docker files, Heroku configuration, monorepo workspaces, and Git metadata.
- Run repository-native governance and CI/CD rules with `--native-only`.
- Run or detect npm audit, Semgrep, Trivy, TruffleHog, and GitHub configuration
  adapters. Missing tools are represented as incomplete coverage rather than a
  passing result.
- Normalize npm audit and TruffleHog output into a shared finding model.
- Deduplicate findings by secret fingerprint, CVE, and stable file/category signals.
- Preserve every contributing scanner source in merged findings.
- Discover workflow evidence and basic repository artifacts.
- Produce terminal, JSON, HTML, and SARIF 2.1.0 reports.
- Create and compare fingerprint-only baselines through the regression package.
- Enforce configured severity thresholds with process exit codes.

## Important Limitations

Evident evaluates technical implementation signals only. It does not certify an
organization as SOC 2, HIPAA, or otherwise compliant. Organizational controls,
production procedures, training, approvals, and audit evidence require human
review and are never treated as deterministic passes.

The SOC 2 pack currently contains an initial technical mapping set. HIPAA and OWASP
framework packs are planned extensions, not complete assessments.

## Requirements

- Node.js 20 or later
- pnpm 10 (for developing this repository)
- Git for commit metadata and future diff workflows

Optional scanner binaries:

- `npm` for `npm audit`
- `semgrep`
- `trivy`
- `trufflehog`

Run `evident doctor` to inspect the local environment and scanner availability.

## Quick Start

Install dependencies when developing Evident itself:

```bash
pnpm install
pnpm build
```

Build and run the CLI from this repository:

```bash
node apps/cli/dist/index.js init
node apps/cli/dist/index.js scan --native-only
```

During development, run the TypeScript source through `tsx`:

```bash
pnpm --filter @evident/cli dev scan --native-only
```

Once published, intended consumer usage is:

```bash
npx evident scan --native-only
npx evident scan --format terminal,json,html,sarif
```

## CLI Commands

### `evident init`

Creates `evident.config.yaml` and `.evidentignore` after inspecting the current
repository.

```bash
evident init
```

### `evident scan`

Runs a scan from the current working directory.

```bash
evident scan --native-only
evident scan --format terminal,json,html,sarif --output .evident/reports
evident scan --profile security --fail-on high
evident scan --scanner npm-audit,semgrep,trivy,trufflehog
```

Supported options:

| Option | Purpose |
| --- | --- |
| `--native-only` | Run Evident-native rules without external scanners. |
| `--profile <list>` | Comma-separated profiles such as `security,soc2`. |
| `--framework <list>` | Framework mapping packs to evaluate. |
| `--scanner <list>` | Select external scanner adapters. |
| `--format <list>` | `terminal`, `json`, `html`, or `sarif`. |
| `--output <dir>` | Report directory, default `.evident/reports`. |
| `--fail-on <list>` | Block on a configured severity threshold. |
| `--offline` | Request offline-compatible adapter behavior. |
| `--changed-only` | Reserved for changed-file scanning workflows. |
| `--base <ref>` | Enables baseline comparison when a local baseline exists. |
| `--timeout <seconds>` | Per-scanner process timeout. |
| `--ci` | Enables non-interactive CI behavior. |
| `--verbose` / `--quiet` | Control scan logging. |

### `evident doctor`

Checks Node.js, Git, npm, optional scanner binaries, Docker, and repository
detection without modifying the repository.

```bash
evident doctor
```

## Configuration

`evident init` generates YAML. The loader also supports JSON and TypeScript files.
Configuration files are searched as `evident.config.json`, `evident.config.yaml`,
`evident.config.yml`, or TypeScript/JavaScript equivalents.

```yaml
version: 1

project:
  name: climate-rx
  type: application

profiles:
  - security
  - soc2

scanners:
  npmAudit:
    enabled: true
  semgrep:
    enabled: true
    config:
      - p/owasp-top-ten
  trivy:
    enabled: true
    scanners:
      - vuln
      - misconfig
      - secret
  trufflehog:
    enabled: true
    verifiedOnly: true

policy:
  failOn:
    severity:
      - high
      - critical
    newFindingsOnly: true

privacy:
  sendSourceToAI: false
  redactSecrets: true
  redactIdentifiers: true

reporting:
  formats:
    - terminal
    - json
    - html
    - sarif
  outputDirectory: .evident/reports
```

## Native Rules

The current deterministic native rules focus on high-confidence repository and CI
signals:

- `SECURITY.md` presence
- `CODEOWNERS` presence
- package-manager lockfile presence
- GitHub Actions workflow presence
- apparent test step in CI workflows
- apparent build, lint, or typecheck step in CI workflows
- Dependabot configuration presence
- secret scanning step in CI workflows

Rules emit file-referenced findings using the same model as external scanners.
They are intentionally conservative; Evident does not try to replace general SAST.

## Reports

All reports are generated from the canonical `ScanResult` model.

- **Terminal:** concise scan summary for local use and CI logs.
- **JSON:** the canonical machine-readable result used by the CLI and SDK.
- **HTML:** self-contained report suitable for local viewing without a server.
- **SARIF:** file-location findings in SARIF 2.1.0 for code-scanning integrations.

Reports default to `.evident/reports/` and runtime output is intentionally ignored
by Git.

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Scan completed with no blocking findings. |
| `1` | Blocking findings matched the configured policy. |
| `2` | Invalid configuration. |
| `3` | Required scanner execution failed. |
| `4` | Partial scan because a required tool was unavailable. |
| `5` | Internal Evident error. |

## Architecture

```text
apps/cli
  -> @evident/core
       -> config + repository + adapters + normalizer
       -> deduplicator + rules + evidence + controls + regression
       -> reporters
  -> canonical ScanResult JSON
```

Core packages:

- `@evident/types`: Zod schemas and shared domain types.
- `@evident/config`: configuration search, parsing, validation, and defaults.
- `@evident/repository`: repository structure, framework, workspace, Git, and file inspection.
- `@evident/adapters`: scanner processes and configuration inspection.
- `@evident/normalizer`: scanner-specific output normalization.
- `@evident/deduplicator`: stable fingerprints and source-preserving merges.
- `@evident/rules`: deterministic repository-native technical rules.
- `@evident/evidence`: technical evidence references.
- `@evident/controls`: control packs and technical coverage evaluation.
- `@evident/regression`: fingerprint-only baseline comparison.
- `@evident/reporters`: terminal, JSON, HTML, and SARIF output.
- `@evident/core`: scan lifecycle orchestration.
- `@evident/sdk`: programmatic scan entry point.

## Security Model

Evident treats scanned repositories as untrusted input.

- It does not run `npm install`, repository package scripts, hooks, or repository code.
- Scanner processes are launched without a shell and use bounded timeouts.
- Repository traversal blocks paths that escape the scan root.
- Generated scan artifacts live in `.evident/`, which is ignored by Git.
- No telemetry or source upload is enabled by default.
- AI is scaffolded but disabled by default and is not part of the standard scan path.

TypeScript configuration files are executable by nature. Use JSON or YAML when
scanning repositories you do not trust.

## Development

```bash
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

The CI workflow installs dependencies with `--ignore-scripts`, then runs lint,
typecheck, tests, and builds on Node 20 and Node 22.

## Repository Status

`plan.md` and OpenCode/CodeGraph working artifacts are intentionally local-only and
excluded from version control. Product and implementation planning artifacts should
remain outside release history unless deliberately promoted into user-facing docs.
