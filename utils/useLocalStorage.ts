"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const item = window.localStorage.getItem(key);

      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
      } else {
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.error(`Erro ao ler localStorage (${key}):`, error);
      setStoredValue(initialValue);
    } finally {
      setCarregou(true);
    }
  }, [key]);

  useEffect(() => {
    if (!carregou || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Erro ao salvar localStorage (${key}):`, error);
    }
  }, [key, storedValue, carregou]);

  return [storedValue, setStoredValue, carregou];
}