import { contentFields, type ContentValues } from "./site-content";

/** Compare overrides as well as text: removing an override restores its default. */
export function contentChanges(published: ContentValues, draft: ContentValues, defaults: ContentValues) {
  return contentFields.filter(field => published[field.key] !== draft[field.key]).map(field => ({
    ...field,
    before: published[field.key] ?? defaults[field.key],
    after: draft[field.key] ?? defaults[field.key],
    restoresDefault: !Object.hasOwn(draft, field.key),
  }));
}
