// React hooks that fetch data with TanStack Query.
// TanStack Query caches results, so revisiting a page is instant and
// doesn't use up any of AniList's rate limit.
import { useState } from 'react'
import { keepPreviousData, queryOptions, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import * as anilist from '../api/anilist'
import { loadSearchIndex } from '../lib/localSearch'
import type { PeopleSort, TonightEra, TonightMood, TonightTime } from '../api/anilist'
import { getThemes } from '../api/animethemes'
import type { AnimePage, SearchParams, Season, TopFilter } from '../types/anime'

export function useTrending(perPage = 12) {
  return useQuery({
    queryKey: ['trending', perPage],
    queryFn: ({ signal }) => anilist.getTrending(perPage, signal),
  })
}

export function useTopAnime(filter?: TopFilter, page = 1, perPage = 25) {
  return useQuery({
    queryKey: ['top', filter ?? 'all', page, perPage],
    queryFn: ({ signal }) => anilist.getTopAnime(filter, page, perPage, signal),
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  })
}

export function useSeason(year: number, season: Season, page = 1, perPage = 24) {
  return useQuery({
    queryKey: ['season', year, season, page, perPage],
    queryFn: ({ signal }) => anilist.getSeason(year, season, page, perPage, signal),
    placeholderData: keepPreviousData,
  })
}

// ---------- Infinite scroll ----------
// useInfiniteQuery keeps a list of pages. Calling fetchNextPage() loads the next one
// (we do that when you scroll near the bottom, see components/LoadMore.tsx).

/** After a page, which page comes next? `undefined` means "no more pages". */
const nextPage = (last: AnimePage, maxPage = Infinity) =>
  last.pageInfo.hasNextPage && last.pageInfo.currentPage < maxPage ? last.pageInfo.currentPage + 1 : undefined

export function useSearchAnimeInfinite(params: SearchParams) {
  return useInfiniteQuery({
    queryKey: ['search', params],
    queryFn: ({ pageParam, signal }) => anilist.searchAnime(params, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => nextPage(last),
    placeholderData: keepPreviousData,
  })
}

/** The Top 100: up to 4 pages of 25. */
export function useTopAnimeInfinite(filter?: TopFilter) {
  return useInfiniteQuery({
    queryKey: ['top-infinite', filter ?? 'all'],
    queryFn: ({ pageParam, signal }) => anilist.getTopAnime(filter, pageParam, 25, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => nextPage(last, 4),
    placeholderData: keepPreviousData,
  })
}

export function useStudio(id: number, sort: PeopleSort) {
  return useInfiniteQuery({
    queryKey: ['studio', id, sort],
    queryFn: ({ pageParam, signal }) => anilist.getStudio(id, pageParam, sort, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.media.pageInfo.hasNextPage ? last.media.pageInfo.currentPage + 1 : undefined),
    enabled: Number.isFinite(id) && id > 0,
    placeholderData: keepPreviousData,
  })
}

export function useStaff(id: number, sort: PeopleSort) {
  return useInfiniteQuery({
    queryKey: ['staff', id, sort],
    queryFn: ({ pageParam, signal }) => anilist.getStaff(id, pageParam, sort, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.characterMedia.pageInfo.hasNextPage ? last.characterMedia.pageInfo.currentPage + 1 : undefined,
    enabled: Number.isFinite(id) && id > 0,
    placeholderData: keepPreviousData,
  })
}

export function useCharacter(id: number, sort: PeopleSort) {
  return useInfiniteQuery({
    queryKey: ['character', id, sort],
    queryFn: ({ pageParam, signal }) => anilist.getCharacter(id, pageParam, sort, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.media.pageInfo.hasNextPage ? last.media.pageInfo.currentPage + 1 : undefined),
    enabled: Number.isFinite(id) && id > 0,
    placeholderData: keepPreviousData,
  })
}

/** All episodes airing between two unix times (seconds). */
export function useSchedule(from: number, to: number) {
  return useQuery({
    queryKey: ['schedule', from, to],
    queryFn: ({ signal }) => anilist.getSchedule(from, to, signal),
    staleTime: 1000 * 60 * 30,
  })
}

/** Shared by useAnime and by hover-prefetching (components/AnimeLink.tsx), so both use the same cache entry. */
export const animeQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['anime', id],
    queryFn: ({ signal }) => anilist.getAnimeById(id, signal),
  })

export function useAnime(id: number) {
  return useQuery({ ...animeQueryOptions(id), enabled: Number.isFinite(id) && id > 0 })
}

export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: ({ signal }) => anilist.getGenres(signal),
    staleTime: Infinity, // the genre list basically never changes
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: ({ signal }) => anilist.getTags(signal),
    staleTime: Infinity,
  })
}

export function useSuggestions(q: string, enabled = true) {
  return useQuery({
    queryKey: ['suggest', q],
    queryFn: ({ signal }) => anilist.getSuggestions(q, signal),
    enabled: enabled && q.length >= 2, // don't ask AniList about a single letter
    placeholderData: keepPreviousData, // keep old suggestions visible while new ones load
  })
}

/** The 5,000-anime title list used for instant suggestions. Downloaded once, when first needed. */
export function useSearchIndex(enabled: boolean) {
  return useQuery({
    queryKey: ['search-index'],
    queryFn: loadSearchIndex,
    enabled,
    staleTime: Infinity,
  })
}

/** Shared by the watch order and connected series, so the story is only fetched once. */
const franchiseQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['franchise', id],
    queryFn: ({ signal }) => anilist.getFranchise(id, signal),
    staleTime: 1000 * 60 * 60,
  })

/** Every entry in an anime's story, oldest first. Only loads when `enabled` (the user asked for it). */
export function useFranchise(id: number, enabled: boolean) {
  return useQuery({ ...franchiseQueryOptions(id), enabled })
}

/** Series connected to this anime's story ("same universe"). Reuses the watch order if it's loaded. */
export function useConnectedSeries(id: number, enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['connected', id],
    queryFn: async ({ signal }) => {
      const story = await queryClient.fetchQuery(franchiseQueryOptions(id))
      return anilist.getConnectedSeries(
        story.map((a) => a.id),
        signal,
      )
    },
    enabled,
    staleTime: 1000 * 60 * 60,
  })
}

export function useTonightCandidates(answers: { time: TonightTime; mood: TonightMood; era: TonightEra } | null) {
  return useQuery({
    queryKey: ['tonight', answers],
    queryFn: ({ signal }) => anilist.getTonightCandidates(answers!.time, answers!.mood, answers!.era, signal),
    enabled: answers !== null,
    staleTime: 1000 * 60 * 60,
  })
}

export function useYear(year: number) {
  return useQuery({
    queryKey: ['year', year],
    queryFn: ({ signal }) => anilist.getYear(year, signal),
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  })
}

export function useBirthdays() {
  // Include today's date in the key, so tomorrow's visit gets tomorrow's birthdays.
  const [day] = useState(() => new Date().toDateString())
  return useQuery({
    queryKey: ['birthdays', day],
    queryFn: ({ signal }) => anilist.getBirthdays(signal),
    staleTime: 1000 * 60 * 60,
  })
}

/** Opening/ending songs from AnimeThemes. No retries: if it's down, show the fallback right away. */
export function useThemes(anilistId: number) {
  return useQuery({
    queryKey: ['themes', anilistId],
    queryFn: ({ signal }) => getThemes(anilistId, signal),
    retry: false,
    staleTime: 1000 * 60 * 60 * 24,
  })
}

/** The whole season for the chart view. Only loads when the chart is open. */
export function useSeasonChart(year: number, season: Season, enabled: boolean) {
  return useQuery({
    queryKey: ['season-chart', year, season],
    queryFn: ({ signal }) => anilist.getSeasonChart(year, season, signal),
    enabled,
    staleTime: 1000 * 60 * 30,
  })
}
