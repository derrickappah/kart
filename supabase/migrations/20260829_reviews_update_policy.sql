-- Migration to add update and delete policies on reviews table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reviews' AND policyname = 'Buyers can update own reviews'
  ) THEN
    CREATE POLICY "Buyers can update own reviews"
      ON reviews FOR UPDATE
      USING (auth.uid() = buyer_id)
      WITH CHECK (auth.uid() = buyer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reviews' AND policyname = 'Buyers can delete own reviews'
  ) THEN
    CREATE POLICY "Buyers can delete own reviews"
      ON reviews FOR DELETE
      USING (auth.uid() = buyer_id);
  END IF;
END $$;
