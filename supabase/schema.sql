-- Intentional: public anon clients can update the restaurant menu without signing in.
create table if not exists public.site_content (
  id text primary key check (id = 'restaurant-menu'),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

drop policy if exists "Menu owner can update restaurant menu" on public.site_content;
drop policy if exists "Anyone can update restaurant menu" on public.site_content;

alter table public.site_content
  drop column if exists owner_id;

alter table public.site_content enable row level security;

revoke all on public.site_content from public, anon, authenticated;
grant select (id, content, updated_at) on public.site_content to anon;
grant update (content, updated_at) on public.site_content to anon;

drop policy if exists "Restaurant menu is public" on public.site_content;
create policy "Restaurant menu is public"
  on public.site_content
  for select
  to anon
  using (id = 'restaurant-menu');

create policy "Anyone can update restaurant menu"
  on public.site_content
  for update
  to anon
  using (id = 'restaurant-menu')
  with check (id = 'restaurant-menu');

insert into public.site_content (id, content)
values (
  'restaurant-menu',
  '{
    "notice": "Nabídka i ceny se mohou měnit. Aktuální informace vám rádi sdělíme přímo v restauraci.",
    "sections": [
      {
        "title": "Teplá kuchyně",
        "description": "Lokální kuchyně připravovaná v zámecké restauraci.",
        "items": [
          {
            "name": "Steakové speciality na kamenném grilu",
            "description": "Speciality připravované na kamenném grilu.",
            "price": ""
          }
        ]
      },
      {
        "title": "Studená kuchyně",
        "description": "Výběr studených pokrmů podle aktuální nabídky.",
        "items": [
          {
            "name": "Studená lokální kuchyně",
            "description": "Dostupné pokrmy vám představíme v restauraci.",
            "price": ""
          }
        ]
      },
      {
        "title": "Nápoje",
        "description": "Nabídka alkoholických i nealkoholických nápojů.",
        "items": [
          {
            "name": "Pivo",
            "description": "Čepované pivo dle aktuální nabídky.",
            "price": ""
          },
          {
            "name": "Alkoholické a nealkoholické nápoje",
            "description": "Výběr nápojů v zámecké restauraci.",
            "price": ""
          }
        ]
      }
    ]
  }'::jsonb
)
on conflict (id) do nothing;

create or replace function public.set_site_content_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_content_updated_at on public.site_content;
create trigger set_site_content_updated_at
  before update on public.site_content
  for each row
  execute function public.set_site_content_updated_at();
