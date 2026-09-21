create table if not exists public.bookly_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  shipping_address jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookly_carts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id uuid references public.bookly_users(id) on delete set null,
  status text not null default 'active' check (status in ('active','converted','abandoned')),
  currency text not null default 'USD' check (currency in ('USD','EUR','GBP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookly_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.bookly_carts(id) on delete cascade,
  book_id uuid references public.bookly_books(id) on delete set null,
  isbn text,
  title text not null,
  author text,
  cover_url text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (cart_id, isbn)
);

create table if not exists public.bookly_checkouts (
  id uuid primary key default gen_random_uuid(),
  checkout_number text not null unique,
  session_id text not null,
  user_id uuid references public.bookly_users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','confirmed','payment_pending','paid','cancelled')),
  customer_name text not null,
  customer_email text not null,
  shipping_address jsonb not null default '{}'::jsonb,
  payment_method text,
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  total_amount numeric(10,2) not null default 0 check (total_amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','EUR','GBP')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookly_checkout_items (
  id uuid primary key default gen_random_uuid(),
  checkout_id uuid not null references public.bookly_checkouts(id) on delete cascade,
  book_id uuid references public.bookly_books(id) on delete set null,
  isbn text,
  title text not null,
  author text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists bookly_users_email_idx on public.bookly_users (email);
create index if not exists bookly_cart_items_cart_idx on public.bookly_cart_items (cart_id);
create index if not exists bookly_checkouts_email_idx on public.bookly_checkouts (customer_email);
create index if not exists bookly_checkouts_status_idx on public.bookly_checkouts (status);
create index if not exists bookly_checkout_items_checkout_idx on public.bookly_checkout_items (checkout_id);

alter table public.bookly_users enable row level security;
alter table public.bookly_carts enable row level security;
alter table public.bookly_cart_items enable row level security;
alter table public.bookly_checkouts enable row level security;
alter table public.bookly_checkout_items enable row level security;

comment on table public.bookly_users is 'Customer profiles captured during conversational checkout.';
comment on table public.bookly_carts is 'Active and historical shopping carts by chat session.';
comment on table public.bookly_checkouts is 'Conversational checkout records; payment remains pending until a provider confirms it.';
