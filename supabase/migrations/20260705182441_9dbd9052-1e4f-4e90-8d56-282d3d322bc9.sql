-- Revoke public/anon/authenticated EXECUTE on trigger-only SECURITY DEFINER functions.
-- These are invoked by triggers only; end users must not be able to call them via the Data API.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_email_whitelist() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_thread_updated_at() FROM PUBLIC, anon, authenticated;

-- join_workspace_by_code must remain callable by authenticated users (it is a user-facing RPC),
-- but should not be callable anonymously.
REVOKE ALL ON FUNCTION public.join_workspace_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_workspace_by_code(text) TO authenticated;

-- is_workspace_member is used inside RLS policies; keep EXECUTE for authenticated, drop anon/public.
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated;