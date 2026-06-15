-- Execute este script no SQL Editor do painel Supabase
-- Dashboard > SQL Editor > New query > Cole e clique em Run
--
-- Diagnóstico: verifica o role atual do usuário
SELECT
  p.id,
  p.full_name,
  p.role,
  u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at;

-- Correção: defina como admin o usuário pelo e-mail
-- Substitua o e-mail abaixo pelo e-mail da sua conta de admin
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'contato.neurobotics@gmail.com'
);
