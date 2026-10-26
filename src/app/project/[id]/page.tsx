import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/project/project-detail-client";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { topic: true },
  });
  return {
    title: project ? `${project.topic} — Pabrik Video` : "Project — Pabrik Video",
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { jobs: true },
  });

  if (!project) notFound();

  return <ProjectDetailClient initialProject={serializeProject(project)} />;
}
