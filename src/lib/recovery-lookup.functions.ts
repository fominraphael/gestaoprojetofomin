import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public lookup: given a recovery email, return the username to sign in with.
 * Uses the service-role client server-side to bypass RLS on `profiles` without
 * exposing any table read permission to anon/authenticated clients.
 * Returns { username: null } when nothing matches — never leaks whether the
 * email is registered beyond enabling the standard login flow.
 */
export const lookupUsernameByRecoveryEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) =>
    z.object({ email: z.string().email().max(255) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .ilike("email_recuperacao", data.email.trim())
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { username: (row?.username as string | undefined) ?? null };
  });
