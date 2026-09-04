import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

export function useRealtimeTournament(onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onRefreshRef.current();
      }, 250);
    };

    const channel = supabase
      .channel('app-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => triggerRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_members' },
        () => triggerRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => triggerRefresh()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Realtime WebSockets: conectado y sincronizando.');
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);
}
