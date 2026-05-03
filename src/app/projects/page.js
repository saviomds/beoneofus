import ProjectsContent from "./ProjectsContent";

export const metadata = {
  title: "Projects - beoneofus",
  description: "Manage your b1overs projects",
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex flex-col">
      <ProjectsContent />
    </div>
  );
}