insert into public.bookly_orders (
  order_number, customer_email, status, total_amount, currency,
  shipping_address, carrier, tracking_number, estimated_delivery,
  delivered_at, return_eligible, metadata
)
values
  ('BK-1001', 'ana.garcia@example.com', 'pending', 24.90, 'USD', '{"city":"Quito","country":"EC"}', null, null, current_date + 5, null, false, '{"book_title":"The Alchemist"}'),
  ('BK-1002', 'bruno.lopez@example.com', 'processing', 42.50, 'USD', '{"city":"Guayaquil","country":"EC"}', null, null, current_date + 4, null, false, '{"book_title":"Designing Data-Intensive Applications"}'),
  ('BK-1003', 'carla.mora@example.com', 'shipped', 18.99, 'USD', '{"city":"Cuenca","country":"EC"}', 'DHL', 'DHL-BK1003', current_date + 3, null, true, '{"book_title":"The Midnight Library"}'),
  ('BK-1004', 'diego.vega@example.com', 'out_for_delivery', 31.75, 'USD', '{"city":"Loja","country":"EC"}', 'UPS', 'UPS-BK1004', current_date + 1, null, true, '{"book_title":"Sapiens"}'),
  ('BK-1005', 'elena.ruiz@example.com', 'delivered', 15.25, 'USD', '{"city":"Manta","country":"EC"}', 'DHL', 'DHL-BK1005', current_date - 4, now() - interval '4 days', true, '{"book_title":"The Little Prince"}'),
  ('BK-1006', 'fabian.castro@example.com', 'delivered', 29.99, 'USD', '{"city":"Ambato","country":"EC"}', 'FedEx', 'FDX-BK1006', current_date - 10, now() - interval '10 days', false, '{"book_title":"Atomic Habits"}'),
  ('BK-1007', 'gabriela.santos@example.com', 'cancelled', 21.00, 'USD', '{"city":"Riobamba","country":"EC"}', null, null, null, null, false, '{"book_title":"1984"}'),
  ('BK-1008', 'hector.naranjo@example.com', 'refunded', 36.40, 'USD', '{"city":"Ibarra","country":"EC"}', null, null, null, null, false, '{"book_title":"Clean Code"}'),
  ('BK-1009', 'ines.paredes@example.com', 'shipped', 27.80, 'USD', '{"city":"Santo Domingo","country":"EC"}', 'Servientrega', 'SER-BK1009', current_date + 2, null, true, '{"book_title":"Don Quixote"}'),
  ('BK-1010', 'juan.mendoza@example.com', 'processing', 19.50, 'USD', '{"city":"Machala","country":"EC"}', null, null, current_date + 6, null, false, '{"book_title":"Pride and Prejudice"}')
on conflict (order_number) do update set
  customer_email = excluded.customer_email,
  status = excluded.status,
  total_amount = excluded.total_amount,
  currency = excluded.currency,
  shipping_address = excluded.shipping_address,
  carrier = excluded.carrier,
  tracking_number = excluded.tracking_number,
  estimated_delivery = excluded.estimated_delivery,
  delivered_at = excluded.delivered_at,
  return_eligible = excluded.return_eligible,
  metadata = excluded.metadata,
  updated_at = now();
