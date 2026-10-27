"use client";

import { useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { MAX_IMAGE_CAPTION, MAX_PROJECT_IMAGES, moveProjectImage, type ProjectMediaDocument } from "@/lib/project-media";
import type { ProjectFieldErrors } from "@/lib/project-input";

type Props = {
  coverImage: string; media: ProjectMediaDocument; disabled: boolean; uploading: boolean;
  errors: ProjectFieldErrors;
  onChange: (media: ProjectMediaDocument, coverImage: string) => void;
  onUpload: (files: File[], kind: "cover" | "gallery") => void;
};
const accept = "image/jpeg,image/png,image/webp,image/gif,image/avif";
export function ProjectMediaEditor({ coverImage, media, disabled, uploading, errors, onChange, onUpload }: Props) {
  const [captionEditor, setCaptionEditor] = useState<"cover" | number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<"cover" | "gallery" | null>(null);
  const change = (next: ProjectMediaDocument) => onChange(next, coverImage);
  const move = (from: number, to: number) => { change({ ...media, images: moveProjectImage(media.images, from, to) }); setCaptionEditor(null); };
  const dropFiles = (event: DragEvent, kind: "cover" | "gallery") => {
    event.preventDefault(); setOver(null);
    if (!disabled && event.dataTransfer.files.length) onUpload([...event.dataTransfer.files], kind);
  };
  const dropProps = (kind: "cover" | "gallery") => ({
    onDragOver: (event: DragEvent) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setOver(kind); } },
    onDragLeave: (event: DragEvent) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null); },
    onDrop: (event: DragEvent) => dropFiles(event, kind),
  });
  const captions = (target: "cover" | number) => {
    const image = target === "cover" ? { captionEn: media.coverCaptionEn, captionSl: media.coverCaptionSl } : media.images[target];
    return <div className="mt-3 grid gap-3 rounded-xl border border-white/10 bg-black/10 p-3 sm:grid-cols-2">
      {(["En", "Sl"] as const).map(language => {
        const key = `caption${language}` as const;
        const field = target === "cover" ? `gallery.coverCaption${language}` : `gallery.images.${target}.${key}`;
        return <label key={language} className="text-xs"><span className="mb-1 block">Caption ({language.toUpperCase()})</span>
          <textarea className="textarea min-h-20 text-sm" rows={2} maxLength={MAX_IMAGE_CAPTION} value={image[key]}
            aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined}
            onChange={event => target === "cover" ? change({ ...media, [`coverCaption${language}`]: event.target.value }) : change({ ...media, images: media.images.map((item, index) => index === target ? { ...item, [key]: event.target.value } : item) })} />
          {errors[field] && <span id={`${field}-error`} className="mt-1 block text-rose-300">{errors[field].join(" ")}</span>}
        </label>;
      })}
      <button type="button" className="btn-ghost text-xs sm:col-span-2" onClick={() => setCaptionEditor(null)}>Done editing captions</button>
    </div>;
  };
  const picker = (kind: "cover" | "gallery") => <label className="btn-ghost cursor-pointer text-sm">
    <ImagePlus aria-hidden="true" size={16} /> {kind === "cover" ? "Choose cover" : "Choose gallery photos"}
    <input type="file" accept={accept} multiple={kind === "gallery"} className="sr-only" disabled={disabled}
      onChange={event => { const files = [...(event.target.files ?? [])]; if (files.length) onUpload(files, kind); event.target.value = ""; }} />
  </label>;
  return <section aria-labelledby="project-images-heading" className="space-y-5 border-t border-white/10 pt-5">
    <div><h3 id="project-images-heading" className="text-lg font-medium">Images & captions</h3><p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">Drop images below or choose files. Captions are optional, up to {MAX_IMAGE_CAPTION} characters per language. Changes are published only with Save project.</p></div>
    <div {...dropProps("cover")} className={`rounded-xl border border-dashed p-4 ${over === "cover" ? "border-emerald-300 bg-emerald-300/5" : "border-white/20"}`}>
      <h4 className="mb-3 text-sm font-medium">Cover image</h4>
      {coverImage && <div>
        <img src={coverImage} alt="Current project cover" onContextMenu={event => { event.preventDefault(); if (!disabled) setCaptionEditor("cover"); }} className="mb-3 max-h-56 w-full rounded-lg object-contain bg-black/15" />
        <div className="mb-3 flex flex-wrap gap-2"><button type="button" className="btn-ghost text-xs" aria-expanded={captionEditor === "cover"} onClick={() => setCaptionEditor(captionEditor === "cover" ? null : "cover")}><Pencil size={14} /> Edit cover captions</button><button type="button" className="btn-ghost text-xs" onClick={() => { onChange({ ...media, coverCaptionEn: "", coverCaptionSl: "" }, ""); setCaptionEditor(null); }}><Trash2 size={14} /> Remove cover</button></div>
        {captionEditor === "cover" && captions("cover")}
      </div>}
      {picker("cover")}<p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">Or drop one cover image here. JPEG, PNG, WebP, GIF or AVIF, up to 12 MiB.</p>
      {errors.coverImage && <p className="mt-2 text-sm text-rose-300">{errors.coverImage.join(" ")}</p>}
    </div>
    <div {...dropProps("gallery")} className={`rounded-xl border border-dashed p-4 ${over === "gallery" ? "border-emerald-300 bg-emerald-300/5" : "border-white/20"}`}>
      <h4 className="text-sm font-medium">Gallery ({media.images.length}/{MAX_PROJECT_IMAGES})</h4><p className="mb-4 mt-1 text-xs text-[color:var(--color-fg-muted)]">Drag a photo onto another to reorder. Move earlier/later buttons also work with a keyboard or touch. Right-click is an optional caption shortcut.</p>
      <ol className="mb-4 grid gap-3 sm:grid-cols-2">
        {media.images.map((image, index) => <li key={`${image.url}:${media.images.slice(0, index).filter(item => item.url === image.url).length}`} draggable={!disabled} onDragStart={event => { setDragging(index); event.dataTransfer.setData("application/x-project-image-index", String(index)); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDragging(null)}
          onDragOver={event => { if (dragging !== null) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; } }}
          onDrop={event => { if (dragging !== null && !disabled) { event.preventDefault(); event.stopPropagation(); move(dragging, index); setDragging(null); } }}
          className={`min-w-0 rounded-xl border p-3 ${dragging === index ? "border-emerald-300 opacity-60" : "border-white/10"}`}>
          <img src={image.url} alt={`Gallery photo ${index + 1}`} draggable={false} onContextMenu={event => { event.preventDefault(); if (!disabled) setCaptionEditor(index); }} className="h-32 w-full rounded-lg bg-black/15 object-contain" />
          <p className="mb-2 mt-2 truncate text-xs text-[color:var(--color-fg-muted)]">{index + 1}. {image.captionEn || image.captionSl || "No caption"}</p>
          <div className="flex flex-wrap gap-2"><button type="button" className="btn-ghost text-xs" onClick={() => setCaptionEditor(captionEditor === index ? null : index)}><Pencil size={14} /> Edit captions</button><button type="button" className="btn-ghost text-xs" onClick={() => onChange({ ...media, coverCaptionEn: image.captionEn, coverCaptionSl: image.captionSl }, image.url)}>Use as cover</button></div>
          <div className="mt-2 flex flex-wrap gap-2"><button type="button" className="btn-ghost text-xs" disabled={disabled || index === 0} onClick={() => move(index, index - 1)} aria-label={`Move photo ${index + 1} earlier`}><ArrowUp size={14} /> Earlier</button><button type="button" className="btn-ghost text-xs" disabled={disabled || index === media.images.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move photo ${index + 1} later`}><ArrowDown size={14} /> Later</button><button type="button" className="btn-ghost text-xs" aria-label={`Remove photo ${index + 1}`} onClick={() => { change({ ...media, images: media.images.filter((_, itemIndex) => itemIndex !== index) }); setCaptionEditor(null); }}><Trash2 size={14} /></button></div>
          {captionEditor === index && captions(index)}
        </li>)}
      </ol>
      {picker("gallery")}<p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">Or drop gallery photos here. Up to {MAX_PROJECT_IMAGES} images; each up to 12 MiB.</p>
      {errors.gallery && <p className="mt-2 text-sm text-rose-300">{errors.gallery.join(" ")}</p>}
    </div>
    {uploading && <p role="status" className="text-sm text-[color:var(--color-accent-2)]">Uploading images… Existing photos and captions stay in the draft.</p>}
  </section>;
}
