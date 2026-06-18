
CREATE OR REPLACE FUNCTION public.enforce_email_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed TEXT[] := ARRAY['arqleandro.hensilva@gmail.com','jonathanborges@uol.com.br'];
BEGIN
  IF lower(coalesce(NEW.email,'')) <> ALL (allowed) THEN
    RAISE EXCEPTION 'Este app é de acesso restrito.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_email_whitelist_trg ON auth.users;
CREATE TRIGGER enforce_email_whitelist_trg
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_email_whitelist();
