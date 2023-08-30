import { PromptTemplate } from 'langchain'
import { RetrievalQAChain } from 'langchain/chains'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'
import { StructuredOutputParser } from 'langchain/output_parsers'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { HNSWLib } from 'langchain/vectorstores/hnswlib'
import { z } from 'zod'
import { parseOutput } from '../utils'

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

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 100,
  separators: ['\n', ' ', '.', ',', ';', ':', '!', '?', '(', ')', '[', ']', '{', '}', '"', "'"],
  keepSeparator: false,
})

export async function getSummaryFromTextAndObjective(
  text: string,
  objective: string,
  model: OpenAI,
  embeddings: OpenAIEmbeddings
): Promise<SummarizeOutput> {
  const baseCompressor = LLMChainExtractor.fromLLM(model)

  const docs = await textSplitter.createDocuments([text])

  const vectorStore = await HNSWLib.fromDocuments(docs, embeddings)

  const retriever = new ContextualCompressionRetriever({
    baseCompressor,
    baseRetriever: vectorStore.asRetriever(),
  })
  const chain = RetrievalQAChain.fromLLM(model, retriever)
  const query = await promptTemplate.format({
    title: objective,
  })

  const res = await chain.call({
    query,
  })
  return parseOutput<SummarizeOutput>(res.text, parsedResponse, model, parser)
}
