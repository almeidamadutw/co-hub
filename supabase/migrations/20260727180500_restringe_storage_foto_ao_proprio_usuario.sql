-- Defesa em profundidade: cada perfil só pode referenciar arquivos localizados
-- dentro da própria pasta no bucket privado de avatares.

create or replace function public.validar_foto_perfil_storage()
returns trigger
language plpgsql
security invoker
set search_path to pg_catalog, public
as $function$
begin
  if tg_op = 'UPDATE'
    and new.foto_url is not distinct from old.foto_url
  then
    return new;
  end if;

  if new.foto_url is null then
    return new;
  end if;

  if length(new.foto_url) > 2048
    or new.foto_url not like (
      'storage://ceo-club-avatares/' || new.id::text || '/%'
    )
  then
    raise exception using
      errcode = '22023',
      message = 'A foto do perfil deve ser enviada para a pasta do próprio usuário.';
  end if;

  return new;
end;
$function$;

revoke all on function public.validar_foto_perfil_storage()
from public, anon, authenticated;

grant execute on function public.validar_foto_perfil_storage()
to service_role;

notify pgrst, 'reload schema';
