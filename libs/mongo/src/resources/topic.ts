import { model, Schema, Document } from 'mongoose'

const OrganicSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
    snippet: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: false,
    },
    scraped: {
      type: String,
      required: false,
    },
  },
  {
    _id: false,
  }
)

const PeopleAlsoAskSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
    },
    snippet: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
)

const TopicSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    organic: {
      type: [OrganicSchema],
    },
    peopleAlsoAsk: {
      type: [PeopleAlsoAskSchema],
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
  movePeopleAlsoAskToOrganic(indexes: number[]) {
    const peopleAlsoAsk = this.peopleAlsoAsk.filter((item, index) => indexes.includes(index))
    this.peopleAlsoAsk = this.peopleAlsoAsk.filter((item, index) => !indexes.includes(index))
    this.organic = [
      ...this.organic,
      ...peopleAlsoAsk.map(item => {
        delete item.question
        return item
      }),
    ]
  },
  deletePeopleAlsoAsk(indexes: number[]) {
    this.peopleAlsoAsk = this.peopleAlsoAsk.filter((item, index) => !indexes.includes(index))
  },
  deleteOrganic(indexes: number[]) {
    this.organic = this.organic.filter((item, index) => !indexes.includes(index))
  },
  deleteRelatedSearches(indexes: number[]) {
    this.relatedSearches = this.relatedSearches.filter((item, index) => !indexes.includes(index))
  },
  addPeopleAlsoAsk(peopleAlsoAsk: PeopleAlsoAsk[]) {
    this.peopleAlsoAsk = [...this.peopleAlsoAsk, ...peopleAlsoAsk]
  },
}
interface PeopleAlsoAsk {
  question: string
  snippet: string
  title: string
  link: string
}

interface Organic {
  title: string
  link: string
  snippet: string
  date?: string
  scraped?: string
}
export interface Topic extends Document {
  name: string
  organic: Organic[]
  peopleAlsoAsk: PeopleAlsoAsk[]
  relatedSearches: string[]
  movePeopleAlsoAskToOrganic(indexes: number[]): void
  deletePeopleAlsoAsk(indexes: number[]): void
  deleteOrganic(indexes: number[]): void
  deleteRelatedSearches(indexes: number[]): void
  addPeopleAlsoAsk(peopleAlsoAsk: PeopleAlsoAsk[]): void
}

const TopicModel = model<Topic>('Topic', TopicSchema, 'topics')

export { TopicModel }
