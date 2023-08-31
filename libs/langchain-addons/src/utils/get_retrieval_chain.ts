import { OpenAI } from 'langchain'
import { RetrievalQAChain } from 'langchain/chains'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { HNSWLib } from 'langchain/vectorstores/hnswlib'

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 100,
  separators: ['\n', ' ', '.', ',', ';', ':', '!', '?', '(', ')', '[', ']', '{', '}', '"', "'"],
  keepSeparator: false,
})

export async function getRetrievalChain(model: OpenAI, text: string, embeddings: OpenAIEmbeddings) {
  const baseCompressor = LLMChainExtractor.fromLLM(model)

  const docs = await textSplitter.createDocuments([text])

  const vectorStore = await HNSWLib.fromDocuments(docs, embeddings)

  const retriever = new ContextualCompressionRetriever({
    baseCompressor,
    baseRetriever: vectorStore.asRetriever(),
  })
  const chain = RetrievalQAChain.fromLLM(model, retriever)
  return chain
}
