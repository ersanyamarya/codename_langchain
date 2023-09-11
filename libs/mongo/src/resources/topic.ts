import { model, Schema, Document } from 'mongoose'

const TopicSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    organic: {
      type: [
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
        },
      ],
    },
    peopleAlsoAsk: {
      type: [
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
      ],
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

TopicSchema.methods = {}

export interface Topic extends Document {
  name: string
  organic: {
    title: string
    link: string
    snippet: string
    date?: string
  }[]
  peopleAlsoAsk: {
    question: string
    snippet: string
    title: string
    link: string
  }[]
  relatedSearches: string[]
}

const TopicModel = model<Topic>('Topic', TopicSchema, 'topics')

export { TopicModel }
