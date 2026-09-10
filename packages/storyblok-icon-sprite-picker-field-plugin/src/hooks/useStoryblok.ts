import { useEffect, useMemo, useState } from 'react'
import { storyblokInit, apiPlugin, StoryblokClient } from '@storyblok/js'

export const useStoryblokApi = (token?: string) =>
  useMemo(() => {
    if (token) {
      return storyblokInit({
        accessToken: token,
        use: [apiPlugin],
      }).storyblokApi
    }
  }, [token])

export const useStory = (
  slug: string,
  storyblokApi: StoryblokClient | undefined,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [story, setStory] = useState<any>()
  useEffect(() => {
    if (storyblokApi) {
      storyblokApi.get(slug).then((response) => setStory(response.data.story))
    }
  }, [storyblokApi, slug])
  return story
}
