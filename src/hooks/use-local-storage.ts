import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to persist state in localStorage with TypeScript support
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value - always use initialValue for SSR
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
        setIsInitialized(true);
      } catch (error) {
        console.warn(`Error loading localStorage key "${key}":`, error);
        setIsInitialized(true);
      }
    }
  }, [key, isInitialized]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        setStoredValue((prevValue) => {
          const valueToStore = value instanceof Function ? value(prevValue) : value;
          
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }
          
          return valueToStore;
        });
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  // Function to remove the item from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * User preferences interface
 */
export interface UserPreferences {
  rememberLocation: boolean;
  lastLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  preferredFuelType?: string;
  preferredRadius?: number;
  preferredView?: 'list' | 'map';
  maxPrice?: {
    [fuelType: string]: number;
  };
}

/**
 * Hook for managing user preferences
 */
export function useUserPreferences() {
  const [preferences, setPreferences, clearPreferences] = useLocalStorage<UserPreferences>(
    'fuelFinder_preferences',
    {
      rememberLocation: false,
    }
  );

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setPreferences]
  );

  const saveLocation = useCallback(
    (latitude: number, longitude: number, address?: string) => {
      if (preferences.rememberLocation) {
        setPreferences((prev) => ({
          ...prev,
          lastLocation: { latitude, longitude, address },
        }));
      }
    },
    [preferences.rememberLocation, setPreferences]
  );

  const clearLocation = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      lastLocation: undefined,
    }));
  }, [setPreferences]);

  return {
    preferences,
    updatePreference,
    saveLocation,
    clearLocation,
    clearAllPreferences: clearPreferences,
  };
}
