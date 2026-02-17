import { getCurrentSpace } from "@/lib/space";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DocumentForm } from "../document-form";

export default async function NewDocumentPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Documents", href: "/documents" },
        { label: "New document" },
      ]} />
      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New document
        </h1>
        <p className="text-bark-muted text-sm">
          Create a governance document that decisions can shape over time.
        </p>
      </header>

      <DocumentForm />
    </div>
  );
}
