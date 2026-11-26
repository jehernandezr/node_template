import type { RealtimeFrame, StoredFrame } from './realtime-frame.js';

/** Cancels a subscription to a channel. */
export type StreamUnsubscribe = () => Promise<void>;

/**
 * Ordered stream of frames per channel (one channel per user). Stores the last frames so that a
 * connection that drops can request those that arrived after the last one it received.
 */
export abstract class RealtimeStream {
  /**
   * Appends the frame to the end of the channel and returns its id.
   * @param channel Channel to append to.
   * @param frame Frame to append.
   * @returns The id.
   */
  abstract append(channel: string, frame: RealtimeFrame): Promise<string>;

  /**
   * Returns the frames after `afterId` (all retained ones if there is none), in order and up to `limit`. An `afterId`
   * that is not an id of this stream returns nothing: the reader starts from `resumePoint` or from a frame already read.
   * @param channel Channel to read.
   * @param afterId Last id read.
   * @param limit Maximum frames.
   * @returns The frames.
   */
  abstract readAfter(
    channel: string,
    afterId: string | undefined,
    limit: number,
  ): Promise<readonly StoredFrame[]>;

  /**
   * Returns where an opening connection reads from: `lastEventId` if it is an id of this stream not past the last
   * frame; if it is missing, is not one or is later, the id of the channel's last frame (`undefined` if it has
   * none). A made-up or corrupt id does not replay what is retained: the API already provides what came before.
   * @param channel Channel to read.
   * @param lastEventId Last id the client received.
   * @returns The id to read after, or `undefined`.
   */
  abstract resumePoint(
    channel: string,
    lastEventId: string | undefined,
  ): Promise<string | undefined>;

  /**
   * Notifies each time the channel receives frames. The notice does not carry the frame: the listener reads it with
   * `readAfter`, so a lost notice only delays delivery until the next one.
   * @param channel Channel to watch.
   * @param onAppend Called on each append.
   * @returns The function that unsubscribes.
   */
  abstract subscribe(
    channel: string,
    onAppend: () => void,
  ): Promise<StreamUnsubscribe>;
}
