import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCurrentState, 
  getEggHistory, 
  postEggConfirmation, 
  undoEggConfirmation,
  denyEggTaking,
  getEventDetails 
} from '@/services/api';
import { saveEggState, getLastEggState, saveEvent } from '@/services/db';
import type { EggState, EggEvent } from '@/types';

export const useCurrentEggState = () => {
  return useQuery<EggState>({
    queryKey: ['eggState'],
    queryFn: async () => {
      try {
        const state = await getCurrentState();
        await saveEggState(state);
        return state;
      } catch (error) {
        // Fallback to cached state if offline
        const cached = await getLastEggState();
        if (cached) return cached;
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
};

export const useEggHistory = (boxId?: string) => {
  return useQuery<EggEvent[]>({
    queryKey: ['eggHistory', boxId],
    queryFn: async () => {
      const history = await getEggHistory(boxId);
      // Cache events
      for (const event of history) {
        await saveEvent(event);
      }
      return history;
    },
    staleTime: 60000, // 1 minute
  });
};

export const useEventDetails = (eventId: string) => {
  return useQuery<EggEvent>({
    queryKey: ['event', eventId],
    queryFn: () => getEventDetails(eventId),
    enabled: !!eventId,
  });
};

export const useConfirmEgg = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: postEggConfirmation,
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['eggHistory'] });
      queryClient.invalidateQueries({ queryKey: ['eggState'] });
      queryClient.setQueryData(['event', updatedEvent.id], updatedEvent);
    },
  });
};

export const useUndoConfirmation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: undoEggConfirmation,
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['eggHistory'] });
      queryClient.invalidateQueries({ queryKey: ['eggState'] });
      queryClient.setQueryData(['event', updatedEvent.id], updatedEvent);
    },
  });
};

export const useDenyEggTaking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: denyEggTaking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eggHistory'] });
    },
  });
};
