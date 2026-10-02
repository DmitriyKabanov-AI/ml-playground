import { useQuery } from '@tanstack/react-query';
import { loadIris, loadRegression, loadWalmart, loadWeather } from '@/data/source';

export const useIris = () => useQuery({ queryKey: ['iris'], queryFn: loadIris });
export const useRegressionData = () => useQuery({ queryKey: ['regression'], queryFn: loadRegression });
export const useWalmart = () => useQuery({ queryKey: ['walmart'], queryFn: loadWalmart });
export const useWeather = () => useQuery({ queryKey: ['weather'], queryFn: loadWeather });