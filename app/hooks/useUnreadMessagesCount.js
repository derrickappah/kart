'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const fetcher = async (url) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch unread count');
  return res.json();
};

export const UNREAD_MESSAGES_COUNT_KEY = '/api/messages/unread-count';

/**
 * Global helper to notify all components that messages have been read
 */
export function broadcastMessagesRead(conversationId) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kart:messages-read', { detail: { conversationId } }));
  }
}

export function useUnreadMessagesCount(user) {
  const [supabase] = useState(() => createClient());

  const { data, mutate, isLoading } = useSWR(
    user ? UNREAD_MESSAGES_COUNT_KEY : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      revalidateOnReconnect: true,
      dedupingInterval: 500,
    }
  );

  const refreshCount = useCallback(() => {
    mutate();
  }, [mutate]);

  useEffect(() => {
    if (!user) return;

    // Listen to local broadcast event when a chat is opened / marked read
    const handleLocalRead = (event) => {
      const convId = event.detail?.conversationId;
      if (convId) {
        // Optimistically remove conversation from unread list
        mutate((prev) => {
          if (!prev) return { unreadCount: 0, unreadConversations: [] };
          const remainingConvs = (prev.unreadConversations || []).filter(id => id !== convId);
          return {
            ...prev,
            unreadCount: remainingConvs.length,
            unreadConversations: remainingConvs,
          };
        }, false);
      }
      mutate();
    };

    window.addEventListener('kart:messages-read', handleLocalRead);

    // Real-time subscription to update unread message count on any change
    const channel = supabase
      .channel('realtime:unread-messages-count-global')
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
      window.removeEventListener('kart:messages-read', handleLocalRead);
      supabase.removeChannel(channel);
    };
  }, [user, supabase, mutate]);

  return {
    unreadCount: data?.unreadCount ?? 0,
    unreadConversations: data?.unreadConversations || [],
    mutate,
    refreshCount,
    isLoading,
  };
}
