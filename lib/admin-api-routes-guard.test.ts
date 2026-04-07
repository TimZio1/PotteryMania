import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walkRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkRouteFiles(p));
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

describe("admin API route guards", () => {
  it("every app/api/admin/**/route.ts references an auth guard", () => {
    const root = join(process.cwd(), "app", "api", "admin");
    const files = walkRouteFiles(root);
    expect(files.length).toBeGreaterThan(10);
    const guardRe =
      /require(?:Hyper)?AdminUser|requireFinanceAdmin|requireAdminUser|requireHyperAdminUser/;
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(guardRe.test(src), `${f} should call require*User or requireFinanceAdmin`).toBe(true);
    }
  });
});
