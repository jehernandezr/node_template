/// Calls of the assistant repository, so a fake can fail one of them.
enum AssistantOperation {
  /// Listing the conversations.
  listConversations,

  /// Creating a conversation.
  createConversation,

  /// Loading the messages.
  loadMessages,

  /// Asking a question.
  ask,
}
