import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/invoices')({
  component: () => <Outlet />,
});
