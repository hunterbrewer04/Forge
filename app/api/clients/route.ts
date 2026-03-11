/**
 * Clients API Routes
 *
 * GET /api/clients - List trainer's clients (trainer only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateRole } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { conversations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'

/**
 * GET /api/clients
 *
 * Returns a deduplicated list of client profiles for the authenticated trainer.
 * Clients are discovered via conversations — each conversation links a trainer to a client.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate trainer role
    const authResult = await validateRole('trainer')
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL,
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Fetch all conversations for this trainer, including the client profile
    const convos = await db.query.conversations.findMany({
      where: eq(conversations.trainerId, profileId),
      with: {
        client: {
          columns: {
            id: true,
            fullName: true,
            avatarUrl: true,
            username: true,
            email: true,
            createdAt: true,
          },
        },
      },
    })

    // 4. Extract and deduplicate client profiles (a trainer may have multiple
    //    conversations with the same client — only surface unique profiles)
    const seen = new Set<string>()
    const clients = convos
      .map((c) => c.client)
      .filter((client): client is NonNullable<typeof client> => {
        if (!client || seen.has(client.id)) return false
        seen.add(client.id)
        return true
      })
      .map((client) => ({
        id: client.id,
        full_name: client.fullName,
        avatar_url: client.avatarUrl,
        username: client.username,
        email: client.email,
        created_at: client.createdAt,
      }))

    return NextResponse.json({
      success: true,
      data: clients,
      count: clients.length,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'clients-list')
  }
}
