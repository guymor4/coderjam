import { useCallback, useState } from 'react';

/**
 * A generic hook that syncs state with localStorage
 * @param key - The localStorage key
 * @param defaultValue - The default value if nothing is found in localStorage
 * @returns A tuple with the current value and a setter function
 */
export function useLocalStorageState<T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    // Initialize state with value from localStorage or default
    const [state, setState] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item === null) {
                return defaultValue;
            }
            return JSON.parse(item);
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return defaultValue;
        }
    });

    // Update localStorage when state changes
    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                // Allow value to be a function so we have the same API as useState
                const valueToStore = value instanceof Function ? value(state) : value;

                setState(valueToStore);

                // Save to localStorage
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key, state]
    );

    return [state, setValue];
}
