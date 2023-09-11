import { logger } from '@ersanyamarya/common-node-utils'
import { GraphQLSchema } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import ResourceComposers from './collections'
import customResolvers from './commonResolvers'

export default function getSchema(): GraphQLSchema {
  logger.info('--------> Generating schema <--------')
  ResourceComposers.forEach((composer, index) => {
    const { queries, mutations, ResourceTC, ResourceModel, name } = composer

    logger.info(`${index + 1}. ${name}`)

    customResolvers(ResourceModel, ResourceTC, composer.name, mutations)
    schemaComposer.Query.addFields(queries)
    schemaComposer.Mutation.addFields(mutations)
  })

  schemaComposer.createEnumTC({
    name: 'EnumSortOrder',
    values: {
      ASC: { value: 1 },
      DESC: { value: -1 },
    },
  })

  logger.info('--------> Schema generated <--------')
  return schemaComposer.buildSchema()
}
