"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createSiteContent, type ContentValues, type SiteContent } from "@/lib/site-content";
const Context = createContext<SiteContent | null>(null);
export function SiteContentProvider({ values, children }: { values: ContentValues; children?: ReactNode }) { const content = useMemo(() => createSiteContent(values), [values]); return <Context.Provider value={content}>{children}</Context.Provider>; }
export function useSiteContent() { const content = useContext(Context); return content ?? createSiteContent(); }
export function SiteSection({ name, children }: { name: string; children: ReactNode }) { const content = useSiteContent(); return content.section(name) ? <>{children}</> : null; }
