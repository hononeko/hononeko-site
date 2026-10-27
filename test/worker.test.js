import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import worker, { SITES, siteFor } from "../src/worker.js";

// A stand-in for the assets binding: records the paths asked for and answers from a small table.
function fakeAssets(table) {
  const seen = [];
  return {
    seen,
    async fetch(request) {
      const path = new URL(request.url).pathname;
      seen.push(path);
      const entry = table[path];
      if (!entry) return new Response("missing", { status: 404 });
      if (entry.redirect) return new Response(null, { status: 307, headers: { Location: entry.redirect } });
      return new Response(entry.body, { headers: { "Content-Type": "text/html" } });
    },
  };
}

const get = (url, assets, init) => worker.fetch(new Request(url, init), { ASSETS: assets });

describe("siteFor", () => {
  test.each([
    ["hononeko.app", "hub"],
    ["sshx.hononeko.app", "sshx"],
    ["doppel.hononeko.app", "doppel"],
    ["sshx.localhost", "sshx"],
    ["localhost", "hub"],
    ["unknown.hononeko.app", "hub"],
  ])("%s → %s", (host, site) => expect(siteFor(host)).toBe(site));
});

describe("fetch", () => {
  test("serves a tool's folder at the root of its host", async () => {
    const assets = fakeAssets({ "/sshx/": { body: "sshx page" } });
    const res = await get("https://sshx.hononeko.app/", assets);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("sshx page");
  });

  test("serves the hub on the apex", async () => {
    const assets = fakeAssets({ "/hub/": { body: "hub page" } });
    expect(await (await get("https://hononeko.app/", assets)).text()).toBe("hub page");
  });

  test("serves shared files unprefixed on every host", async () => {
    const assets = fakeAssets({ "/_shared/theme.css": { body: "css" } });
    for (const host of ["hononeko.app", "sshx.hononeko.app", "doppel.hononeko.app"]) {
      expect((await get(`https://${host}/_shared/theme.css`, assets)).status).toBe(200);
    }
  });

  test("keeps another site's folder out of reach", async () => {
    const assets = fakeAssets({ "/doppel/": { body: "doppel page" }, "/_shared/404": { body: "not found" } });
    const res = await get("https://sshx.hononeko.app/doppel/", assets);
    expect(assets.seen[0]).toBe("/sshx/doppel/");
    expect(res.status).toBe(404);
  });

  test("answers a missing page with the shared 404 page", async () => {
    const assets = fakeAssets({ "/_shared/404": { body: "lost in the woods" } });
    const res = await get("https://doppel.hononeko.app/nope", assets);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("lost in the woods");
  });

  test("maps asset redirects back to the host's own paths", async () => {
    const assets = fakeAssets({ "/sshx/index.html": { redirect: "/sshx/" } });
    const res = await get("https://sshx.hononeko.app/index.html?x=1", assets);
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toBe("/");
  });

  test("sets security headers", async () => {
    const res = await get("https://hononeko.app/", fakeAssets({ "/hub/": { body: "hub" } }));
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  test("refuses methods other than GET and HEAD", async () => {
    const res = await get("https://hononeko.app/", fakeAssets({}), { method: "POST" });
    expect(res.status).toBe(405);
  });
});

describe("site layout", () => {
  test("every site and the hub has an index page", () => {
    for (const site of [...SITES, "hub"]) expect(existsSync(`public/${site}/index.html`)).toBe(true);
  });

  test("every custom domain in wrangler.jsonc is the apex or a known site", () => {
    const config = readFileSync("wrangler.jsonc", "utf8");
    const patterns = [...config.matchAll(/"pattern":\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(patterns).toContain("hononeko.app");
    for (const pattern of patterns.filter((p) => p !== "hononeko.app")) expect(SITES.has(siteFor(pattern))).toBe(true);
    for (const site of SITES) expect(patterns).toContain(`${site}.hononeko.app`);
  });

  test("every /_shared/ file a page references exists", () => {
    for (const page of [...[...SITES, "hub"].map((s) => `public/${s}/index.html`), "public/_shared/404.html"]) {
      const html = readFileSync(page, "utf8");
      for (const [, path] of html.matchAll(/(?:src|href)="(\/_shared\/[^"]+)"/g)) {
        expect(existsSync(`public${path}`), `${page} → ${path}`).toBe(true);
      }
    }
  });

  test("shared files skip the Worker, and everything else runs it first", () => {
    const config = readFileSync("wrangler.jsonc", "utf8");
    const match = config.match(/"run_worker_first":\s*(\[[^\]]*\])/);
    expect(match).not.toBeNull();
    expect(JSON.parse(match[1]).sort()).toEqual(["!/_shared/*", "/*"]);
  });

  test("pages use no inline scripts or styles, which the CSP blocks", () => {
    for (const site of [...SITES, "hub"]) {
      const html = readFileSync(`public/${site}/index.html`, "utf8");
      // JSON-LD is data, not script: browsers never run it, so the CSP doesn't apply.
      expect(html).not.toMatch(/<script(?![^>]*\b(?:src=|type="application\/ld\+json"))[^>]*>/);
      expect(html).not.toMatch(/<style|\sstyle="/);
    }
  });
});

describe("discovery", () => {
  const hostOf = (site) => (site === "hub" ? "hononeko.app" : `${site}.hononeko.app`);

  for (const site of [...SITES, "hub"]) {
    const host = hostOf(site);

    test(`${host} has a robots.txt pointing at its sitemap, which lists the page`, () => {
      const robots = readFileSync(`public/${site}/robots.txt`, "utf8");
      expect(robots).toContain(`Sitemap: https://${host}/sitemap.xml`);
      expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
      expect(readFileSync(`public/${site}/sitemap.xml`, "utf8")).toContain(`<loc>https://${host}/</loc>`);
    });

    test(`${host} declares its canonical URL, a preview image and valid JSON-LD`, () => {
      const html = readFileSync(`public/${site}/index.html`, "utf8");
      expect(html).toContain(`<link rel="canonical" href="https://${host}/">`);
      expect(html).toContain(`<meta property="og:url" content="https://${host}/">`);

      const image = html.match(/<meta property="og:image" content="([^"]+)">/)?.[1];
      expect(image).toBeDefined();
      const { hostname, pathname } = new URL(image);
      expect(hostname).toBe(host);
      const file = pathname.startsWith("/_shared/") ? `public${pathname}` : `public/${site}${pathname}`;
      expect(existsSync(file), file).toBe(true);

      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      expect(blocks.length).toBe(1);
      const data = JSON.parse(blocks[0][1]);
      expect(data["@context"]).toBe("https://schema.org");
      expect(data.url).toBe(`https://${host}/`);
    });
  }
});
