import { logger } from '@ersanyamarya/common-node-utils'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'
import puppeteer from 'puppeteer'
import { RedisClientType } from 'redis'
import { YoutubeTranscript } from 'youtube-transcript'
import { SummarizeInputType, getSummaryFromTextAndObjective } from '../../chains'
import { OutputSearchGoogle, searchGoogleWithQueryAndApiKey } from '../../outbound'
import { BlogWriterModel, LinkScrapedSummaryType } from './model'
interface BlogWriterResearchInput {
  topic: string
  redisClient: RedisClientType
  serperApiKey: string
  model: OpenAI
  embeddings: OpenAIEmbeddings
}

interface BlogWriterResearchOutput {
  searchResults: OutputSearchGoogle
  scrapedData: string
}

export async function research({
  topic,
  redisClient,
  serperApiKey,
  model,
  embeddings,
}: BlogWriterResearchInput): Promise<BlogWriterResearchOutput> {
  const blogWriterModel = new BlogWriterModel(redisClient)
  await blogWriterModel.initialize(topic)
  logger.info('----------------- Blog Writer Research: Starting ----------------- ')
  logger.info('----------------- Blog Writer Research: Fetch Search Results from Redis ----------------- ')
  let searchResults: OutputSearchGoogle = blogWriterModel.searchResults
  if (!searchResults) {
    logger.info('----------------- Blog Writer Research: ❌ Search Results Not Found in Redis ----------------- ')
    logger.info('----------------- Blog Writer Research: 🔎 Fetch from Google ----------------- ')
    searchResults = await searchGoogleWithQueryAndApiKey(topic, serperApiKey)

    const searchYoutubeResults = await searchGoogleWithQueryAndApiKey(topic + ' YouTube', serperApiKey)
    searchResults.links = [...searchResults.links, ...searchYoutubeResults.links]
    await blogWriterModel.setSearchResults(searchResults)
  } else logger.info('----------------- Blog Writer Research: ✅ Found in Redis ----------------- ')

  const linkScrapedSummary: LinkScrapedSummaryType = blogWriterModel.linkScrapedSummary

  logger.info('----------------- Blog Writer Research: 🤔 Scraping Links ----------------- ')
  let foundInRedis = 0
  let notFoundInRedis = 0

  const summarizeInput: SummarizeInputType = {
    objective: topic,
    question: searchResults.peopleAlsoAsk.join('\n'),
    model,
    embeddings,
  }
  await Promise.allSettled(
    searchResults.links.map(async link => {
      if (linkScrapedSummary[link]) {
        foundInRedis++
        return linkScrapedSummary[link]
      }
      if (isLinkYoutube(link)) {
        const transcript = await YoutubeTranscript.fetchTranscript(link)
        const result = await getSummaryFromTextAndObjective(transcript.map(t => t.text).join(' '), summarizeInput)
        if (result.length > 100) {
          notFoundInRedis++
          linkScrapedSummary[link] = result
          return result
        }
        return ''
      }
      const browserData = await scrapeDataFromUrl(link)
      const text = await getSummaryFromTextAndObjective(browserData, summarizeInput)
      notFoundInRedis++
      linkScrapedSummary[link] = text
      return text
    })
  ).then(res =>
    res.reduce((acc, curr) => {
      if (curr.status === 'fulfilled' && curr.value.length > 100) {
        acc.push(curr.value)
      }
      return acc
    }, [])
  )
  await blogWriterModel.setLinkScrapedSummary(linkScrapedSummary)

  logger.info('----------------- Blog Writer Research: 🤔 Scraping Links Complete ----------------- ')
  logger.info({ foundInRedis, notFoundInRedis })
  logger.info('----------------- ----------------- ----------------- ')

  return {
    searchResults,
    scrapedData: JSON.stringify(linkScrapedSummary),
  }
}

const isLinkYoutube = (link: string) => {
  return link.includes('youtube.com')
}

// const getYoutubeTranscript = async (link: string) => {
//   const transcript = await YoutubeTranscript.fetchTranscript(link)
//   const result = await getSummaryFromTextAndObjective(transcript.map(t => t.text).join(' '), title, model, embeddings)
// }

async function scrapeDataFromUrl(url: string) {
  const browser = await puppeteer.launch({
    headless: 'new',
  })

  const page = await browser.newPage()
  await page.goto(url)
  const content = await page.content()
  const doc = new JSDOM(content, {
    url,
  })
  await browser.close()
  const reader = new Readability(doc.window.document)
  const article = reader.parse().textContent

  return article.replace(/\s\s+/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ').replace(/\r/g, ' ').toString()
}
