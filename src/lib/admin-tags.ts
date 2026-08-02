import { prisma } from "@/lib/prisma";

export async function listAdminTags() {
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { questions: true } } },
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createAdminTag(name: string) {
  const slug = slugify(name);
  if (!slug) throw new Error("Category name must contain at least one letter or number.");
  return prisma.tag.create({ data: { name: name.trim(), slug } });
}

export async function updateAdminTag(id: string, name: string) {
  const slug = slugify(name);
  if (!slug) throw new Error("Category name must contain at least one letter or number.");
  return prisma.tag.update({ where: { id }, data: { name: name.trim(), slug } });
}

export async function deleteAdminTag(id: string) {
  // QuestionTag rows cascade-delete automatically (onDelete: Cascade in
  // schema.prisma) — this only removes the tag itself and its
  // associations, never the questions that were tagged with it.
  return prisma.tag.delete({ where: { id } });
}
