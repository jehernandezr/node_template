import { MemberRoster } from '../../domain/member-roster.js';

/** In-memory `MemberRoster`: a user counts once however many times it joins. */
export class InMemoryMemberRoster extends MemberRoster {
  private readonly members = new Set<string>();

  override async join(userId: string): Promise<void> {
    this.members.add(userId);
  }

  override async leave(userId: string): Promise<void> {
    this.members.delete(userId);
  }

  override async count(): Promise<number> {
    return this.members.size;
  }
}
