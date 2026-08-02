import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpdateNameForm, ChangePasswordForm } from "@/components/profile/profile-forms";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, email: true, role: true, passwordHash: true, createdAt: true },
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.profile.title}</h1>
        <p className="text-muted-foreground">{strings.profile.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{strings.profile.accountTitle}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant={user.role === "ADMIN" ? "secondary" : "outline"}>{user.role}</Badge>
          <Badge variant="outline">
            {strings.profile.memberSince(user.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" }))}
          </Badge>
        </CardContent>
      </Card>

      <UpdateNameForm initialName={user.name ?? ""} />
      <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
    </div>
  );
}
