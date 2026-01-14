/**
 * Project Home Page
 *
 * Redirects to the first incomplete agent in the pipeline.
 * Users should always land on the next action they need to take.
 */

import { redirect } from 'next/navigation';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  // TODO: Fetch agent states and find first incomplete agent
  // For now, redirect to Foundry Architect
  redirect(`/projects/${id}/foundry-architect`);
}
