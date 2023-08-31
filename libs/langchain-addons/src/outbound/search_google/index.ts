import { logger } from '@ersanyamarya/common-node-utils'
import axios from 'axios'
import { z } from 'zod'

export const searchGoogleResult = z
  .object({
    links: z.array(z.string()).describe('The top 10 links for the query'),
    peopleAlsoAsk: z.array(z.string()).describe('The questions that people also ask for the query'),
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
    q: query,
    gl: 'de',
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
  logger.info('----------------- Search Google ----------------- ')

  const response = await axios(config)
    .then(response => response.data)
    .catch(error => {
      logger.error(error)
      return null
    })
  logger.info('----------------- Complete Search Google ----------------- ')
  logger.info('----------------- Parse Search Google ----------------- ')
  response?.peopleAlsoAsk.forEach((answer: any) => {
    peopleAlsoAsk.push(answer.question)
    links.push(answer.link)
  })
  if (response?.answerBox?.link) links.push(response?.answerBox?.link)

  response?.organic.forEach((answer: any) => {
    if (answer.link) links.push(answer.link)
    else return
  })
  logger.info('----------------- Complete Parse Search Google ----------------- ')
  return searchGoogleResult.parse({
    peopleAlsoAsk,
    links,
  })
}

export type { OutputSearchGoogle }
