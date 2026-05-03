import ProjectIDE from "../ProjectIDE";

export const metadata = {
  title: "Project IDE - beoneofus",
  description: "Write and manage your b1overs project code",
};

export default async function IDEPage({ params }) {
  const resolvedParams = await params;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex flex-col">
      <ProjectIDE projectId={resolvedParams.id} />
    </div>
  );
}