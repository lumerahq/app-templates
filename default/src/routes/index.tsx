import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Default App</h1>
        <p className="text-muted-foreground">Your app starts here. Edit src/routes/index.tsx to begin.</p>
      </div>
    </div>
  );
}
