import { DynamicTool, DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'

// export default new DynamicTool({
//   name: 'search_google',
//   description: 'Search Google for the given query and return the top 10 results and what people also ask for the query',

//   func: async (input: string) => {
//     return 'baz1'
//   },
// })

// const app = new DynamicStructuredTool({
//   name: 'search_google',
//   description: 'Search Google for the given query and return the top 10 results and what people also ask for the query',
//   schema: z.object({
//     query: z.string(),
//   }),
//   func: async ({ query }) => {
//     return 'baz1'
//   },
// })

export class SearchGoogleTool extends DynamicStructuredTool {
  static lc_name(): string {
    return 'search_google'
  }

  constructor() {
    super({
      name: 'search_google',
      description: 'Search Google for the given query and return the top 10 results and what people also ask for the query',
      schema: z.object({
        query: z.string(),
      }),
      func: async ({ query }) => {
        return 'baz1'
      },
    })
  }
}
