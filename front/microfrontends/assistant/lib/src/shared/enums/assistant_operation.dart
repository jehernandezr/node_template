/// Calls of the assistant repository, so a fake can fail one of them.
enum AssistantOperation {
  listConversations,
  createConversation,
  loadMessages,
  ask,
}
