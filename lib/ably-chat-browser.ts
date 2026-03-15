'use client'

import { ChatClient, LogLevel } from '@ably/chat'
import { getAblyClient } from '@/lib/ably-browser'

let chatClient: ChatClient | null = null

export function getChatClient(): ChatClient {
  if (chatClient) return chatClient
  const realtimeClient = getAblyClient()
  chatClient = new ChatClient(realtimeClient, { logLevel: LogLevel.Error })
  return chatClient
}
