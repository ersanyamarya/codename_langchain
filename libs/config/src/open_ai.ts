import { env } from './utils'

export const openAIConfig = {
  apiKey: env('NX_OPENAI_API_KEY'),
  // googleSearch: {
  //   apiKey: env('NX_GOOGLE_SEARCH_API_KEY'),
  //   searchEngineId: env('NX_GOOGLE_SEARCH_ENGINE_ID'),
  // },
}
