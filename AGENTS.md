# Agent & Contributor Guidelines (`AGENTS.md`)

Landing pages for hononeko tools on `hononeko.app` and its subdomains, served as static assets by one Cloudflare Worker.

All automated agents and human contributors must follow the rules in this document.

## 1. Quality Gates

Before committing, all of these must pass:

```bash
npx oxlint@1.90.0 --deny-warnings .
bun run test:coverage   # CI requires 80% coverage of a pull request's changed lines
bun run check
```

CI (`validate.yml`) also lints the workflows with actionlint and zizmor (`hononeko/actions/lint-actions`).

## 2. Rules

* **One theme:** colors, fonts and components come from `public/_shared/theme.css`. Pages add no colors of their own; a new color is a token on `:root`, with a dark-mode value in both dark blocks.
* **Tabby and pine:** orange (`--tabby`) is the accent, pine green (`--pine`) the structure. Keep the logo, the dusk sky and the spruce ridges on every page.
* **No inline scripts or styles:** the Worker's Content-Security-Policy only allows files from the site itself. Scripts go in `public/_shared/site.js`, styles in `theme.css`.
* **No third-party requests:** no external fonts, scripts, analytics or images.
* **Sites stay separate:** a page only links to another site by its full `https://<tool>.hononeko.app/` URL. Shared files live in `public/_shared/`, the only path served on every host.
* **Accurate copy:** what a page says about a tool must match that tool's README. Check it when the tool changes.
* **Accessible:** real headings, alt text on images, visible focus, and it works at 320px wide and with reduced motion.
* **No secrets in code or logs:** the Cloudflare token comes from repository secrets.
* **Pinned dependencies:** third-party GitHub Actions are pinned by commit SHA with a version comment; `hononeko/actions` is used by its `v1` tag, which the Renovate preset `hononeko/actions//renovate/downstream` keeps.

## 3. Commits & Releases

[Conventional Commits](https://www.conventionalcommits.org/), enforced locally by the `commit-msg` hook (`git config core.hooksPath .githooks`). Every push to `main` deploys; there are no versioned releases.

## 4. Repository Structure

```
.
├── .githooks/commit-msg  # Conventional Commits check
├── .github/workflows/    # pr and deploy (main), both running validate
├── public/
│   ├── _shared/          # theme.css, logo.webp + icons, ridge-*.svg, site.js, 404.html
│   ├── hub/              # hononeko.app
│   ├── sshx/             # sshx.hononeko.app
│   └── doppel/           # doppel.hononeko.app
├── src/worker.js         # hostname → site folder, security headers
├── test/                 # routing and layout tests
└── wrangler.jsonc        # Worker, assets and custom domains
```
