import { logger } from '@ersanyamarya/common-node-utils'
import axios from 'axios'
import { z } from 'zod'

export const searchGoogleResult = z
  .object({
    links: z.array(z.string()).describe('The top 10 links for the query'),
    peopleAlsoAsk: z.array(z.string()).describe('The questions that people also ask for the query'),
    relatedSearches: z.array(z.string()).describe('The related searches for the query'),
    reference: z.array(z.string()).describe('The reference for the query'),
  })
  .describe('The output of the search_google tool')

type OutputSearchGoogle = z.infer<typeof searchGoogleResult>

/**
 * The function `searchGoogleWithQueryAndApiKey` is an asynchronous function that takes a query string
 * and an API key as parameters, and it returns a promise that resolves to an object containing search
 * results from Google.
 * @param {string} query - The `query` parameter is a string that represents the search query you want
 * to perform on Google. It can be any text that you want to search for.
 * @param {string} apiKey - The `apiKey` parameter is a string that represents the API key required to
 * access the Google Search API. This API key is used to authenticate and authorize the requests made
 * to the API.
 * @returns The function `searchGoogleWithQueryAndApiKey` returns a Promise that resolves to an object
 * of type `OutputSearchGoogle`.
 */
export async function searchGoogleWithQueryAndApiKey(query: string, apiKey: string): Promise<OutputSearchGoogle> {
  const data = JSON.stringify({
    // Query for only articles and blog posts in English
    q: query,
    gl: 'us',
  })
  const config = {
    method: 'post',
    url: 'https://google.serper.dev/search',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    data: data,
  }

  const links: string[] = []
  const peopleAlsoAsk: string[] = []
  const relatedSearches: string[] = []

  const reference: string[] = []

  logger.info('----------------- Search Google ----------------- ')

  const response = await axios(config)
    .then(response => response.data)
    .catch(error => {
      throw new Error(error?.response?.data?.message || "Couldn't fetch data from Google")
    })
  logger.info('----------------- Complete Search Google ----------------- ')
  logger.info('----------------- Parse Search Google ----------------- ')

  if (response?.peopleAlsoAsk && response?.peopleAlsoAsk.length > 0)
    response?.peopleAlsoAsk.forEach((answer: any, index: number) => {
      if (index > 5) return
      peopleAlsoAsk.push(answer.question)
      reference.push(`[${answer.question}](${answer.link}): ${answer.title}`)
      links.push(answer.link)
    })
  if (response?.answerBox?.link) links.push(response?.answerBox?.link)

  if (response?.organic && response?.organic.length > 0)
    response?.organic.forEach((answer: any, index: number) => {
      if (index > 5) return
      if (answer?.attributes?.Duration && !isLessThanDefinedMinutes(answer?.attributes?.Duration)) return
      if (answer.link) {
        reference.push(`[${answer.title}](${answer.link})`)
        links.push(answer.link)
      } else return
    })
  if (response?.relatedSearches && response?.relatedSearches.length > 0)
    response?.relatedSearches.forEach((answer: any, index: number) => {
      if (index > 5) return
      relatedSearches.push(answer.query)
    })

  logger.info('----------------- Complete Parse Search Google ----------------- ')
  return searchGoogleResult.parse({
    peopleAlsoAsk,
    links,
    relatedSearches,
    reference,
  })
}

export type { OutputSearchGoogle }

function isLessThanDefinedMinutes(duration: string) {
  const durationArray = duration.split(':')
  if (durationArray.length === 3) return false
  const minutes = parseInt(durationArray[0])
  if (minutes > 18) return false
  return true
}

function durationBetween(minMinutes: number, maxMinutes: number, duration: string) {
  const durationArray = duration.split(':')
  if (durationArray.length === 3) return false
  const minutes = parseInt(durationArray[0])
  if (minutes > maxMinutes || minutes < minMinutes) return false
  return true
}
