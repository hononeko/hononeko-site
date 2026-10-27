# Agent & Contributor Guidelines (`AGENTS.md`)

<!-- One or two sentences: what this repository is and who consumes it. -->

All automated agents and human contributors must follow the rules in this document.

## 1. Quality Gates

Before committing, all of these must pass:

```bash
# <!-- format / lint command -->
# <!-- test command -->
# <!-- build / type-check command -->
```

## 2. Rules

<!-- Project-specific architecture, coding and security rules. Keep each one short and actionable. -->

* **No secrets in code or logs:** credentials come from the environment and are never logged.
* **Pinned dependencies:** third-party GitHub Actions are pinned by commit SHA with a version comment.

## 3. Commits & Releases

[Conventional Commits](https://www.conventionalcommits.org/), enforced locally by the `commit-msg` hook (`git config core.hooksPath .githooks`). Commit subjects become the release notes, so write them for a reader of the release.

Versions follow the rules shared by all hononeko repositories in [`hononeko/actions`](https://github.com/hononeko/actions):

* A `!` in the header (`feat!:`) or a `BREAKING CHANGE:` footer gives a **major** release.
* `feat:` gives a **minor** release.
* `docs:` and `test:` give no release.
* Every other type gives a **patch** release.

## 4. Repository Structure

```
.
├── .githooks/
│   └── commit-msg    # Conventional Commits check
├── AGENTS.md         # This file
└── README.md
```
