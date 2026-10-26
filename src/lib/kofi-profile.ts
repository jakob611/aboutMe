export type KoFiProfile = { href: string; panelUrl: string };

/** A panel may only target the same single-profile recipient as its fallback. */
export function koFiProfile(href: string): KoFiProfile | null {
  try {
    const url = new URL(href);
    if (
      url.protocol !== "https:" || url.hostname !== "ko-fi.com" ||
      url.port || url.username || url.password || url.search || url.hash ||
      !/^\/[a-zA-Z0-9_-]{1,64}\/?$/.test(url.pathname)
    ) return null;
    const profile = `https://ko-fi.com${url.pathname.replace(/\/$/, "")}`;
    // This is the panel URL constructed by Ko-fi's official overlay-widget.js.
    return { href: profile, panelUrl: `${profile}/?hidefeed=true&widget=true&embed=true` };
  } catch {
    return null;
  }
}
