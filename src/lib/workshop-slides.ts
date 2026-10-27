export const workshopSubjects = ["web", "android", "lego", "3d-printing"] as const;
export type WorkshopSubject = (typeof workshopSubjects)[number];
export type WorkshopFilter = WorkshopSubject | "all";
export type WorkshopProject = {
  id: number; href: string; title: string; summary: string; category: string;
  images: { url: string; caption: string }[];
  linkUrl: string | null; repoUrl: string | null; closed: boolean;
};

/** A single real project can show its ordered photos; a collection shows one cover each. */
export function workshopSlides(projects: readonly WorkshopProject[], filter: WorkshopFilter) {
  const selected = filter === "all" ? projects : projects.filter(project => project.category === filter);
  return selected.flatMap(project => {
    const images = selected.length === 1 ? project.images : project.images.slice(0, 1);
    return (images.length ? images : [undefined]).map((image, index) => ({
      ...project, key: `${project.id}:${index}`, image,
      subject: workshopSubjects.includes(project.category as WorkshopSubject)
        ? project.category as WorkshopSubject : "web" as const,
    }));
  });
}
