import { createPad } from '../lib/api';
import { useEffect, useState } from 'react';

export function HomePage() {
    const [isLoading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);

        const createPadAndRedirect = async () => {
            try {
                const newId = await createPad();
                if (!newId || !newId.id) {
                    throw new Error('Failed to create a new pad: invalid response');
                }
                window.location.href = `/p/${newId.id}`;
            } catch (err: unknown) {
                console.error('Failed to create a new pad', err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        createPadAndRedirect();
    }, []);

    return (
        <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
            {isLoading ? (
                <div className="text-2xl">Loading...</div>
            ) : error ? (
                <div className="text-2xl text-red-500">Error: {error.message}</div>
            ) : (
                <div className="text-2xl">Redirecting...</div>
            )}
        </div>
    );
}
