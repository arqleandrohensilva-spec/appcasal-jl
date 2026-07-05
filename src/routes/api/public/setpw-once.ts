import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/setpw-once')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get('x-setup-secret');
        if (secret !== process.env.SETUP_SECRET) {
          return new Response('forbidden', { status: 403 });
        }
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const email = 'arqleandro.hensilva@gmail.com';
        const password = 'LeandroHLeandro240662';
        const { data: list, error: lerr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (lerr) return new Response(lerr.message, { status: 500 });
        const u = list.users.find((x) => (x.email ?? '').toLowerCase() === email);
        if (!u) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
          if (error) return new Response(error.message, { status: 500 });
          return Response.json({ created: true, id: data.user?.id });
        }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(u.id, { password, email_confirm: true });
        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ updated: true, id: u.id });
      },
    },
  },
});
