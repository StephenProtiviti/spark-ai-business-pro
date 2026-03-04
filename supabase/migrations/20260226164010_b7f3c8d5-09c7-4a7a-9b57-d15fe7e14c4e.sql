-- Allow anyone to update ideas (matching existing permissive pattern)
CREATE POLICY "Anyone can update ideas"
ON public.ideas
FOR UPDATE
USING (true)
WITH CHECK (true);