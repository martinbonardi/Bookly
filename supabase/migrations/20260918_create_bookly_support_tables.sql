create table if not exists public.bookly_books (
  id uuid primary key default gen_random_uuid(),
  isbn text unique,
  title text not null,
  author text not null,
  description text,
  genre text,
  language text not null default 'es',
  price numeric(10,2) not null default 0 check (price >= 0),
  currency text not null default 'USD' check (currency in ('USD','EUR','GBP')),
  stock integer not null default 0 check (stock >= 0),
  published_year integer check (published_year is null or published_year between 1000 and 2100),
  cover_url text,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(description, '') || ' ' || coalesce(genre, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookly_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_email text,
  status text not null default 'pending' check (status in ('pending','processing','shipped','out_for_delivery','delivered','cancelled','refunded')),
  total_amount numeric(10,2) not null default 0 check (total_amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','EUR','GBP')),
  shipping_address jsonb not null default '{}'::jsonb,
  carrier text,
  tracking_number text,
  estimated_delivery date,
  delivered_at timestamptz,
  return_eligible boolean not null default false,
  return_status text not null default 'none' check (return_status in ('none','requested','approved','received','refunded','rejected')),
  return_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookly_conversation_history (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  customer_email text,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  intent text,
  tool_name text,
  tool_input jsonb,
  tool_output jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bookly_books_search_vector_idx on public.bookly_books using gin (search_vector);
create index if not exists bookly_books_author_idx on public.bookly_books (author);
create index if not exists bookly_books_genre_idx on public.bookly_books (genre);
create index if not exists bookly_orders_customer_email_idx on public.bookly_orders (customer_email);
create index if not exists bookly_orders_status_idx on public.bookly_orders (status);
create index if not exists bookly_orders_tracking_idx on public.bookly_orders (tracking_number);
create index if not exists bookly_conversation_session_created_idx on public.bookly_conversation_history (session_id, created_at);

alter table public.bookly_books enable row level security;
alter table public.bookly_orders enable row level security;
alter table public.bookly_conversation_history enable row level security;

comment on table public.bookly_books is 'Bookly catalog used for book search and recommendations.';
comment on table public.bookly_orders is 'Bookly orders used for status, tracking and returns.';
comment on table public.bookly_conversation_history is 'Immutable audit trail of Bookly support conversations and tool calls.';
