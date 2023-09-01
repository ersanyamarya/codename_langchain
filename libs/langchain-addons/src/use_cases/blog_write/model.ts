import { RedisClientType } from 'redis'
import { OutputSearchGoogle } from '../../outbound'

export interface LinkScrapedSummaryType {
  [link: string]: string
}

export class BlogWriterModel {
  redisClient: RedisClientType
  topic: string

  redisData: {
    searchResults: OutputSearchGoogle
    linkScrapedSummary: LinkScrapedSummaryType
  }

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient
  }

  async initialize(topic: string) {
    this.topic = topic
    const redisData = await this.redisClient.get(this.topic).then(JSON.parse)
    this.redisData = redisData
  }

  get searchResults() {
    return this.redisData?.searchResults
  }

  async setSearchResults(searchResults: OutputSearchGoogle) {
    this.redisData = {
      ...this.redisData,
      searchResults,
    }
    await this.redisClient.set(this.topic, JSON.stringify(this.redisData))
  }

  get linkScrapedSummary() {
    return this.redisData?.linkScrapedSummary || {}
  }

  async setLinkScrapedSummary(linkScrapedSummary: LinkScrapedSummaryType) {
    this.redisData = {
      ...this.redisData,
      linkScrapedSummary,
    }
    await this.redisClient.set(this.topic, JSON.stringify(this.redisData))
  }
}
