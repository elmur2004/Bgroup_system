// Generate the probe-list bash script from the build manifest so probe-all.sh
// stays in sync with the codebase. Run after every build.
import fs from "node:fs";
import path from "node:path";

const root = "src/app";

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const pages = [];
for (const f of walk(root)) {
  if (!f.endsWith("page.tsx")) continue;
  if (f.includes(path.sep + "api" + path.sep)) continue;
  let route = f.replace(/\\/g, "/").replace("src/app", "").replace(/\/page\.tsx$/, "") || "/";
  route = route.replace(/\/\([^)]+\)/g, ""); // strip route groups
  if (route === "") route = "/";

  // Skip public routes (auth not required, and dynamic segments we'd need to
  // synthesize IDs for).
  if (route === "/login" || route === "/forgot-password" || route === "/reset-password") continue;
  if (route.startsWith("/book") || route.startsWith("/jobs/")) continue;
  // Skip dynamic-segment routes — they need a real ID and the probe doesn't
  // synthesize one. Capture them in a separate list for future templating.
  if (route.includes("[")) continue;

  pages.push(route);
}

pages.sort();
console.log(`# ${pages.length} static routes\n`);
for (const p of pages) console.log(p);
