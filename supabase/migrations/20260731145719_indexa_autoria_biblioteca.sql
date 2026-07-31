create index if not exists idx_biblioteca_arquivos_criado_por
  on public.biblioteca_arquivos (criado_por)
  where criado_por is not null;

create index if not exists idx_biblioteca_pastas_criada_por
  on public.biblioteca_pastas (criada_por)
  where criada_por is not null;
