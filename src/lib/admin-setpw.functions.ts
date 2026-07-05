import { createServerFn } from '@tanstack/react-start';

export const setLeandroPassword = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const email = 'arqleandro.hensilva@gmail.com';
  const password = 'LeandroHLeandro240662';
  const { data: list, error: lerr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (lerr) throw lerr;
  const u = list.users.find((x) => (x.email ?? '').toLowerCase() === email);
  if (!u) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    return { created: true, id: data.user?.id };
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(u.id, { password, email_confirm: true });
  if (error) throw error;
  return { updated: true, id: u.id };
});
