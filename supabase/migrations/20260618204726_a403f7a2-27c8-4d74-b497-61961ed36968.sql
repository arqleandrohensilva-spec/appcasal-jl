
-- ============ ENUMS ============
CREATE TYPE public.pessoa AS ENUM ('leandro', 'jonathan', 'casal');
CREATE TYPE public.account_type AS ENUM ('corrente', 'poupanca', 'dinheiro', 'investimento');
CREATE TYPE public.tx_type AS ENUM ('receita', 'despesa');
CREATE TYPE public.recurrence AS ENUM ('none', 'weekly', 'monthly');

-- ============ WORKSPACES ============
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Meu Workspace',
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text,'-',''), 1, 8)),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ============ WORKSPACE MEMBERS ============
CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  active_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  pessoa public.pessoa,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ Helper: is_workspace_member (SECURITY DEFINER, sem recursão de RLS) ============
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  );
$$;

-- ============ POLÍTICAS RLS ============
-- workspaces
CREATE POLICY "members read workspaces" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "owner inserts workspace" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "members update workspace" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "creator deletes workspace" ON public.workspaces
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- workspace_members
CREATE POLICY "user reads own memberships" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "user inserts self membership" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user removes own membership" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- profiles
CREATE POLICY "user reads own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "members read profiles in workspace" ON public.profiles
  FOR SELECT TO authenticated
  USING (active_workspace_id IS NOT NULL AND public.is_workspace_member(active_workspace_id, auth.uid()));
CREATE POLICY "user inserts own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "user updates own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ============ TABELAS DE DADOS ============
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.account_type NOT NULL DEFAULT 'corrente',
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  owner public.pessoa NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members all accounts" ON public.accounts
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  card_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  closing_day INT NOT NULL DEFAULT 1,
  due_day INT NOT NULL DEFAULT 10,
  color TEXT NOT NULL DEFAULT 'purple',
  owner public.pessoa NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members all cards" ON public.cards
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  group_id UUID,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'Outros',
  payment_method TEXT NOT NULL DEFAULT 'pix',
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  installment_current INT,
  installment_total INT,
  type public.tx_type NOT NULL,
  owner public.pessoa NOT NULL,
  pessoa public.pessoa NOT NULL,
  recurrence public.recurrence,
  recurrence_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members all transactions" ON public.transactions
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE INDEX idx_transactions_workspace_date ON public.transactions(workspace_id, date DESC);

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target NUMERIC(14,2) NOT NULL DEFAULT 0,
  deadline DATE,
  owner public.pessoa NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members all goals" ON public.goals
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  date DATE NOT NULL,
  owner public.pessoa NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_contributions TO authenticated;
GRANT ALL ON public.goal_contributions TO service_role;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members all contribs" ON public.goal_contributions
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  owner public.pessoa NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members all budgets" ON public.budgets
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- ============ Trigger: cria profile + workspace pessoal ao criar usuário ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ws_id UUID;
  guessed_name TEXT;
  guessed_pessoa public.pessoa;
BEGIN
  guessed_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  guessed_pessoa := CASE
    WHEN lower(coalesce(guessed_name,'')) LIKE '%leandro%' THEN 'leandro'::public.pessoa
    WHEN lower(coalesce(guessed_name,'')) LIKE '%jonathan%' THEN 'jonathan'::public.pessoa
    ELSE NULL
  END;

  INSERT INTO public.workspaces(name, created_by)
  VALUES (COALESCE(guessed_name, 'Meu Workspace') || ' workspace', NEW.id)
  RETURNING id INTO new_ws_id;

  INSERT INTO public.workspace_members(workspace_id, user_id, role)
  VALUES (new_ws_id, NEW.id, 'owner');

  INSERT INTO public.profiles(id, email, display_name, active_workspace_id, pessoa)
  VALUES (NEW.id, NEW.email, guessed_name, new_ws_id, guessed_pessoa);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RPC: join_workspace_by_code ============
CREATE OR REPLACE FUNCTION public.join_workspace_by_code(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT id INTO ws_id FROM public.workspaces WHERE upper(invite_code) = upper(_code);
  IF ws_id IS NULL THEN
    RAISE EXCEPTION 'invalid code';
  END IF;
  INSERT INTO public.workspace_members(workspace_id, user_id, role)
  VALUES (ws_id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;
  UPDATE public.profiles SET active_workspace_id = ws_id, updated_at = now()
  WHERE id = auth.uid();
  RETURN ws_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_workspace_by_code(TEXT) TO authenticated;

-- ============ Realtime ============
ALTER TABLE public.accounts REPLICA IDENTITY FULL;
ALTER TABLE public.cards REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.goal_contributions REPLICA IDENTITY FULL;
ALTER TABLE public.budgets REPLICA IDENTITY FULL;
ALTER TABLE public.workspaces REPLICA IDENTITY FULL;
ALTER TABLE public.workspace_members REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
