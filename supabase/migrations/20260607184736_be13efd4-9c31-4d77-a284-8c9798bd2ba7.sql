
CREATE TABLE public.chat_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  question text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chat_questions TO authenticated;
GRANT ALL ON public.chat_questions TO service_role;
ALTER TABLE public.chat_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read chat_questions" ON public.chat_questions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_chat_questions_created_at ON public.chat_questions(created_at DESC);
