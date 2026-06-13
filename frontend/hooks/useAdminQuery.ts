"use client";

import {
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { useAdminAccessState } from "@/hooks/useAdminReady";

type UseAdminQueryOptions<T> = {
  enabled?: boolean;
  errorMessage: string;
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  refetchInterval?: false | number;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
};

export function useAdminQuery<T>({
  enabled = true,
  errorMessage,
  queryKey,
  queryFn,
  refetchInterval = false,
  refetchOnWindowFocus = false,
  staleTime = 0,
}: UseAdminQueryOptions<T>) {
  const { isReady } = useAdminAccessState();
  const queryClient = useQueryClient();
  const canRun = isReady && enabled;

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: canRun,
    staleTime,
    refetchOnWindowFocus,
    refetchInterval: canRun ? refetchInterval : false,
  });

  return {
    data: query.data ?? null,
    setData: (updater: T | null | ((current: T | null) => T | null)) => {
      queryClient.setQueryData<T | null>(queryKey, (current) =>
        typeof updater === "function"
          ? (updater as (current: T | null) => T | null)(current ?? null)
          : updater,
      );
    },
    isLoading: canRun ? query.isLoading : false,
    isFetching: canRun ? query.isFetching : false,
    error: query.isError ? errorMessage : "",
    clearError: () => queryClient.resetQueries({ queryKey, exact: true }),
    reload: async () => {
      await queryClient.invalidateQueries({ queryKey, exact: true });
      return query.refetch();
    },
  };
}
