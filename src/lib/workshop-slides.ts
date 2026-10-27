export const workshopSubjects = ["web", "android", "lego", "3d-printing"] as const;
export type WorkshopSubject = (typeof workshopSubjects)[number];
export type WorkshopProject = {
  id: number; href: string; title: string; summary: string; category: string;
  images: { url: string; caption: string }[];
  linkUrl: string | null; repoUrl: string | null; closed: boolean;
};

/** One category slot, using its newest record and first available image only. */
export function workshopSlides(projects: readonly WorkshopProject[]) {
  return workshopSubjects.map(subject => {
    const project = projects.find(project => project.category === subject);
    if (!project) return { subject, project: undefined };
    const { images, ...details } = project;
    return { subject, project: { ...details, key: `${subject}:${project.id}`, image: images[0] } };
  });
}
