import { openAIConfig, redisClient, serperAIConfig } from '@codename-langchain/config'
import { logger } from '@ersanyamarya/common-node-utils'
import { BlogWriter } from '@ersanyamarya/langchain-addons'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'

import { writeFileSync } from 'fs'
import { ChatOpenAI } from 'langchain/chat_models/openai'

const url = 'https://www.youtube.com/watch?v=oMr_uEirMIY'
const title = 'Where is MQTT Used?'
const model = new OpenAI({
  openAIApiKey: openAIConfig.apiKey,
  temperature: 0.1,
  modelName: 'text-davinci-003',
})
const chatModel = new ChatOpenAI({
  openAIApiKey: openAIConfig.apiKey,
  temperature: 0.1,
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
    // const result = await blogAgent.execute(title)
    const result = await blogWriter.execute(title)
    writeFileSync('blog.md', result)
    // const result = await searchGoogleWithQueryAndApiKey('The future of MQTT', serperAIConfig.apiKey)
    // console.log(result)

    // console.dir(result, { depth: null })
    // logger.info('----------------- Transcription ----------------- ')
    // const transcript = await YoutubeTranscript.fetchTranscript(url)
  } catch (e) {
    logger.error(e)
  }
}

main()
