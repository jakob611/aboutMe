import { findInquiryCategory, inquirySubject, validInquiry, type InquirySelection } from "./inquiry-topics";
import type { Lang } from "./i18n";

export type ContactDelivery = { mode: "email"; accessKey: string } | { mode: "inbox" } | { mode: "unavailable" };
export function contactDelivery(publicAccessKey: string | undefined, databaseAvailable: boolean): ContactDelivery {
  const accessKey = publicAccessKey?.trim();
  return accessKey ? { mode: "email", accessKey } : databaseAvailable ? { mode: "inbox" } : { mode: "unavailable" };
}

/** The active contact form uses the owner's verified private inbox. */
export function verifiedInboxDelivery(databaseAvailable: boolean, verificationAvailable: boolean): ContactDelivery {
  return databaseAvailable && verificationAvailable ? { mode: "inbox" } : { mode: "unavailable" };
}

export type ContactPayload = {
  name: string; email: string; subject: string; message: string;
  category?: string; topic?: string; customSubject?: string; website?: string;
  "cf-turnstile-response"?: string;
};

export async function readContactJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413 }> {
  const limit = 50000;
  if (Number(request.headers.get("content-length")) > limit) return { ok: false, status: 413 };
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400 };
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return { ok: false, status: 413 };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }
}

/** Bound both current structured enquiries and older clients using a plain subject. */
export function parseContactPayload(value: unknown, lang: Lang = "en"): ContactPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const limits = { name: 120, email: 200, subject: 200, message: 10000, category: 30, topic: 40, customSubject: 160, website: 200, "cf-turnstile-response": 2048 };
  for (const [field, limit] of Object.entries(limits)) {
    if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].length > limit)) return null;
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) return null;
  let subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (body.category !== undefined) {
    const category = typeof body.category === "string" ? findInquiryCategory(body.category) : undefined;
    if (!category) return null;
    const selection: InquirySelection = { category: category.id, topic: typeof body.topic === "string" ? body.topic : "", customSubject: typeof body.customSubject === "string" ? body.customSubject : "" };
    if (!validInquiry(selection)) return null;
    subject = inquirySubject(selection, lang);
  }
  if (/[\r\n]/.test(name + email + subject)) return null;
  return { name, email, subject, message, ...(typeof body.website === "string" ? { website: body.website } : {}), ...(typeof body["cf-turnstile-response"] === "string" ? { "cf-turnstile-response": body["cf-turnstile-response"] } : {}) };
}

/** A 200 response alone is not proof that the provider accepted the message. */
export function web3FormsAccepted(responseOk: boolean, value: unknown): boolean {
  return responseOk && Boolean(value && typeof value === "object" && "success" in value && value.success === true);
}

export async function submitContact(delivery: ContactDelivery, payload: ContactPayload, request: typeof fetch = fetch): Promise<"ok" | "err" | "limit" | "verification" | "unavailable"> {
  if (delivery.mode === "unavailable") return "unavailable";
  try {
    const response = await request(delivery.mode === "email" ? "https://api.web3forms.com/submit" : "/api/contact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delivery.mode === "email" ? {
        access_key: delivery.accessKey,
        name: payload.name, email: payload.email, subject: payload.subject, message: payload.message,
        from_name: "Portfolio enquiries", botcheck: Boolean(payload.website),
      } : payload),
    });
    const result: unknown = await response.json().catch(() => null);
    if (response.status === 429) return "limit";
    if (delivery.mode === "inbox" && response.status === 403) return "verification";
    const accepted = delivery.mode === "email" ? web3FormsAccepted(response.ok, result) : response.ok && Boolean(result && typeof result === "object" && "ok" in result && result.ok === true);
    return accepted ? "ok" : "err";
  } catch {
    return "err";
  }
}
