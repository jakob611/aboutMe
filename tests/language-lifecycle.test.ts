import assert from "node:assert/strict";
import { test } from "node:test";
import { synchronizeDocumentLanguage } from "../src/lib/language-lifecycle";

function fixture(
  cookie = "lang=sl",
  href = "https://example.com/about?lang=en#work",
) {
  const windowListeners = new Map<string, EventListener>();
  const documentListeners = new Map<string, EventListener>();
  const replaced: string[] = [];
  const assigned: string[] = [];
  let reloaded = 0;
  let cookieHeader = cookie;
  const documentEvents = {
    visibilityState: "visible",
    get cookie() {
      return cookieHeader;
    },
    set cookie(value: string) {
      cookieHeader = value.split(";")[0];
    },
    addEventListener(type: string, listener: EventListener) {
      documentListeners.set(type, listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      if (documentListeners.get(type) === listener)
        documentListeners.delete(type);
    },
  };
  const location = {
    href,
    protocol: "https:",
    origin: "https://example.com",
    replace(value: string) {
      replaced.push(value);
    },
    assign(value: string) {
      assigned.push(value);
    },
    reload() {
      reloaded++;
    },
  };
  const browser = {
    location,
    addEventListener(type: string, listener: EventListener) {
      windowListeners.set(type, listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      if (windowListeners.get(type) === listener) windowListeners.delete(type);
    },
  };
  const cleanup = synchronizeDocumentLanguage("en", {
    document: documentEvents as unknown as Document,
    browser: browser as unknown as Window,
  });
  const show = (persisted: boolean) =>
    windowListeners.get("pageshow")?.({ persisted } as unknown as Event);
  const click = (
    href: string,
    options: { ctrlKey?: boolean; download?: boolean } = {},
  ) => {
    let prevented = false;
    const anchor = {
      href: new URL(href, location.href).href,
      target: "",
      hasAttribute: (name: string) =>
        name === "download" && Boolean(options.download),
      getAttribute: () => href,
    };
    documentListeners.get("click")?.({
      target: { closest: () => anchor },
      button: 0,
      ctrlKey: options.ctrlKey,
      preventDefault() {
        prevented = true;
      },
    } as unknown as Event);
    return prevented;
  };
  return {
    documentEvents,
    cookie: () => cookieHeader,
    replaced,
    assigned,
    reloaded: () => reloaded,
    show,
    click,
    focus: () => windowListeners.get("focus")?.(new Event("focus")),
    visible: () =>
      documentListeners.get("visibilitychange")?.(
        new Event("visibilitychange"),
      ),
    cleanup,
    listeners: () => windowListeners.size + documentListeners.size,
  };
}

test("Back restores the document's language and discards stale layout/prefetch state", () => {
  const f = fixture();
  assert.equal(f.listeners(), 4);
  f.show(false);
  assert.equal(f.reloaded(), 0);
  f.show(true);
  assert.equal(f.cookie(), "lang=en");
  assert.equal(f.reloaded(), 1);
  f.focus();
  assert.equal(f.reloaded(), 1);
  f.cleanup();
  assert.equal(f.listeners(), 0);
});

test("a language change from another tab reconciles on focus or visibility", () => {
  for (const event of ["focus", "visible"] as const) {
    const f = fixture(
      "lang=sl",
      "https://example.com/services?topic=web#start",
    );
    f[event]();
    assert.equal(f.cookie(), "lang=en");
    assert.deepEqual(f.replaced, ["/services?topic=web&lang=en#start"]);
    f.cleanup();
  }
  const f = fixture();
  f.documentEvents.visibilityState = "hidden";
  f.visible();
  assert.equal(f.reloaded(), 0);
  f.cleanup();
});

test("matching cookies do not reload the document or interfere with routing", () => {
  const f = fixture("lang=en");
  f.show(true);
  f.focus();
  f.visible();
  assert.equal(f.reloaded(), 0);
  assert.equal(f.replaced.length, 0);
  assert.equal(f.click("/services"), false);
  assert.equal(f.assigned.length, 0);
  f.cleanup();
});

test("a conflicting cookie at local navigation bypasses stale prefetched pages", () => {
  const f = fixture();
  assert.equal(f.click("/contact?subject=Android#message"), true);
  assert.deepEqual(f.assigned, ["/contact?subject=Android&lang=en#message"]);
  assert.equal(f.cookie(), "lang=en");
  f.cleanup();
});

test("modifier clicks, downloads, fragments and external links keep native behavior", () => {
  for (const [href, options] of [
    ["/services", { ctrlKey: true }],
    ["/api/files/download?id=1", { download: true }],
    ["#section", {}],
    ["https://github.com/jakob611", {}],
  ] as const) {
    const f = fixture();
    assert.equal(f.click(href, options), false);
    assert.equal(f.assigned.length, 0);
    assert.equal(f.reloaded(), 0);
    f.cleanup();
  }
});
