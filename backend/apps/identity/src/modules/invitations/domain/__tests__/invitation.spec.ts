import { InvitationStatus } from '@contracts/identity';
import { InvitationToken } from '../invitation-token.js';
import { Invitation } from '../invitation.js';

const NOW = new Date('2026-11-16T10:00:00.000Z');
const LATER = new Date('2026-11-24T10:00:00.000Z');

function anInvitation(): Invitation {
  return Invitation.issue({
    id: 'i-1',
    tenantId: 't-1',
    email: 'pia@example.com',
    groupIds: [],
    invitedBy: 'u-1',
    tokenHash: 'h',
    expiresAt: new Date('2026-11-23T10:00:00.000Z'),
  });
}

describe('Invitation', () => {
  it('is pending until it expires', () => {
    const invitation = anInvitation();

    expect(invitation.statusAt(NOW)).toBe(InvitationStatus.Pending);
    expect(invitation.statusAt(LATER)).toBe(InvitationStatus.Expired);
    expect(invitation.isUsable(LATER)).toBe(false);
  });

  it('is revoked only while pending', () => {
    const invitation = anInvitation();

    expect(invitation.revoke(LATER)).toBe(false);
    expect(invitation.revoke(NOW)).toBe(true);
    expect(invitation.revoke(NOW)).toBe(false);
    expect(invitation.statusAt(NOW)).toBe(InvitationStatus.Revoked);
  });

  it('stays accepted after use', () => {
    const invitation = anInvitation();

    invitation.accept();

    expect(invitation.statusAt(NOW)).toBe(InvitationStatus.Accepted);
  });
});

describe('InvitationToken', () => {
  it('carries the tenant to its shard', () => {
    const token = new InvitationToken('tenant-1', Buffer.from('secreto'));

    expect(InvitationToken.parse(token.format())?.tenantId).toBe('tenant-1');
    expect(InvitationToken.parse('iv2_tenant_secreto')).toBeUndefined();
  });
});
