import { openAIConfig, redisClient, serperAIConfig } from '@codename-langchain/config'
import { logger } from '@ersanyamarya/common-node-utils'
import { BlogWriter, searchOnGoogle } from '@ersanyamarya/langchain-addons'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'

import { writeFileSync } from 'fs'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import axios from 'axios'
// import { gotScraping } from 'got-scraping'

const title = 'How does Sparkplug B change the IoT landscape?'

const model = new OpenAI({
  openAIApiKey: openAIConfig.apiKey,
  temperature: 0.1,
  modelName: 'text-davinci-003',
})
const chatModel = new ChatOpenAI({
  openAIApiKey: openAIConfig.apiKey,
  temperature: 0.4,
  modelName: 'gpt-3.5-turbo',
})
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: openAIConfig.apiKey,
})

// const blogAgent = new BlogCreateAgent(model, serperAIConfig.apiKey, embeddings, redisClient)
const blogWriter = new BlogWriter(model, chatModel, embeddings, serperAIConfig.apiKey, redisClient)

async function main() {
  await redisClient.connect()
  try {
    const results = await searchOnGoogle(title, {
      apiKey: serperAIConfig.apiKey,
      gl: 'us',
      youtube: true,
    })

    console.log(results.relatedSearches)

    writeFileSync('data.json', JSON.stringify(results, null, 2))
  } catch (e) {
    logger.error(e)
  }
}

main()
