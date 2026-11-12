import 'package:contracts/contracts.dart';

import 'assistant_models.dart';
import 'assistant_repository.dart';

/// In-memory repository that stands in for the API and its SSE stream.
///
/// Each instance keeps its own conversations, so a fresh scope starts empty.
/// Message keywords pick the scripted behaviour:
/// - `cuota`: fails with `BILLING.QUOTA.EXCEEDED` as an [ApiErrorException].
/// - `tarea`: streams text, then asks to confirm a tool before continuing.
/// - anything else: streams text, then citations and token usage.
final class FakeAssistantRepository implements AssistantRepository {
  FakeAssistantRepository({this.chunkDelay = const Duration(milliseconds: 60)})
    : _conversations = [
        const Conversation(
          id: 'c1',
          title: 'Plan de la semana',
          lastMessage: 'Esta semana tienes tres entregas.',
        ),
        const Conversation(
          id: 'c2',
          title: 'Facturas del trimestre',
          lastMessage: 'Encontré tres facturas pendientes.',
        ),
      ],
      _messages = {
        'c1': [
          const ChatMessage(
            id: 'seed-1',
            role: AssistantRole.user,
            text: 'Qué tengo esta semana?',
          ),
          const ChatMessage(
            id: 'seed-2',
            role: AssistantRole.assistant,
            text: 'Esta semana tienes tres entregas.',
          ),
        ],
      };

  /// Pause between chunks, so the stream is visible in the UI.
  final Duration chunkDelay;

  final List<Conversation> _conversations;
  final Map<String, List<ChatMessage>> _messages;
  int _nextConversation = 3;

  // Scripted server content, kept here because it simulates what the API sends.
  static const String _toolLead = 'Voy a preparar la tarea para ti. ';
  static const String _toolSummary = 'Crear una tarea nueva en tu lista de pendientes.';
  static const String _toolDone = 'Listo, la tarea quedó creada.';
  static const String _toolSkipped = 'Entendido, no creé la tarea.';
  static const List<String> _answer = [
    'Puedo ayudarte ',
    'con tus tareas ',
    'pendientes.',
  ];

  static const List<Citation> _citations = [
    Citation(title: 'Plan semanal de tareas', sourceId: 'doc-101'),
    Citation(title: 'Notas de la reunión del lunes', sourceId: 'note-42'),
  ];

  static const TokenUsage _usage = TokenUsage(input: 412, output: 48);

  @override
  Future<List<Conversation>> listConversations() async =>
      List.unmodifiable(_conversations);

  @override
  Future<Conversation> createConversation() async {
    final conversation = Conversation(
      id: 'c${_nextConversation++}',
      title: 'Nueva conversación',
    );
    _conversations.insert(0, conversation);
    return conversation;
  }

  @override
  Future<List<ChatMessage>> loadMessages(String conversationId) async =>
      List.unmodifiable(_messages[conversationId] ?? const <ChatMessage>[]);

  @override
  Stream<AssistantChunk> ask(String conversationId, String message) async* {
    final text = message.toLowerCase();

    if (text.contains('cuota')) {
      await Future<void>.delayed(chunkDelay);
      throw const ApiErrorException(
        ProblemDetails(
          type: 'about:blank',
          title: 'Quota exceeded',
          status: 429,
          code: 'BILLING.QUOTA.EXCEEDED',
          traceId: 'trace-quota-0001',
        ),
      );
    }

    if (text.contains('tarea')) {
      yield* _streamText([_toolLead]);
      final request = ToolConfirmationRequest(
        toolName: 'crear_tarea',
        summary: _toolSummary,
      );
      yield request;
      final approved = await request.decision;
      yield* _streamText([approved ? _toolDone : _toolSkipped]);
      yield const AssistantFinalChunk(citations: [], usage: _usage);
      return;
    }

    yield* _streamText(_answer);
    yield const AssistantFinalChunk(citations: _citations, usage: _usage);
  }

  Stream<AssistantChunk> _streamText(List<String> parts) async* {
    for (final part in parts) {
      await Future<void>.delayed(chunkDelay);
      yield AssistantTextChunk(part);
    }
  }
}
