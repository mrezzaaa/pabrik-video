import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await prisma.project.findMany({
    include: { jobs: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <DashboardClient initialProjects={projects.map(serializeProject)} />
  );
}
