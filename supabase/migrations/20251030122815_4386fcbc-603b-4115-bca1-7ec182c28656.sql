-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  genre TEXT NOT NULL CHECK (genre IN ('scary', 'funny', 'sci-fi')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story_segments table
CREATE TABLE public.story_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  sequence_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Users can view their own stories"
ON public.stories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stories"
ON public.stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
ON public.stories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON public.stories FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for story_segments
CREATE POLICY "Users can view segments of their stories"
ON public.story_segments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_segments.story_id
    AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create segments for their stories"
ON public.story_segments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_segments.story_id
    AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update segments of their stories"
ON public.story_segments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_segments.story_id
    AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete segments of their stories"
ON public.story_segments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_segments.story_id
    AND stories.user_id = auth.uid()
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stories_updated_at
BEFORE UPDATE ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_story_segments_story_id ON public.story_segments(story_id);
CREATE INDEX idx_story_segments_sequence ON public.story_segments(story_id, sequence_order);