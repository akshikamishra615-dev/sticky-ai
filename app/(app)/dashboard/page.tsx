import { Greeting } from "@/components/dashboard/greeting";
import { AiPrompter } from "@/components/dashboard/ai-prompter";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ContinueLearning } from "@/components/dashboard/continue-learning";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Greeting userName={session?.user?.name || "Student"} />
      <AiPrompter />
      <QuickActions />
      <ContinueLearning />
    </div>
  );
}
