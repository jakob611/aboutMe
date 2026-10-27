export function parseCommentInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  for (const [field, limit] of Object.entries({ author: 100, email: 200, content: 2000, website: 200, "cf-turnstile-response": 2048 })) {
    if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].length > limit)) return null;
  }
  const author = typeof body.author === "string" ? body.author.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!author || !content || /[\r\n\u0000]/.test(author + email) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return null;
  return { author, email, content, token: body["cf-turnstile-response"], website: body.website };
}
