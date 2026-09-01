-- Ensure notifications table allows authenticated users to delete their own notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'notifications' AND policyname = 'Users can delete their own notifications'
    ) THEN
        CREATE POLICY "Users can delete their own notifications"
        ON public.notifications FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;
