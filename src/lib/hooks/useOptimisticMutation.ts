"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

export type OptimisticMutationOptions<
  TData,
  TError,
  TVariables,
  TQueryData,
> = Omit<
  UseMutationOptions<TData, TError, TVariables, { previous?: TQueryData }>,
  "onMutate"
> & {
  /** Query key whose cache should be optimistically updated. */
  queryKey: QueryKey;
  /**
   * Pure function: given the variables and the current cached value, return
   * the optimistic next value. If undefined, the cache is left untouched but
   * still invalidated on settle.
   */
  optimisticUpdate?: (vars: TVariables, current: TQueryData | undefined) => TQueryData | undefined;
  /** Toast on success (string or function of returned data). */
  successMessage?: string | ((data: TData, vars: TVariables) => string);
  /** Toast on error. Defaults to error.message or "Something went wrong". */
  errorMessage?: string | ((error: TError, vars: TVariables) => string);
  /** Set false to suppress automatic toasts. */
  showToasts?: boolean;
  /**
   * Other query keys that should be invalidated when the mutation settles.
   * Useful for downstream lists/aggregates.
   */
  invalidateKeys?: QueryKey[];
};

/**
 * Thin wrapper around React Query's useMutation that:
 *
 * 1. Snapshots the cache for `queryKey`,
 * 2. Optimistically applies `optimisticUpdate` to it,
 * 3. Rolls back on error,
 * 4. Invalidates the key (and any extras in `invalidateKeys`) on settle,
 * 5. Surfaces success/error toasts (overridable / suppressible).
 *
 * Use this for any mutation where the UI should feel instant — kanban moves,
 * checkbox toggles, inline edits, status approvals, etc.
 */
export function useOptimisticMutation<
  TData = unknown,
  TError extends { message?: string } = Error,
  TVariables = void,
  TQueryData = unknown,
>(
  options: OptimisticMutationOptions<TData, TError, TVariables, TQueryData>
): UseMutationResult<TData, TError, TVariables, { previous?: TQueryData }> {
  const queryClient = useQueryClient();
  const {
    queryKey,
    optimisticUpdate,
    successMessage,
    errorMessage,
    showToasts = true,
    invalidateKeys,
    onSuccess: callerOnSuccess,
    onError: callerOnError,
    onSettled: callerOnSettled,
    ...rest
  } = options;

  return useMutation<TData, TError, TVariables, { previous?: TQueryData }>({
    ...rest,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TQueryData>(queryKey);
      if (optimisticUpdate) {
        const next = optimisticUpdate(vars, previous);
        if (next !== undefined) {
          queryClient.setQueryData<TQueryData>(queryKey, next);
        }
      }
      return { previous };
    },
    onError: (error, vars, onMutateResult, mutationCtx) => {
      const previous = onMutateResult?.previous;
      if (previous !== undefined) {
        queryClient.setQueryData(queryKey, previous);
      }
      if (showToasts) {
        const msg =
          typeof errorMessage === "function"
            ? errorMessage(error, vars)
            : errorMessage ?? error?.message ?? "Something went wrong";
        toast.error(msg);
      }
      // Forward to a caller-provided onError if present.
      callerOnError?.(error, vars, onMutateResult, mutationCtx);
    },
    onSuccess: (data, vars, onMutateResult, mutationCtx) => {
      if (showToasts && successMessage) {
        const msg =
          typeof successMessage === "function" ? successMessage(data, vars) : successMessage;
        toast.success(msg);
      }
      callerOnSuccess?.(data, vars, onMutateResult, mutationCtx);
    },
    onSettled: (data, error, vars, onMutateResult, mutationCtx) => {
      queryClient.invalidateQueries({ queryKey });
      invalidateKeys?.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
      callerOnSettled?.(data, error, vars, onMutateResult, mutationCtx);
    },
  });
}
