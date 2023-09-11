/* eslint-disable @typescript-eslint/no-explicit-any */

import { logger } from '@ersanyamarya/common-node-utils'

type IReturn = {
  queries: Record<string, any>
  mutations: Record<string, any>
}

const findManyOptions = {
  limit: { defaultValue: 10000000 },
}

/**
 * It takes a collection name and a type collection and returns a schema.
 * @param {string} collection - string
 * @param TC - The TypeComposer for the model.
 * @returns A map of queries and mutations.
 */
const genSchema = (collection: string, TC): IReturn => {
  logger.debug(`--------> Preparing schema for ${collection} <--------`)
  collection = collection.toLowerCase()
  let queries: Record<string, any> = {}
  let mutations: Record<string, any> = {}

  queries = {
    [`${collection}Read`]: TC.mongooseResolvers.findById().withMiddlewares([]),
    [`${collection}List`]: TC.mongooseResolvers.findMany(findManyOptions).withMiddlewares([]),
    [`${collection}Count`]: TC.mongooseResolvers.count().withMiddlewares([]),
    [`${collection}Pagination`]: TC.mongooseResolvers.pagination().withMiddlewares([]),
  }

  mutations = {
    [`${collection}BatchCreate`]: TC.mongooseResolvers.createMany().withMiddlewares([]),
    [`${collection}Update`]: TC.mongooseResolvers.updateById().withMiddlewares([]),
    [`${collection}Delete`]: TC.mongooseResolvers.removeById().withMiddlewares([]),
    [`${collection}Create`]: TC.mongooseResolvers.createOne().withMiddlewares([]),
  }

  return { queries, mutations }
}

export default genSchema
