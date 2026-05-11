import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { JobApplyForm } from "@/components/recruitment/JobApplyForm";

export const dynamic = "force-dynamic";

export default async function PublicJobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await db.job.findUnique({ where: { slug } });
  if (!job || job.status !== "OPEN") notFound();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posted {new Date(job.createdAt).toLocaleDateString()}
          </p>
        </div>
        <article className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
          {job.description}
        </article>
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-3">Apply</h2>
          <JobApplyForm slug={slug} />
        </div>
      </div>
    </div>
  );
}
