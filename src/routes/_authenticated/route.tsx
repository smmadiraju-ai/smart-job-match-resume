import { Outlet, createFileRoute } from "@tanstack/react-router";

// Login temporarily disabled.
export const Route = createFileRoute("/_authenticated")({
  component: () => <Outlet />,
});
