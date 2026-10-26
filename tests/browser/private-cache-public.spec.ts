import { expect, test } from "@playwright/test";

test("deployed private website pages explicitly prevent shared caching", async ({
  request,
}, info) => {
  test.setTimeout(90000);
  test.skip(
    !info.project.use.baseURL?.startsWith("https://"),
    "Production response headers are verified after deployment; the server wrapper has separate local tests.",
  );
  for (const path of [
    "/auth",
    "/profile",
    "/admin-control",
    "/admin-keys",
    "/admin-loader",
    "/admin-notifications",
    "/generator",
    "/claim/tesla",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBeLessThan(400);
    expect(response.headers()["cache-control"], path).toContain("no-store");
    expect(response.headers()["cache-control"], path).toContain("private");
    expect(response.headers()["cf-cache-status"] ?? "", path).not.toMatch(
      /^(HIT|STALE|UPDATING)$/i,
    );
  }
});
