import fs from "node:fs";
import path from "node:path";

const root = "src/app";
const apiRoot = "src/app/api";

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const sep = path.sep === "\\" ? /\\/g : /\//g;

const endpoints = [];
for (const f of walk(apiRoot)) {
  if (!f.endsWith("route.ts")) continue;
  const code = fs.readFileSync(f, "utf8");
  const methods = [...code.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PATCH|PUT|DELETE)/g)].map((m) => m[1]);
  if (methods.length === 0) continue;
  let urlPath = f.replace(sep, "/").replace("src/app/api", "").replace(/\/route\.ts$/, "") || "/";
  urlPath = "/api" + urlPath;
  const auth = /await\s+auth\s*\(/.test(code);
  const rbacHints = [];
  if (/super_admin/.test(code)) rbacHints.push("super_admin");
  if (/hr_manager/.test(code)) rbacHints.push("hr_manager");
  if (/team_lead/.test(code)) rbacHints.push("team_lead");
  if (/isPlatformAdmin/.test(code)) rbacHints.push("platform_admin");
  if (/partnerId/.test(code)) rbacHints.push("partner");
  if (/crmRole/.test(code)) rbacHints.push("crm_role-gated");
  for (const m of methods) {
    endpoints.push({ path: urlPath, method: m, auth, roles: [...new Set(rbacHints)] });
  }
}

const pages = [];
for (const f of walk(root)) {
  if (!f.endsWith("page.tsx")) continue;
  if (f.includes(path.sep + "api" + path.sep)) continue;
  const code = fs.readFileSync(f, "utf8");
  let route = f.replace(sep, "/").replace("src/app", "").replace(/\/page\.tsx$/, "") || "/";
  route = route.replace(/\/\([^)]+\)/g, "");
  if (route === "") route = "/";
  const guards = [];
  if (/super_admin/.test(code)) guards.push("super_admin");
  if (/hr_manager/.test(code)) guards.push("hr_manager");
  if (/team_lead/.test(code)) guards.push("team_lead");
  if (/partnerId/.test(code)) guards.push("partner");
  if (/crmRole/.test(code)) guards.push("crm_role-gated");
  if (/redirect\(["']\/login["']\)/.test(code)) guards.push("auth_required");
  pages.push({ route, guards });
}

fs.writeFileSync("/tmp/endpoint-map.json", JSON.stringify(endpoints, null, 2));
fs.writeFileSync("/tmp/page-map.json", JSON.stringify(pages, null, 2));

console.log(`endpoints: ${endpoints.length} (route handlers)`);
console.log(`pages: ${pages.length}`);
const byMethod = endpoints.reduce((acc, e) => {
  acc[e.method] = (acc[e.method] || 0) + 1;
  return acc;
}, {});
console.log("by method:", byMethod);
console.log("authed:", endpoints.filter((e) => e.auth).length, "/", endpoints.length);
