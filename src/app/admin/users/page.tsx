import type { Metadata } from "next";
import { Users as UsersIcon } from "lucide-react";
import { auth } from "@/auth";
import { listAdminUsers } from "@/lib/admin-users";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { UsersTable } from "@/components/admin/users-table";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Manage Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const session = await auth();

  const { users, total, page, totalPages } = await listAdminUsers({
    search: typeof params.q === "string" ? params.q : undefined,
    page: typeof params.page === "string" ? Number(params.page) : 1,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.admin.usersList.title}</h1>
        <p className="text-muted-foreground">{strings.admin.usersList.subtitle(total)}</p>
      </div>

      <AdminSearchBar placeholder={strings.admin.usersList.searchPlaceholder} />

      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title={strings.admin.usersList.noResultsTitle} description={strings.admin.usersList.noResultsBody} />
      ) : (
        <>
          <UsersTable
            users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
            currentUserId={session!.user.id}
          />
          <Pagination currentPage={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
