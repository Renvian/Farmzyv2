-- 1. Drop the existing foreign key constraint that blocks deletion or cascades
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_crop_id_fkey;

-- 2. Make crop_id nullable
ALTER TABLE public.orders ALTER COLUMN crop_id DROP NOT NULL;

-- 3. Add a new constraint that sets crop_id to NULL when the crop is deleted
ALTER TABLE public.orders ADD CONSTRAINT orders_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.crops(id) ON DELETE SET NULL;

-- 4. Add snapshot columns so order history retains the crop details even if the crop is deleted
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS snapshot_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS snapshot_unit TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS snapshot_image TEXT;

-- 5. Backfill existing orders with snapshot data
UPDATE public.orders 
SET 
  snapshot_name = c.name,
  snapshot_unit = c.unit,
  snapshot_image = c.image_url
FROM public.crops c 
WHERE public.orders.crop_id = c.id AND public.orders.snapshot_name IS NULL;
