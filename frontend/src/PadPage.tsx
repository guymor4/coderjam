import { Navigate, useParams } from 'react-router-dom';
import { PadEditor } from './components/PadEditor';
import { useCallback, useEffect, useState } from 'react';
import type { Pad } from './types/api';
import { getPad, updatePad } from './lib/api';
import { useDebounce } from 'use-debounce';

export function PadPage() {
    const { padId } = useParams<{ padId: string }>();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | undefined>(undefined);
    const [pad, setPad] = useState<Pad | undefined>(undefined);
    const [debouncedPad] = useDebounce(pad, 100, {
        maxWait: 500,
    });

    // Load pad data from API
    useEffect(() => {
        if (!padId) {
            setError(new Error('Pad ID is required'));
            setIsLoading(false);
            return;
        }

        const loadPad = async () => {
            try {
                setIsLoading(true);
                setError(undefined);

                const pad: Pad = await getPad(padId);
                setPad(pad);
            } catch (err) {
                setError(err as Error);
                console.error('Error loading pad:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadPad();
    }, [padId]);

    // Save pad data to API when debouncedPad changes
    useEffect(() => {
        if (!debouncedPad) {
            return;
        }

        const doUpdatePad = async () => {
            try {
                await updatePad(debouncedPad.id, debouncedPad.language, debouncedPad.code);
                console.log('Pad saved:', debouncedPad);
            } catch (err) {
                console.error('Error saving debouncedPad:', err);
            }
        };

        doUpdatePad();
    }, [debouncedPad]);

    const handleCodeChange = useCallback((newCode: string) => {
        setPad((prevPad) =>
            prevPad
                ? {
                      ...prevPad,
                      code: newCode,
                  }
                : undefined
        );
    }, []);

    const handleLanguageChange = useCallback((newLanguage: string) => {
        setPad((prevPad) =>
            prevPad
                ? {
                      ...prevPad,
                      language: newLanguage,
                  }
                : undefined
        );
    }, []);

    if (!padId) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return (
            <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
                <div className="text-lg">Loading pad...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
                <div className="text-lg text-red-400">
                    Error: {error.name}: {error.message}
                </div>
            </div>
        );
    }

    return (
        <PadEditor
            key={(pad as Pad).id}
            padId={(pad as Pad).id}
            language={(pad as Pad).language}
            code={(pad as Pad).code}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
        />
    );
}
