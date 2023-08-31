import { PromptTemplate } from 'langchain'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'
import { StructuredOutputParser } from 'langchain/output_parsers'
import { z } from 'zod'
import { getRetrievalChain, parseOutput } from '../utils'

const summarizeTemplatePrompt = `I want the following document to be summarized and to find: {title}.
Output Format Instruction: {formatInstructions}
`

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    canProvideAnswer: z.boolean().describe('Whether the model can provide an answer, or the information is not available'),
    summary: z.string().describe('The summary of the document, if the model can provide one'),
  })
)
type SummarizeOutput = z.infer<typeof parser.schema>

const parsedResponse: SummarizeOutput = {
  canProvideAnswer: false,
  summary: '',
}

const formatInstructions = parser.getFormatInstructions()

const promptTemplate = new PromptTemplate({
  template: summarizeTemplatePrompt,
  inputVariables: ['title'],
  partialVariables: {
    formatInstructions,
  },
})

export async function getSummaryFromTextAndObjective(
  text: string,
  objective: string,
  model: OpenAI,
  embeddings: OpenAIEmbeddings
): Promise<SummarizeOutput> {
  const chain = await getRetrievalChain(model, text, embeddings)
  const query = await promptTemplate.format({
    title: objective,
  })

  const res = await chain.call({
    query,
  })
  return parseOutput<SummarizeOutput>(res.text, parsedResponse, model, parser)
}
