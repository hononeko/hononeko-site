# hononeko-site

Landing pages for hononeko tools, served by one Cloudflare Worker:

| Host | Page |
| :--- | :--- |
| [hononeko.app](https://hononeko.app) | The hub, listing every tool |
| [sshx.hononeko.app](https://sshx.hononeko.app) | [sshx](https://github.com/hononeko/sshx) |
| [doppel.hononeko.app](https://doppel.hononeko.app) | [doppel](https://github.com/hononeko/doppel) |

## How it works

`public/` holds one folder per site plus `_shared/`, the theme every site uses. The Worker (`src/worker.js`) picks the folder from the first label of the hostname, so `sshx.hononeko.app/` serves `public/sshx/index.html`, and serves `/_shared/` on every host. The custom domains in `wrangler.jsonc` are proxied by Cloudflare, which creates their DNS records and certificates on deploy.

## The theme

Everything lives in `public/_shared/`:

* `logo.webp`: an orange tabby in front of forested mountains, cut to a circle with a transparent background. `favicon-32.png` and `apple-touch-icon.png` (on pine) are made from it.
* `theme.css`: tabby orange (`#e07a2c`) and pine green (`#1f4d3a`) on cream, with a dusk palette for dark mode. Every color is a token on `:root`.
* `ridge-*.svg`: the mountain and spruce layers along the bottom of each hero, used as CSS masks, so their colors come from the theme.
* `screenshots/`: each tool page's screenshot, also its link preview image.

Files in `_shared/` skip the Worker, and `public/_headers` lets browsers cache them for a day. Pages always revalidate, so a deploy shows up straight away; a changed shared file can take a day to reach a returning visitor.

A new page should reuse the hero, `.card`, `.grid`, `.install` and `pre.term` blocks of an existing one rather than add styles.

## Adding a tool

1. Add `public/<tool>/index.html`, starting from `public/sshx/index.html`, and put its images in `public/_shared/` (screenshots in `screenshots/<tool>.png`). Copy `robots.txt` and `sitemap.xml` from `public/sshx/` and change the host in each; update the page's canonical URL, Open Graph tags and JSON-LD the same way.
2. Add the tool to `SITES` in `src/worker.js`.
3. Add `<tool>.hononeko.app` to `routes` in `wrangler.jsonc`.
4. Add a card to `public/hub/index.html` and a link in the other pages' footers.

The tests check that every site has a page and a custom domain.

## Development

```sh
git config core.hooksPath .githooks
bun install

bun run dev           # hub at http://localhost:8787
bun run dev:sshx      # the sshx page
bun run dev:doppel    # the doppel page
bun run test          # or test:coverage
bun run check         # builds the deploy bundle without uploading it
```

`wrangler dev` sends every request with the host of the first route, so pick the site with `--host` (the `dev:*` scripts). Run one `wrangler dev` at a time: they share local state.

## Deploying

Every push to `main` deploys through `.github/workflows/deploy.yml`, which needs these repository secrets:

* `CLOUDFLARE_API_TOKEN`: a token with **Workers Scripts: Edit** on the account, and **Workers Routes: Edit** and **DNS: Edit** on the `hononeko.app` zone.
* `CLOUDFLARE_ACCOUNT_ID`.

To deploy by hand: `bunx wrangler login`, then `bun run deploy`.
