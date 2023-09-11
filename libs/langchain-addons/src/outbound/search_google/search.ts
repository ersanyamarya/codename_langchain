import axios from 'axios'

export interface GoogleSearchResults {
  searchParameters: SearchParameters
  organic: Organic[]
  peopleAlsoAsk: PeopleAlsoAsk[]
  relatedSearches: RelatedSearch[]
}

export interface Organic {
  title: string
  link: string
  snippet: string
  date?: string
  position: number
  attributes?: Attributes
  rating?: number
  ratingCount?: number
}

export interface Attributes {
  Missing?: string
  Duration?: string
  Date?: string
  Rating?: string
}

export interface PeopleAlsoAsk {
  question: string
  snippet: string
  title: string
  link: string
}

export interface RelatedSearch {
  query: string
}

export interface SearchParameters {
  q: string
  gl: string
  type: string
  engine: string
}

export type GoogleSearchConfig = {
  apiKey: string
  gl: string
  youtube?: boolean
}

export async function searchOnGoogle(
  query: string,
  { apiKey, gl, youtube }: GoogleSearchConfig
): Promise<GoogleSearchResults> {
  const data = JSON.stringify({ q: query + (youtube ? ' + youtube' : ''), gl })
  const config = {
    method: 'post',
    url: 'https://google.serper.dev/search',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    data: data,
  }
  return await axios(config)
    .then(response => response.data)
    .catch(error => {
      throw new Error(error?.response?.data?.message || "Couldn't fetch data from Google")
    })
}
