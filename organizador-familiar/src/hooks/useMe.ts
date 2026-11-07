"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api-client";
import type { Person } from "@/lib/types";

export function useMe() {
  const { data, isLoading } = useSWR<{ person: Person | null; other: Person | null }>(
    "/api/auth/me",
    swrFetcher,
  );
  return { me: data?.person ?? null, other: data?.other ?? null, isLoading };
}
