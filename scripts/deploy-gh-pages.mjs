import { spawnSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const pagesDir = path.resolve(".gh-pages-dist");
const publishDir = path.resolve(".gh-pages-worktree");
const publicUrl = "https://r3eiz.github.io/task-flow-supabase-clean/";

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
};

if (!existsSync(pagesDir)) {
  throw new Error("Missing .gh-pages-dist. Run npm run build:pages first.");
}

// The deploy uses a temporary git worktree so the app source branch and the generated
// gh-pages branch never mix files. That is important here because this repo is a clean
// copy and should stay easy to compare against the Lovable/original project.
await rm(publishDir, { recursive: true, force: true });

const hasRemoteBranch = spawnSync("git", ["ls-remote", "--exit-code", "--heads", "origin", "gh-pages"], {
  stdio: "ignore",
}).status === 0;

if (hasRemoteBranch) {
  run("git", ["worktree", "add", publishDir, "gh-pages"]);
} else {
  await mkdir(publishDir, { recursive: true });
  run("git", ["worktree", "add", "--detach", publishDir, "HEAD"]);
  run("git", ["checkout", "--orphan", "gh-pages"], { cwd: publishDir });
}

run("git", ["rm", "-rf", "."], { cwd: publishDir });
await cp(pagesDir, publishDir, { recursive: true, force: true });
run("git", ["add", "."], { cwd: publishDir });

const diff = spawnSync("git", ["diff", "--cached", "--quiet"], {
  stdio: "ignore",
  cwd: publishDir,
});

if (diff.status === 0) {
  console.log("No GitHub Pages changes to publish.");
} else {
  run("git", ["commit", "-m", "Deploy GitHub Pages"], { cwd: publishDir });
  run("git", ["push", "origin", "gh-pages"], { cwd: publishDir });
}

run("git", ["worktree", "remove", publishDir, "--force"]);

console.log(`GitHub Pages published: ${publicUrl}`);
