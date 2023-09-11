import { TopicModel } from '@codename-langchain/mongo'
import { composeMongoose } from 'graphql-compose-mongoose'
import genSchema from '../../schemaGenerator'
import { GQLErrorHandler } from '@ersanyamarya/apollo-graphql-helper'
import { searchOnGoogle } from '@ersanyamarya/langchain-addons'
import { serperAIConfig } from '@codename-langchain/config'
const TopicTC = composeMongoose(TopicModel, {})
TopicTC.addResolver({
  kind: 'mutation',
  name: 'topicCreateOne',
  type: TopicTC,
  args: {
    name: 'String!',
  },
  resolve: async ({ args }) => {
    const { name } = args
    try {
      const topic = await TopicModel.create({ name })
      return topic
    } catch (error) {
      GQLErrorHandler(error.message, 'UNKNOWN', { location: 'topicCreateOne' })
    }
  },
})

TopicTC.addResolver({
  kind: 'query',
  name: 'topicStartGoogleSearch',
  type: TopicTC,
  args: {
    id: 'MongoID!',
    alternateTopic: 'String',
  },
  resolve: async ({ args }) => {
    const { id, alternateTopic } = args
    const topic = await TopicModel.findById(id)
    if (!topic) GQLErrorHandler('Topic not found', 'NOT_FOUND', { location: 'topicStartGoogleSearch' })
    const searchKey = alternateTopic || topic.name
    const searchResult1 = await searchOnGoogle(searchKey, {
      apiKey: serperAIConfig.apiKey,
      gl: 'us',
    })

    const searchResult2 = await searchOnGoogle(searchKey, {
      apiKey: serperAIConfig.apiKey,
      gl: 'us',
      youtube: true,
    })

    const searchResult = {
      organic: [...searchResult1.organic, ...searchResult2.organic],
      peopleAlsoAsk: [...searchResult1.peopleAlsoAsk, ...searchResult2.peopleAlsoAsk],
      relatedSearches: [...searchResult1.relatedSearches, ...searchResult2.relatedSearches],
    }

    if (!searchResult || !searchResult.organic)
      GQLErrorHandler('Search result not found', 'NOT_FOUND', { location: 'topicStartGoogleSearch' })
    // Update database with search result and ensure that the search result is not already present in the database
    const { organic, peopleAlsoAsk, relatedSearches } = searchResult
    const organicLinks = topic.organic.map(item => item.link)
    const peopleAlsoAskLinks = topic.peopleAlsoAsk.map(item => item.link)
    const relatedSearchesLinks = topic.relatedSearches

    const newOrganic = organic.filter(item => !organicLinks.includes(item.link))
    const newPeopleAlsoAsk = peopleAlsoAsk.filter(item => !peopleAlsoAskLinks.includes(item.link))
    const newRelatedSearches = relatedSearches.reduce((acc, item) => {
      if (!relatedSearchesLinks.includes(item.query)) acc.push(item.query)
      return acc
    }, [])

    topic.organic = [...topic.organic, ...newOrganic]
    topic.peopleAlsoAsk = [...topic.peopleAlsoAsk, ...newPeopleAlsoAsk]
    topic.relatedSearches = [...topic.relatedSearches, ...newRelatedSearches]
    await topic.save()
    return topic
  },
})

const queries = {
  topicStartGoogleSearch: TopicTC.getResolver('topicStartGoogleSearch'),
}
const mutations = {
  topicCreateOne: TopicTC.getResolver('topicCreateOne'),
}

export default {
  ResourceTC: TopicTC,
  queries,
  mutations,
  ResourceModel: TopicModel,
  name: 'Topic',
}
