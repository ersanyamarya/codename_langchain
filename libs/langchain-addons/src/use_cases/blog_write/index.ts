import { logger } from '@ersanyamarya/common-node-utils'
import { RetrievalQAChain, loadQAStuffChain } from 'langchain/chains'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { WebBrowser } from 'langchain/tools/webbrowser'
import { HNSWLib } from 'langchain/vectorstores/hnswlib'
import { RedisClientType } from 'redis'
import { research } from './research'
import { chainBlogWriterPromptTemplate } from './templates'

export class BlogWriter {
  model: OpenAI
  chatModel: ChatOpenAI
  serperApiKey: string
  webBrowser: WebBrowser
  embeddings: OpenAIEmbeddings
  redisClient: RedisClientType

  constructor(
    model: OpenAI,
    chatModel: ChatOpenAI,
    embeddings: OpenAIEmbeddings,
    serperApiKey: string,
    redisClient: RedisClientType
  ) {
    logger.info('----------------- Blog Writer: Setup ----------------- ')
    this.model = model
    this.chatModel = chatModel
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

    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 })
    const docs = await textSplitter.createDocuments([scrapedData])
    const vectorStore = await HNSWLib.fromDocuments(docs, this.embeddings)

    const chain = new RetrievalQAChain({
      combineDocumentsChain: loadQAStuffChain(this.chatModel, { prompt: chainBlogWriterPromptTemplate }),
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
              process.stdout.write(token)
            },
          },
        ],
      }
    )

    return res.text
  }
}
