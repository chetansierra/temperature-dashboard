import { swrFetcher } from './api'

/**
 * Centralized fetcher for SWR that handles authentication automatically
 * This replaces all the individual fetcher functions across the app
 */
export const fetcher = swrFetcher

/**
 * Fetcher with query parameters support
 */
export const fetcherWithParams = (url: string, params?: Record<string, string>) => {
  const searchParams = new URLSearchParams(params)
  const fullUrl = params ? `${url}?${searchParams.toString()}` : url
  return fetcher(fullUrl)
}

/**
 * Export for backward compatibility
 */
export default fetcher