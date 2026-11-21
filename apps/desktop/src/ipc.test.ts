import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCapabilities, httpInvoke, inLtsServeMode } from "./ipc";

// The desktop vitest container runs every non-journey suite in the node
// environment (vite.config.ts, JOURNEY-SUITE-001), so this adapter test
// installs a minimal `window` global itself — exactly the marker surface
// inLtsServeMode keys off — instead of asking for a DOM environment.
type ServeWindow = Window & { __LTS_SERVE?: boolean };
const g = globalThis as unknown as { window?: ServeWindow };

describe("WEB-SERVE-001 http ipc adapter", () => {
  const original = g.window;

  beforeEach(() => {
    g.window = {} as ServeWindow;
  });

  afterEach(() => {
    if (original === undefined) delete g.window;
    else g.window = original;
    vi.unstubAllGlobals();
  });

  it("serve mode keys off the injected marker only", () => {
    g.window!.__LTS_SERVE = true;
    expect(inLtsServeMode()).toBe(true);
    g.window!.__LTS_SERVE = false;
    expect(inLtsServeMode()).toBe(false);
    delete g.window!.__LTS_SERVE;
    expect(inLtsServeMode()).toBe(false);
  });

  it("routes invoke calls to POST /api/<command> with the args object", async () => {
    const seen = { url: "", method: "", body: "" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        seen.url = url;
        seen.method = String(init.method);
        seen.body = String(init.body);
        return new Response(JSON.stringify(["ru-RU"]), { status: 200 });
      }),
    );
    const result = await httpInvoke("active_pack", { profileId: "p1" });
    expect(result).toEqual(["ru-RU"]);
    expect(seen.url).toBe("/api/active_pack");
    expect(seen.method).toBe("POST");
    expect(JSON.parse(seen.body)).toEqual({ profileId: "p1" });
  });

  it("missing args become an empty object body", async () => {
    let body = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        body = String(init.body);
        return new Response("null", { status: 200 });
      }),
    );
    await httpInvoke("installed_packs");
    expect(body).toBe("{}");
  });

  it("command rejections rebuild the desktop rejection message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "no active language pack" }), { status: 422 }),
      ),
    );
    await expect(httpInvoke("active_pack", { profileId: "p1" })).rejects.toThrow(
      "no active language pack",
    );
  });

  it("capabilities report passes through verbatim; failure is null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ mode: "browser-serve", install_progress_events: false }), {
            status: 200,
          }),
      ),
    );
    const caps = await fetchCapabilities();
    expect(caps?.mode).toBe("browser-serve");
    expect(caps?.install_progress_events).toBe(false);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );
    expect(await fetchCapabilities()).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    expect(await fetchCapabilities()).toBeNull();
  });
});
