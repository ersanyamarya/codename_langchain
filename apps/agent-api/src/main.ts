import { openAIConfig, serperAIConfig, redisClient } from '@codename-langchain/config'
import { YoutubeTranscript } from 'youtube-transcript'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { BlogWriter, getSummaryFromTextAndObjective, searchGoogleWithQueryAndApiKey } from '@ersanyamarya/langchain-addons'
import { OpenAI, OpenAIChat } from 'langchain/llms/openai'
import { logger } from '@ersanyamarya/common-node-utils'

import { BlogCreateAgent } from '@ersanyamarya/langchain-addons'
import { writeFileSync } from 'fs'

const url = 'https://www.youtube.com/watch?v=oMr_uEirMIY'
const title = 'Why is MQTT so popular?'
const model = new OpenAI({
  openAIApiKey: openAIConfig.apiKey,
  temperature: 0.6,
  modelName: 'gpt-3.5-turbo',
})
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: openAIConfig.apiKey,
})
// const blogAgent = new BlogCreateAgent(model, serperAIConfig.apiKey, embeddings)
const blogWriter = new BlogWriter(model, embeddings, serperAIConfig.apiKey, redisClient)
async function main() {
  await redisClient.connect()
  try {
    const result = await blogWriter.execute(title)
    writeFileSync('blog.md', result)
    // const result = await searchGoogleWithQueryAndApiKey('The future of MQTT', serperAIConfig.apiKey)
    // console.dir(result, { depth: null })
    // logger.info('----------------- Transcription ----------------- ')
    // const transcript = await YoutubeTranscript.fetchTranscript(url)
    // logger.info('----------------- Complete Transcription ----------------- ')
    // logger.info('----------------- Summary ----------------- ')
    // const result = await getSummaryFromTextAndObjective(transcript.map(t => t.text).join(' '), title, model, embeddings)
    // logger.info('----------------- Complete Summary ----------------- ')
    // logger.info(result)
  } catch (e) {
    logger.error(e)
  }
}

main()
