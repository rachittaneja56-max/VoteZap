export type ResponseMode = 'ANONYMOUS' | 'AUTHENTICATED'

export interface PollOption {
  _id: string
  text: string
}

export interface PollQuestion {
  _id: string
  text: string
  isMandatory: boolean
  options: PollOption[]
}

export interface Poll {
  _id: string
  title: string
  description?: string
  expiresAt: string
  responseMode: ResponseMode
  isPublished: boolean
  questions: PollQuestion[]
  createdAt?: string
  updatedAt?: string
}

export interface PollListRow {
  id: string
  title: string
  expiresAt: string
  responseMode: ResponseMode
  isPublished: boolean
  createdAt: string
  responseCount: number
  leadingOption: string
  questionCount: number
}

export interface AnalyticsPayload {
  totalResponses: number
  participation: {
    anonymous: number
    authenticated: number
  }
  timeline: {
    date: string
    count: number
  }[]
  results: {
    questionId: string
    questionText: string
    options: {
      optionId: string
      optionText: string
      voteCount: number
      percentage: number
    }[]
  }[]
}

export interface PublishedResult extends AnalyticsPayload {
  _id?: string
  pollId: string
  title: string
  publishedAt?: string
}
