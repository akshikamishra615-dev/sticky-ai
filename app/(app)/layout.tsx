import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <AppShell userName={session.user.name || "Student"} userImage={session.user.image}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
