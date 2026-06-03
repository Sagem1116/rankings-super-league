import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Setup Complete" },
      { name: "description", content: "Starter project ready for custom code." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Project Setup Complete
      </h1>
    </main>
  );
}
