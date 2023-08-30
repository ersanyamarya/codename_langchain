import { openAIConfig } from '@codename-langchain/config'
import { YoutubeTranscript } from 'youtube-transcript'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { getSummaryFromTextAndObjective } from '@ersanyamarya/langchain-addons'
import { OpenAI } from 'langchain/llms/openai'
import { logger } from '@ersanyamarya/common-node-utils'

const url = 'https://www.youtube.com/watch?v=oMr_uEirMIY'
const title = 'The future of MQTT'
const model = new OpenAI({
  openAIApiKey: openAIConfig.apiKey,
  temperature: 0.6,
  modelName: 'gpt-3.5-turbo',
})
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: openAIConfig.apiKey,
})
async function main() {
  try {
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
