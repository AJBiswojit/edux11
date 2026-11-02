import { useQuery } from '@tanstack/react-query'
import { getQuery as get } from './query'

/**
 * Faculty Academic Intelligence Foundation — service hooks.
 * Consume the centralized profile / datasets / derived intelligence via the
 * API layer (swap to real backend with VITE_USE_MOCK=false, zero code changes).
 */

export const useFacultyIntelligence = () => useQuery(get('/faculty-intelligence/summary', ['faculty-intelligence', 'summary']))
