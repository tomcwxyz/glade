import { getCurrentSpace } from "@/lib/space";
import { getDocumentById } from "@/lib/queries";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DocumentForm } from "../../document-form";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const doc = await getDocumentById(space.id, id);
  if (!doc) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Documents", href: "/documents" },
        { label: doc.title, href: `/documents/${doc.id}` },
        { label: "Edit" },
      ]} />
      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Edit document
        </h1>
        <p className="text-bark-muted text-sm">
          Editing will create a new version (currently v{doc.currentVersion}).
        </p>
      </header>

      <DocumentForm
        document={{
          id: doc.id,
          title: doc.title,
          type: doc.type,
          content: doc.content as import("@tiptap/react").JSONContent | null,
        }}
      />
    </div>
  );
}
