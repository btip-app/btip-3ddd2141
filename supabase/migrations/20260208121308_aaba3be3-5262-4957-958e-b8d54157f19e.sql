
-- Add latitude and longitude columns to incidents for map markers
ALTER TABLE public.incidents ADD COLUMN lat double precision;
ALTER TABLE public.incidents ADD COLUMN lng double precision;

-- Backfill existing incidents with approximate coordinates
UPDATE public.incidents SET lat = 6.5244, lng = 3.3792 WHERE location ILIKE '%Lagos%';
UPDATE public.incidents SET lat = 4.8156, lng = 7.0498 WHERE location ILIKE '%Port Harcourt%';
UPDATE public.incidents SET lat = 12.0022, lng = 8.5920 WHERE location ILIKE '%Kano%';
UPDATE public.incidents SET lat = 9.0765, lng = 7.3986 WHERE location ILIKE '%Abuja%';
UPDATE public.incidents SET lat = 5.5560, lng = -0.1969 WHERE location ILIKE '%Accra%';
UPDATE public.incidents SET lat = 4.0511, lng = 9.7679 WHERE location ILIKE '%Douala%';
UPDATE public.incidents SET lat = 6.3350, lng = 5.6037 WHERE location ILIKE '%Benin%';
UPDATE public.incidents SET lat = -1.2921, lng = 36.8219 WHERE location ILIKE '%Nairobi%';
UPDATE public.incidents SET lat = 30.0444, lng = 31.2357 WHERE location ILIKE '%Cairo%';
UPDATE public.incidents SET lat = -26.2041, lng = 28.0473 WHERE location ILIKE '%Johannesburg%';
-- Default for any remaining without coordinates
UPDATE public.incidents SET lat = 9.0820, lng = 8.6753 WHERE lat IS NULL;
