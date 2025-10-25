-- Update generate_unique_slug function to generate 7 character IDs
CREATE OR REPLACE FUNCTION public.generate_unique_slug()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  LOOP
    new_slug := lower(substring(md5(random()::text) from 1 for 7));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE unique_slug = new_slug) INTO slug_exists;
    IF NOT slug_exists THEN
      RETURN new_slug;
    END IF;
  END LOOP;
END;
$function$;