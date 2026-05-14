export {}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string
              theme?: string
              size?: string
              text?: string
              width?: string | number
              locale?: string
            }
          ) => void
          cancel: () => void
        }
      }
    }
  }
}
