import { createMiddleware } from "@tanstack/react-start";

// Temporary: login removed. All requests act as this fixed account.
const GUEST_USER_ID = "487ac134-9b2e-4f14-a1f4-8d30683b7566";

export const requireGuest = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return next({ context: { supabase: supabaseAdmin, userId: GUEST_USER_ID } });
});
