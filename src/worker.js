// Serves every hononeko.app site from one set of static assets.
// The first label of the hostname picks the site's folder in public/ (sshx.hononeko.app → public/sshx/);
// the apex and any unknown host get the hub. /_shared/ (theme, logo, scripts) is the same on every host, and is
// normally served without the Worker (run_worker_first in wrangler.jsonc); it's passed through here too, so the
// Worker stays correct if that changes.

export const SITES = new Set(["sshx", "doppel"]);
const HUB = "hub";
const SHARED = "/_shared/";

// Cloudflare Web Analytics injects its beacon from static.cloudflareinsights.com; with automatic setup it reports to
// this host's /cdn-cgi/rum, and cloudflareinsights.com covers a manually installed beacon.
const ANALYTICS_SCRIPT = "https://static.cloudflareinsights.com";
const ANALYTICS_REPORT = "https://cloudflareinsights.com";

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' ${ANALYTICS_SCRIPT}; ` +
    `connect-src 'self' ${ANALYTICS_REPORT}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export function siteFor(hostname) {
  const label = hostname.split(".")[0];
  return SITES.has(label) ? label : HUB;
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const url = new URL(request.url);
    const site = siteFor(url.hostname);
    const prefix = `/${site}`;

    // Other sites' folders aren't reachable through this host's paths.
    const shared = url.pathname.startsWith(SHARED);
    const assetURL = new URL(url);
    if (!shared) assetURL.pathname = prefix + url.pathname;

    let response = await env.ASSETS.fetch(new Request(assetURL, request));

    if (response.status === 404) {
      // Without the .html: the assets binding redirects /x.html to /x.
      const page = await env.ASSETS.fetch(new Request(new URL(`${SHARED}404`, url), request));
      response = new Response(page.body, { status: 404, headers: page.headers });
      // The page comes from /_shared/, which browsers may cache for a day (public/_headers); a 404 must not be, or a
      // page added at this URL later would stay hidden.
      response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    } else {
      response = new Response(response.body, response);
    }

    // Asset redirects (e.g. /index.html → /) point at the folder path; map them back to this host's paths.
    const location = response.headers.get("Location");
    if (location && !shared) {
      const target = new URL(location, assetURL);
      if (target.pathname.startsWith(prefix + "/")) {
        response.headers.set("Location", target.pathname.slice(prefix.length) + target.search);
      }
    }

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
    return response;
  },
};
