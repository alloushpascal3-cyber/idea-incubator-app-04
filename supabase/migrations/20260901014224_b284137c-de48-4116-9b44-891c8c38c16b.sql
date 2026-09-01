CREATE TABLE public.gemini_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot smallint NOT NULL,
  label text,
  masked text NOT NULL,
  api_key text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  cooldown_until timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gemini_keys_slot_unique UNIQUE (slot),
  CONSTRAINT gemini_keys_status_check CHECK (status IN ('available','quota','invalid','paused'))
);

GRANT ALL ON public.gemini_keys TO service_role;

ALTER TABLE public.gemini_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.gemini_keys FOR ALL TO service_role USING (true) WITH CHECK (true);