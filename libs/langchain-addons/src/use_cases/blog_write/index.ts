import { logger } from '@ersanyamarya/common-node-utils'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'
import { WebBrowser } from 'langchain/tools/webbrowser'
import { title } from 'process'
import { RedisClientType } from 'redis'
import { getRetrievalChain } from '../../utils'
import { research } from './research'
import { chainBlogWriterPromptTemplate } from './templates'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { HNSWLib } from 'langchain/vectorstores/hnswlib'
import { RetrievalQAChain, loadQAStuffChain } from 'langchain/chains'

export class BlogWriter {
  model: OpenAI
  serperApiKey: string
  webBrowser: WebBrowser
  embeddings: OpenAIEmbeddings
  redisClient: RedisClientType

  constructor(model: OpenAI, embeddings: OpenAIEmbeddings, serperApiKey: string, redisClient: RedisClientType) {
    logger.info('----------------- Blog Writer: Setup ----------------- ')
    this.model = model
    this.webBrowser = new WebBrowser({
      model,
      embeddings,
    })
    this.serperApiKey = serperApiKey
    this.embeddings = embeddings
    this.redisClient = redisClient
  }

  async execute(topic: string) {
    const { searchResults, scrapedData } = await research({
      topic,
      redisClient: this.redisClient,
      serperApiKey: this.serperApiKey,
      model: this.model,
      embeddings: this.embeddings,
    })

    logger.info('----------------- Blog Writer: 🤔 Generating Blog ----------------- ')
    // const chain = await getRetrievalChain(this.model, scrapedData, this.embeddings)
    // const query = await chainBlogWriterPromptTemplate.format({
    //   topic: title,
    //   questions: searchResults.peopleAlsoAsk.join('\n'),
    // })
    // const res = await chain.call({
    //   query,
    // })
    // logger.info('----------------- Blog Writer: Complete ----------------- ')
    // return res.text

    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 })
    const docs = await textSplitter.createDocuments([scrapedData])
    const vectorStore = await HNSWLib.fromDocuments(docs, this.embeddings)

    const chain = new RetrievalQAChain({
      combineDocumentsChain: loadQAStuffChain(this.model, { prompt: chainBlogWriterPromptTemplate }),
      retriever: vectorStore.asRetriever(),
    })

    const res = await chain.call(
      {
        query: topic,
        peopleAlsoAsk: searchResults.peopleAlsoAsk.join('\n'),
      },
      {
        callbacks: [
          {
            handleChainStart: () => {
              logger.info('----------------- Blog Writer: Starting ----------------- ')
            },
            handleChainEnd: () => {
              logger.info('----------------- Blog Writer: Complete ----------------- ')
            },
            handleChainError: e => {
              logger.error(e)
            },
            handleLLMNewToken(token, idx, runId, parentRunId, tags, fields) {
              logger.info('----------------- Blog Writer: New Token ----------------- ')
              logger.info(token)
            },
          },
        ],
      }
    )

    return res.text
  }
}

const wordCount = (text: string) => {
  return text.split(' ').length
}
