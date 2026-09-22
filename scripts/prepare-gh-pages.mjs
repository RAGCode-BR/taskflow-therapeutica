import { copyFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const pagesDir = path.resolve(".gh-pages-dist");

if (!existsSync(path.join(pagesDir, "index.pages.html"))) {
  throw new Error("GitHub Pages build output not found.");
}

// GitHub Pages has no server-side fallback. Copying the same React entry to 404.html
// makes direct URLs such as /auth or /tasks load the app and let the client router decide.
await copyFile(path.join(pagesDir, "index.pages.html"), path.join(pagesDir, "index.html"));
await copyFile(path.join(pagesDir, "index.pages.html"), path.join(pagesDir, "404.html"));
await writeFile(path.join(pagesDir, "index.pages.html"), "", "utf8");
await writeFile(path.join(pagesDir, ".nojekyll"), "", "utf8");

console.log(`Prepared GitHub Pages files in ${pagesDir}`);
