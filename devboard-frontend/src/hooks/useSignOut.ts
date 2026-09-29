import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import authClient from '../auth';

export function useSignOut() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [error, setError] = useState('');

    const handleSignOut = async () => {
        setError('');
        setIsSigningOut(true);

        try {
            await authClient.signOut();
        } catch (err) {
            // The session is still live, so keep the cache: a different user must not
            // be able to inherit this user's data if sign out did not actually happen.
            setError(err instanceof Error ? err.message : 'Sign out failed');
            setIsSigningOut(false);
            return;
        }

        // Drop every cached query so a later navigation as a different user can never
        // read the previous user's projects straight out of the cache.
        queryClient.clear();
        setIsSigningOut(false);
        navigate('/', { replace: true });
    };

    return { handleSignOut, isSigningOut, error };
}
