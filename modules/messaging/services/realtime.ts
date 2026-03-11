import Ably from 'ably'

let ablyRest: Ably.Rest | null = null

function getAblyRest(): Ably.Rest {
  if (ablyRest) return ablyRest
  const apiKey = process.env.ABLY_API_KEY
  if (!apiKey) throw new Error('ABLY_API_KEY is not configured')
  ablyRest = new Ably.Rest({ key: apiKey })
  return ablyRest
}

export async function publishMessage(
  conversationId: string,
  message: {
    id: string; conversation_id: string; sender_id: string;
    content: string | null; media_url: string | null; media_type: string | null;
    created_at: string; read_at: string | null;
  }
): Promise<void> {
  const channel = getAblyRest().channels.get(`messages:${conversationId}`)
  await channel.publish('new-message', message)
}

export async function publishReadReceipt(
  conversationId: string,
  data: { reader_id: string; read_at: string }
): Promise<void> {
  const channel = getAblyRest().channels.get(`messages:${conversationId}`)
  await channel.publish('messages-read', data)
}

export async function publishUnreadNotification(
  conversationId: string,
  senderId: string
): Promise<void> {
  const channel = getAblyRest().channels.get('unread-messages')
  await channel.publish('new-message', { conversation_id: conversationId, sender_id: senderId })
}
