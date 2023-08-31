import { logger } from '@ersanyamarya/common-node-utils'
import { initializeAgentExecutorWithOptions } from 'langchain/agents'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'
import { StructuredTool } from 'langchain/tools'
import { WebBrowser } from 'langchain/tools/webbrowser'
import { getSearchGoogleTool } from '../../tools'
import { searchGoogleWithQueryAndApiKey } from '../../outbound'

// const outputParser = StructuredOutputParser.fromZodSchema(
//   z.object({
//     searchResult: searchGoogleResult,
//   })
// )
// const formatInstructions = outputParser.getFormatInstructions()
const prefix = `You are a world class researcher and blog writer, who can do detailed research on any topic and produce facts based results.
Your job is to write a blog post based using the research;
you do not make things up, you will try as hard as possible to gather facts & data to back up the research.
I will provide you with a topic, and you will do the research and write a blog post on it.
I will also give you a list of links to help you with the research, and also a list of questions that other people have asked about the topic.

Here are the steps you should follow:
1> You should use the "web_browser" tool to browse the top 10 links and start building your knowledge base.
2> You should start writing the blog post, here are a few things to keep in mind:
  a. The blog post should answer the questions in peopleAlsoAsk (what people also ask for) from the search results
  b. The blog post should be at least 3000 words
  c. The blog post should be written in a way that is easy to read and understand by some one who is not an expert in the topic
  d. The blog post should be grammatically correct and plagiarism free.
  e. Use emojis to make the blog post more interesting
`

export class BlogCreateAgent {
  model: OpenAI
  tools: StructuredTool[] = []
  serperApiKey: string

  constructor(model: OpenAI, serperApiKey: string, embeddings: OpenAIEmbeddings) {
    logger.info('----------------- Blog Create Agent: Setup ----------------- ')
    this.model = model
    this.serperApiKey = serperApiKey
    this.tools = [
      new WebBrowser({
        model,
        embeddings,
      }),
    ]
  }

  async execute(topic: string) {
    // const memory = new BufferMemory({
    //   memoryKey: topic,
    // })

    // const input = await ingressTemplate.format({
    //   topic,
    // })
    const result = await searchGoogleWithQueryAndApiKey(topic, this.serperApiKey)
    const input =
      'Write a blog post about ' + topic + ' based on the following information: ' + JSON.stringify(result, null, 2) + '\n\n'
    logger.info('----------------- Blog Create Agent: Initialized ----------------- ')
    // return '========= Blog Create Agent: Initialized ========='
    const agent = await initializeAgentExecutorWithOptions(this.tools, this.model, {
      agentType: 'structured-chat-zero-shot-react-description',
      verbose: false,
      agentArgs: {
        prefix: prefix,
        suffix: `You can use the following tools to help you write the blog:
        `,
      },

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

    logger.info('----------------- Blog Create Agent: Execute ----------------- ')

    const { output } = await agent.call({ input })

    logger.info('----------------- Blog Create Agent: Complete ----------------- ')

    return output
  }
}
