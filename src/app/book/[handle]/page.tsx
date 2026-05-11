import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const page = await db.bookingPage.findUnique({
    where: { handle },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!page || !page.isActive) notFound();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{page.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            with {page.user.name ?? page.user.email}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {page.description && (
            <p className="text-sm text-foreground">{page.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Meeting length: {page.durationMin} min
            {page.bufferMin > 0 ? ` · ${page.bufferMin} min buffer` : ""}
          </p>
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Calendar integration is being set up. Once it's connected, you'll be able
            to pick a time slot here. In the meantime, please email{" "}
            <a className="text-primary underline" href={`mailto:${page.user.email}`}>
              {page.user.email}
            </a>{" "}
            to book a meeting.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
