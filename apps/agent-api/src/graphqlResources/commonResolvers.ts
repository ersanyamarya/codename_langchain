/* eslint-disable @typescript-eslint/no-explicit-any */
import { ObjectTypeComposerWithMongooseResolvers } from 'graphql-compose-mongoose'
import { Model } from 'mongoose'

export default function customResolvers(
  model: Model<any>,
  TC: ObjectTypeComposerWithMongooseResolvers<any, unknown>,
  name: string,
  mutations: Record<string, unknown>
): void {
  TC.addResolver({
    name: 'removeAll',
    type: 'Boolean',
    resolve: async () => {
      await model.deleteMany({}).catch(err => {
        console.log(err)
        return false
      })
      return true
    },
  })
  mutations[`Admin${name}RemoveAll`] = TC.getResolver('removeAll').withMiddlewares([])
}
