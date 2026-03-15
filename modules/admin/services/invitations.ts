/**
 * Admin invitation service — wraps Clerk invitation API
 *
 * sendInvitation   — create a Clerk invitation with optional role metadata
 * listInvitations  — fetch all pending/accepted invitations
 * revokeInvitation — cancel a pending invitation by ID
 */

import { clerkClient } from '@clerk/nextjs/server'
import type { InviteInput } from '../types'

export async function sendInvitation(input: InviteInput) {
  const client = await clerkClient()
  const invitation = await client.invitations.createInvitation({
    emailAddress: input.emailAddress,
    publicMetadata: input.role ? { intendedRole: input.role } : undefined,
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/member/login`,
  })

  return {
    id: invitation.id,
    email_address: invitation.emailAddress,
    status: invitation.status,
    created_at: invitation.createdAt,
  }
}

export async function listInvitations() {
  const client = await clerkClient()
  const response = await client.invitations.getInvitationList()

  return response.data.map(inv => ({
    id: inv.id,
    email_address: inv.emailAddress,
    status: inv.status,
    created_at: inv.createdAt,
    public_metadata: inv.publicMetadata as Record<string, unknown> | undefined,
  }))
}

export async function revokeInvitation(invitationId: string) {
  const client = await clerkClient()
  await client.invitations.revokeInvitation(invitationId)
}
