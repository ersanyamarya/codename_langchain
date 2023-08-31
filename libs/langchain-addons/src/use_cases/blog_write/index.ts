import { logger } from '@ersanyamarya/common-node-utils'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'
import { WebBrowser } from 'langchain/tools/webbrowser'
import { RedisClientType } from 'redis'
import { searchGoogleWithQueryAndApiKey, OutputSearchGoogle } from '../../outbound'
import { BlogWriterModel, LinkScrapedSummaryType } from './model'
import { getRetrievalChain } from '../../utils'
import { PromptTemplate } from 'langchain/prompts'
import { title } from 'process'

const blogWriterPromptTemplate = `You are a world class blog writer, who can write detailed blog posts on any topic, given the right information.
Your job is to write a blog post titled {topic} based on the information provided to you;
you do not make things up, you will try as hard as possible to gather facts & data to back up the research.

You should start writing the blog post, here are a few things to keep in mind:
  a> The blog post should answer the following questions:
    {questions}
  b> The blog post should be AT LEAST 2000 words
  c> The blog post should be written in a way that is easy to read and understand by some one who is not an expert in the topic
  d> The blog post should be grammatically correct and plagiarism free.
  e> Use emojis to make the blog post more interesting
  f> Write a suitable title for the blog post

  **Follow the following format for the Blog post:**

- Title: Include the benefit, number of items, and a short time-frame.
- Subheadings: Provide an overview and clear benefit for each tip.
- The first Subheading should be "Introduction": Briefly introduce the problem and highlight the benefits readers will gain from reading the post.
- Last Subheading should be "Conclusion": Encourage readers to take action based on the tips provided.
- **CTA:** End the post with a compelling call to action. Ask a question related to the content, such as "What tip did you find most helpful?" or "Which of the mentioned tips are you going to apply right away?" Encourage readers to engage and share their thoughts.

Output should be a markdown file with metadata and the blog post content.

Example Output:
---
kind: blog (always blog)
title: <Title of the Blog Post>
slug: <slug of the blog post>
executiveSummary: <executive summary of the blog post>
keywords: <array of keywords for the blog post>
reference: <array of 5 links that were used to write the blog post>
author: ersanyamarya
date: <date>
---
<Blog Post Content>
`
const promptTemplate = new PromptTemplate({
  template: blogWriterPromptTemplate,
  inputVariables: ['topic', 'questions'],
})

export class BlogWriter {
  model: OpenAI
  serperApiKey: string
  webBrowser: WebBrowser
  blogWriterModel: BlogWriterModel
  embeddings: OpenAIEmbeddings

  constructor(model: OpenAI, embeddings: OpenAIEmbeddings, serperApiKey: string, redisClient: RedisClientType) {
    logger.info('----------------- Blog Writer: Setup ----------------- ')
    this.model = model
    this.webBrowser = new WebBrowser({
      model,
      embeddings,
    })
    this.serperApiKey = serperApiKey
    this.blogWriterModel = new BlogWriterModel(redisClient)
    this.embeddings = embeddings
  }

  async execute(topic: string) {
    await this.blogWriterModel.initialize(topic)
    logger.info('----------------- Blog Writer: Starting ----------------- ')
    logger.info('----------------- Blog Writer: Fetch Search Results from Redis ----------------- ')

    let searchResults: OutputSearchGoogle = this.blogWriterModel.searchResults
    if (!searchResults) {
      logger.info('----------------- Blog Writer: ❌ Search Results Not Found in Redis ----------------- ')
      logger.info('----------------- Blog Writer: 🔎 Fetch from Google ----------------- ')
      searchResults = await searchGoogleWithQueryAndApiKey(topic, this.serperApiKey)
      await this.blogWriterModel.setSearchResults(searchResults)
    }
    logger.info('----------------- Blog Writer: ✅ Found in Redis ----------------- ')

    const linkScrapedSummary: LinkScrapedSummaryType = this.blogWriterModel.linkScrapedSummary

    logger.info('----------------- Blog Writer: 🤔 Scraping Links ----------------- ')
    let foundInRedis = 0
    let notFoundInRedis = 0

    const scrapeSet = await Promise.allSettled(
      searchResults.links.map(async link => {
        if (linkScrapedSummary[link]) {
          foundInRedis++
          return linkScrapedSummary[link]
        }
        const text = await this.webBrowser.call(link + ',' + topic)
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

    await this.blogWriterModel.setLinkScrapedSummary(linkScrapedSummary)

    logger.info('----------------- Blog Writer: 🤔 Scraping Links Complete ----------------- ')
    logger.info({ foundInRedis, notFoundInRedis })
    logger.info('----------------- ----------------- ----------------- ')

    logger.info('----------------- Blog Writer: 🤔 Generating Blog ----------------- ')
    const chain = await getRetrievalChain(this.model, scrapeSet.join(' '), this.embeddings)
    const query = await promptTemplate.format({
      topic: title,
      questions: searchResults.peopleAlsoAsk.join('\n'),
    })
    const res = await chain.call({
      query,
    })
    logger.info('----------------- Blog Writer: Complete ----------------- ')
    return res.text
  }
}

const isLinkYoutube = (link: string) => {
  return link.includes('youtube.com')
}

const wordCount = (text: string) => {
  return text.split(' ').length
}
