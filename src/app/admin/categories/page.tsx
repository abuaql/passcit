import type { Metadata } from "next";
import { listAdminTags } from "@/lib/admin-tags";
import { CategoryManager } from "@/components/admin/category-manager";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Manage Categories" };

export default async function AdminCategoriesPage() {
  const tags = await listAdminTags();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.admin.categories.title}</h1>
        <p className="text-muted-foreground">
          {strings.admin.categories.subtitle}
        </p>
      </div>
      <CategoryManager tags={tags} />
    </div>
  );
}
