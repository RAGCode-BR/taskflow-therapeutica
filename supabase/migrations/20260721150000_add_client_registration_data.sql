ALTER TABLE public.clients
  ADD COLUMN cnpj text,
  ADD COLUMN legal_name text,
  ADD COLUMN trade_name text,
  ADD COLUMN state_registration text,
  ADD COLUMN municipal_registration text,
  ADD COLUMN address text,
  ADD COLUMN phone text,
  ADD COLUMN email text,
  ADD COLUMN responsible text;
