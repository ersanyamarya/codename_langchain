import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'
import { searchGoogleWithQueryAndApiKey } from '../../outbound'
// export class SearchGoogleSemanticTool extends DynamicStructuredTool {
//   constructor(apiKey: string) {
//     super({
//       name: 'search_semantic_google',
//       description: 'Search Google for the given query and return the top 10 results and what people also ask for the query',
//       schema: z.object({
//         query: z.string(),
//       }),
//       func: async ({ query }) => {
//         const result = await searchGoogleWithQueryAndApiKey(query, apiKey)
//         return result.toString()
//       },
//       returnDirect: false,
//     })
//   }
// }

export function getSearchGoogleTool(apiKey: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'search_semantic_google',
    description: 'Search Google for the given query and return the top 10 results and what people also ask for the query',
    schema: z.object({
      query: z.string(),
    }),
    func: async ({ query }) => {
      const result = await searchGoogleWithQueryAndApiKey(query, apiKey)
      return JSON.stringify(result)
    },
    returnDirect: true,
  })
}
