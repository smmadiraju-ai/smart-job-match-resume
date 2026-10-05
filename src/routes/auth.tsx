import { createFileRoute, redirect } from "@tanstack/react-router";

// Login temporarily disabled: send everyone to the builder.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/build" });
  },
});
