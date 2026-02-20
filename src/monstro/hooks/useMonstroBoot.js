import { useEffect } from 'react';
import { useMonstroStore } from '../store/monstroStore';

export const useMonstroBoot = () => {
    const { fetchData } = useMonstroStore();

    useEffect(() => {
        // Carrega dados iniciais do D1
        console.log("Monstro System: Booting from Cloudflare Edge...");
        fetchData();
    }, []);
};
