-- Corrige o cadastro de novos usuários ("Database error creating new user").
--
-- Causa: assign_member_number() usava nextval('member_number_seq') sem qualificar
-- o schema. O serviço de auth (GoTrue) executa com search_path restrito ao schema
-- "auth", então a sequência não era encontrada e o INSERT em profiles (disparado
-- pelo handle_new_user) falhava, revertendo a criação do usuário inteira.
--
-- Correção: qualifica a sequência com "public." e fixa o search_path da função.

CREATE OR REPLACE FUNCTION public.assign_member_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.member_number IS NULL THEN
    NEW.member_number := nextval('public.member_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

-- Garantia extra: permite uso da sequência pelos papéis de serviço
GRANT USAGE, SELECT ON SEQUENCE public.member_number_seq TO supabase_auth_admin, service_role;
