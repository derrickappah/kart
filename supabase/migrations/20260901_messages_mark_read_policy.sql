-- Policy: Users can mark messages as read in conversations they belong to
create policy "Users can update read status in their conversations"
  on messages for update
  using (
    exists (
      select 1 from conversations
      where id = messages.conversation_id
      and auth.uid() = any(participants)
    )
  )
  with check (
    exists (
      select 1 from conversations
      where id = messages.conversation_id
      and auth.uid() = any(participants)
    )
  );
