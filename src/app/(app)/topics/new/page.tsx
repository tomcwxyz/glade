import { getCurrentSpace } from "@/lib/space";
import { getSpaceTags } from "@/lib/queries";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TopicForm } from "../topic-form";

export default async function NewTopicPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const spaceTags = await getSpaceTags(space.id);
  const tagOptions = spaceTags.map((t) => ({ id: t.id, name: t.name, color: t.color }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Topics", href: "/topics" },
        { label: "New topic" },
      ]} />
      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Raise a topic
        </h1>
        <p className="text-bark-muted text-sm">
          Share a question, tension, or suggestion for the group.
        </p>
      </header>

      <TopicForm
        publicEnabled={((space.settings as Record<string, unknown>) || {}).publicTopics === true}
        tags={tagOptions}
      />
    </div>
  );
}
