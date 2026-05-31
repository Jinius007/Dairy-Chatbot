CREATE TABLE IF NOT EXISTS public.conversation_turns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  conversation_id text NULL,
  question text NOT NULL,
  answer text NULL,
  duration_ms integer NULL,
  language text NULL,
  is_voice boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'chat'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversation_turns_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS conversation_turns_session_id_idx
  ON public.conversation_turns USING btree (session_id);

CREATE INDEX IF NOT EXISTS conversation_turns_created_at_idx
  ON public.conversation_turns USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS conversation_turns_conversation_id_idx
  ON public.conversation_turns USING btree (conversation_id);
