"use client";

import useSWR from "swr";
import { swrFetcher, apiSend } from "@/lib/api-client";
import type { Task } from "@/lib/types";

export function useTasks(from: string, to: string) {
  const key = `/api/tasks?from=${from}&to=${to}`;
  const { data, error, isLoading, mutate } = useSWR<{ tasks: Task[] }>(key, swrFetcher, {
    refreshInterval: 20000,
    revalidateOnFocus: true,
  });

  return {
    tasks: data?.tasks ?? [],
    error,
    isLoading,
    mutate,
  };
}

export async function completeTask(id: string, actualMinutes?: number, notes?: string) {
  return apiSend<{ task: Task }>(`/api/tasks/${id}`, "PATCH", {
    action: "complete",
    actualMinutes,
    notes,
  });
}

export async function uncompleteTask(id: string) {
  return apiSend<{ task: Task }>(`/api/tasks/${id}`, "PATCH", { action: "uncomplete" });
}

export async function toggleSubtask(id: string, index: number, done: boolean) {
  return apiSend<{ task: Task }>(`/api/tasks/${id}`, "PATCH", {
    action: "toggleSubtask",
    index,
    done,
  });
}

export async function reassignTask(id: string, personId: string | null) {
  return apiSend<{ task: Task }>(`/api/tasks/${id}`, "PATCH", { action: "reassign", personId });
}

export async function rescheduleTask(id: string, date: string) {
  return apiSend<{ task: Task }>(`/api/tasks/${id}`, "PATCH", { action: "reschedule", date });
}
