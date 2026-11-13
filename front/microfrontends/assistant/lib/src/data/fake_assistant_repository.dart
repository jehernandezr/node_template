import 'dart:async';

import 'package:contracts/contracts.dart';

import '../shared/constants/assistant_constants.dart';
import '../shared/enums/assistant_role.dart';
import '../shared/types/assistant_types.dart';
import 'assistant_repository.dart';

/// In-memory repository that stands in for the API and its SSE stream.
///
/// Each instance keeps its own conversations, so a fresh scope starts empty.
/// Message keywords pick the scripted behaviour:
/// - `cuota`: fails with `BILLING.QUOTA.EXCEEDED` as an [ApiErrorException].
/// - `tarea`: streams text, then asks to confirm a tool before continuing.
/// - anything else: streams text, then citations and token usage.
base class FakeAssistantRepository implements AssistantRepository {
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
  final Set<_ActiveAnswer> _active = {};
  bool _disposed = false;
  int _nextConversation = 3;

  // Scripted server content, kept here because it simulates what the API sends.
  static const String _toolLead = 'Voy a preparar la tarea para ti. ';
  static const String _toolSummary =
      'Crear una tarea nueva en tu lista de pendientes.';
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
  Stream<AssistantChunk> ask(String conversationId, String message) {
    if (_disposed) return const Stream.empty();
    final answer = _ActiveAnswer(_script(message), _active.remove);
    _active.add(answer);
    return answer.stream;
  }

  /// Cancels every answer in progress. Their streams end without more chunks.
  @override
  void dispose() {
    _disposed = true;
    for (final answer in _active.toList()) {
      answer.close();
    }
    _active.clear();
  }

  Stream<AssistantChunk> _script(String message) async* {
    final text = message.toLowerCase();

    if (text.contains('cuota')) {
      await Future<void>.delayed(chunkDelay);
      throw const ApiErrorException(
        ProblemDetails(
          type: 'about:blank',
          title: 'Quota exceeded',
          status: 429,
          code: quotaExceededCode,
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

/// One answer in progress: relays the scripted stream and can be cut from
/// outside, rejecting a tool confirmation nobody will answer.
final class _ActiveAnswer {
  _ActiveAnswer(this._source, this._onEnded) {
    _out = StreamController<AssistantChunk>(
      onListen: _start,
      onCancel: _cancelled,
    );
  }

  final Stream<AssistantChunk> _source;
  final void Function(_ActiveAnswer answer) _onEnded;
  late final StreamController<AssistantChunk> _out;
  StreamSubscription<AssistantChunk>? _subscription;
  ToolConfirmationRequest? _pending;

  Stream<AssistantChunk> get stream => _out.stream;

  void _start() {
    _subscription = _source.listen(
      (chunk) {
        if (chunk is ToolConfirmationRequest) _pending = chunk;
        _out.add(chunk);
      },
      onError: _out.addError,
      onDone: () {
        _onEnded(this);
        _out.close();
      },
    );
  }

  /// Does not return the source's cancel future: the stream would wait for it
  /// before delivering its own done event.
  void _cancelled() {
    _onEnded(this);
    unawaited(_stopSource());
  }

  /// Ends the answer from the repository side.
  void close() {
    _onEnded(this);
    unawaited(_stopSource());
    if (!_out.isClosed) unawaited(_out.close());
  }

  Future<void> _stopSource() {
    // Unblock the script if it waits for a tool answer nobody will give.
    final pending = _pending;
    if (pending != null && !pending.isResolved) pending.reject();
    return _subscription?.cancel() ?? Future<void>.value();
  }
}
