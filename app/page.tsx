import { Suspense } from "react";
import { LeadsDashboardShell } from "@/features/leads/components/LeadsDashboardShell";

export default function Page() {
  return (
    <Suspense>
      <LeadsDashboardShell />
    </Suspense>
  );
}
