import { UsersList } from "@/modules/admin/components/UsersList";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">Users</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Manage and view all user accounts, activity, and participation.
        </p>
      </div>

      <UsersList />
    </div>
  );
}
