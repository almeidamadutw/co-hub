-- Armazena fotos de perfil como arquivos e mantém no banco apenas a referência.
-- O bucket é privado. Uploads, leituras temporárias, trocas e remoções são
-- executados pela rota autenticada do servidor com service_role.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'ceo-club-avatares',
  'ceo-club-avatares',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
      message = 'A foto do perfil deve ser enviada pelo Storage do CEO Club.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_validar_foto_perfil_storage
  on public.profiles;

create trigger trg_validar_foto_perfil_storage
before insert or update of foto_url
on public.profiles
for each row
execute function public.validar_foto_perfil_storage();

revoke all on function public.validar_foto_perfil_storage()
from public, anon, authenticated;

grant execute on function public.validar_foto_perfil_storage()
to service_role;

notify pgrst, 'reload schema';
