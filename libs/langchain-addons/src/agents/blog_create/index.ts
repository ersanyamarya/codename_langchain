import { logger } from '@ersanyamarya/common-node-utils'
import { initializeAgentExecutorWithOptions } from 'langchain/agents'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'
import { ChainTool, StructuredTool } from 'langchain/tools'
import { WebBrowser } from 'langchain/tools/webbrowser'
import { getSearchGoogleTool } from '../../tools'
import { OutputSearchGoogle, searchGoogleWithQueryAndApiKey } from '../../outbound'
import { PromptTemplate } from 'langchain/prompts'
import { BlogWriterModel, LinkScrapedSummaryType } from '../../use_cases/blog_write/model'
import { RedisClientType } from 'redis'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { HNSWLib } from 'langchain/vectorstores/hnswlib'
import { VectorDBQAChain } from 'langchain/chains'

// const outputParser = StructuredOutputParser.fromZodSchema(
//   z.object({
//     searchResult: searchGoogleResult,
//   })
// )
// const formatInstructions = outputParser.getFormatInstructions()
const template = `You are a world class researcher and blog writer, who can do detailed research on any topic and produce facts based results.
Your job is to write a blog post titled {topic} based using the research;
you do not make things up, you will try as hard as possible to gather facts & data to back up the research.

Use the knowledge base tool to answer your questions, but don't do it for more than 3 iterations.
You should complete the task in two steps:
1> Research from the knowledge base tool
2> Write the blog post

You should start writing the blog post, here are a few things to keep in mind:
  a> The blog post should answer the following questions:
    {questions}
  b> The blog post should be AT LEAST 2000 words
  c> The blog post should be written in a way that is easy to read and understand by some one who is not an expert in the topic
  d> The blog post should be grammatically correct and plagiarism free.
  e> Use emojis to make the blog post more interesting
  f> Write a suitable title for the blog post

  **Follow the following format for the Blog post:**

- Title: Include the benefit, number of items, and a short timeframe.
- Introduction: Briefly introduce the problem and highlight the benefits readers will gain from reading the post.
- Subheadings: Provide an overview and clear benefit for each tip.
- Action items: Outline the steps to implement each tip.
- Conclusion: Encourage readers to take action based on the tips provided.
- **CTA:** End the post with a compelling call to action. Ask a question related to the content, such as "What tip did you find most helpful?" or "Which of the mentioned tips are you going to apply right away?" Encourage readers to engage and share their thoughts.

Output should be a markdown file with metadata and the blog post content.
Example Output:
---
kind: blog (always blog)
title: <Title of the Blog Post>
slug: <slug of the blog post>
executiveSummary: <executive summary of the blog post>
tags: <array of tags>
author: ersanyamarya
date: <date>
---
<Blog Post Content>

References:
- <link to reference 1>
- <link to reference 2>
`

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 100,
  separators: ['\n', ' ', '.', ',', ';', ':', '!', '?', '(', ')', '[', ']', '{', '}', '"', "'"],
  keepSeparator: false,
})

const promptTemplate = new PromptTemplate({
  template,
  inputVariables: ['topic', 'questions'],
})

export class BlogCreateAgent {
  model: OpenAI
  tools: StructuredTool[] = []
  serperApiKey: string
  webBrowser: WebBrowser
  blogWriterModel: BlogWriterModel
  embeddings: OpenAIEmbeddings

  constructor(model: OpenAI, serperApiKey: string, embeddings: OpenAIEmbeddings, redisClient: RedisClientType) {
    logger.info('----------------- Blog Create Agent: Setup ----------------- ')
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

    const docs = await textSplitter.createDocuments([scrapeSet.join(' ')])
    const vectorStore = await HNSWLib.fromDocuments(docs, this.embeddings)
    const chain = VectorDBQAChain.fromLLM(this.model, vectorStore)
    const knowledgeBase = new ChainTool({
      name: topic.toLowerCase().replace(/ /g, '_') + '_knowledge_base',
      description: `${topic} knowledge base tool. This tool is used to answer questions related to ${topic}.`,
      chain: chain,
    })

    this.tools.push(knowledgeBase)

    await this.blogWriterModel.setLinkScrapedSummary(linkScrapedSummary)

    logger.info('----------------- Blog Writer: 🤔 Scraping Links Complete ----------------- ')
    logger.info({ foundInRedis, notFoundInRedis })
    logger.info('----------------- ----------------- ----------------- ')

    // ---------------------------------------------------------------------------------------------
    const executor = await initializeAgentExecutorWithOptions([knowledgeBase], this.model, {
      agentType: 'structured-chat-zero-shot-react-description',
      verbose: true,
      callbacks: [
        {
          handleAgentAction(action) {
            logger.debug('-----------------Agent Action-----------------')
            logger.debug(JSON.stringify(action.log, null, 2))
            logger.debug('-----------------Agent Action-----------------')
          },
        },
      ],
    })

    const input = await promptTemplate.format({
      topic,
      questions: searchResults.peopleAlsoAsk.join('\n'),
    })

    logger.info('----------------- Blog Create Agent: Execute ----------------- ')
    const { output } = await executor.call({ input })
    logger.info('----------------- Blog Create Agent: Complete ----------------- ')

    return output
  }
}
