-- Add UPDATE and DELETE policies for products bucket in Supabase storage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can delete product images'
    ) THEN
        CREATE POLICY "Authenticated users can delete product images"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'products');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can update product images'
    ) THEN
        CREATE POLICY "Authenticated users can update product images"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'products');
    END IF;
END $$;
