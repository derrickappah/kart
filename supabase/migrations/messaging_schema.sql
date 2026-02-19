-- Create conversations table
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  participants uuid[] not null -- Array of user IDs [buyer_id, seller_id]
);

-- Establish RLS for conversations
alter table conversations enable row level security;

-- Policy: Users can view conversations they are part of
create policy "Users can view their own conversations"
  on conversations for select
  using ( auth.uid() = any(participants) );

-- Policy: Users can create conversations (if they include themselves)
create policy "Users can create conversations"
  on conversations for insert
  with check ( auth.uid() = any(participants) );


-- Create messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references auth.users not null,
  content text not null,
  is_read boolean default false
);

-- Establish RLS for messages
alter table messages enable row level security;

-- Policy: Users can view messages in conversations they belong to
create policy "Users can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where id = messages.conversation_id
      and auth.uid() = any(participants)
    )
  );

-- Policy: Users can insert messages if they are part of the conversation
create policy "Users can send messages"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations
      where id = conversation_id
      and auth.uid() = any(participants)
    )
  );

-- Enable Realtime for these tables
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
