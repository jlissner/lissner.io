import { useCallback, useEffect, useMemo, useState } from "react";
import type { Person } from "./people-types";

interface UsePeopleListOptions {
  initialSelectedId?: number | null;
}

export function usePeopleList({ initialSelectedId = null }: UsePeopleListOptions = {}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);

  const fetchPeople = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/people");
      if (res.ok) setPeople(await res.json());
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedId) ?? null,
    [people, selectedId]
  );
  const selectedName = selectedPerson?.name ?? "";

  return {
    people,
    loading,
    selectedId,
    setSelectedId,
    selectedPerson,
    selectedName,
    fetchPeople,
  };
}

