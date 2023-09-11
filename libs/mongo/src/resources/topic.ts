import { model, Schema, Document } from 'mongoose'

const TopicSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    peopleAlsoAsk: {
      type: [String],
    },
    links: {
      type: [String],
    },
    relatedSearches: {
      type: [String],
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    autoCreate: true,
  }
).index({ userID: 1, name: 1 }, { unique: true })

TopicSchema.methods = {
  async addPeopleAlsoAsk(peopleAlsoAsk: string[]) {
    this.peopleAlsoAsk = new Set([...this.peopleAlsoAsk, ...peopleAlsoAsk])
    await this.save()
  },
  async addLinks(links: string[]) {
    this.links = new Set([...this.links, ...links])
    await this.save()
  },
  async addRelatedSearches(relatedSearches: string[]) {
    this.relatedSearches = new Set([...this.relatedSearches, ...relatedSearches])
    await this.save()
  },

  async removePeopleAlsoAsk(peopleAlsoAsk: string[]) {
    this.peopleAlsoAsk = this.peopleAlsoAsk.filter((item: string) => !peopleAlsoAsk.includes(item))
    await this.save()
  },
  async removeLinks(links: string[]) {
    this.links = this.links.filter((item: string) => !links.includes(item))
    await this.save()
  },
  async removeRelatedSearches(relatedSearches: string[]) {
    this.relatedSearches = this.relatedSearches.filter((item: string) => !relatedSearches.includes(item))
    await this.save()
  },
}

export interface Topic extends Document {
  name: string
  peopleAlsoAsk: string[]
  links: string[]
  relatedSearches: string[]
}

const TopicModel = model<Topic>('Topic', TopicSchema, 'topics')

export { TopicModel }
