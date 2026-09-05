// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { readdirSync, readFileSync } from "node:fs";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

const postsDirectory = new URL("./src/content/posts/", import.meta.url);

// Seed every article explicitly so a missed crawler link can never leave an
// article on the runtime SSR cold path. Read canonical slugs from frontmatter
// instead of assuming filenames and URLs always match.
const articleRoutes = readdirSync(postsDirectory)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort()
  .map((fileName) => {
    const source = readFileSync(new URL(fileName, postsDirectory), "utf8");
    const match = source.match(/^\s*slug:\s*(?:"([^"]+)"|'([^']+)'|([^\r\n#]+))\s*$/m);
    const slug = (match?.[1] ?? match?.[2] ?? match?.[3])?.trim();
    if (!slug) {
      throw new Error(`[prerender] Missing slug in src/content/posts/${fileName}`);
    }
    return `/blog/${slug}`;
  });

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    // Render stable public pages during the deploy instead of on crawler requests.
    // crawlLinks still discovers category, tag, author, legal, and tool routes;
    // articleRoutes guarantees coverage for the complete article library.
    prerender: {
      crawlLinks: true,
      routes: [
        "/",
        "/blog",
        "/about",
        "/authors",
        "/contact",
        "/editorial-policy",
        "/how-we-estimate-repair-costs",
        "/privacy-policy",
        "/terms",
        "/disclaimer",
        "/tools",
        "/error-codes",
        "/sitemap.xml",
        "/robots.txt",
        "/llms.txt",
        ...articleRoutes,
      ],
    },
  },
  vite: {
    plugins: [mcpPlugin()],
  },
});
