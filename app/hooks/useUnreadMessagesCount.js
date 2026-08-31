'use client';

import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch unread count');
  return res.json();
};

export function useUnreadMessagesCount(user) {
  const [supabase] = useState(() => createClient());

  const { data, mutate, isLoading } = useSWR(
    user ? '/api/messages/unread-count' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 4000,
    }
  );

  useEffect(() => {
    if (!user) return;

    // Real-time subscription to update unread message count when messages change
    const channel = supabase
      .channel('realtime:unread-messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, mutate]);

  return {
    unreadCount: data?.unreadCount || 0,
    unreadConversations: data?.unreadConversations || [],
    mutate,
    isLoading,
  };
}
