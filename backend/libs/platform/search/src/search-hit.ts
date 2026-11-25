/** A found document and its relevance: higher is better and it is only meaningful for comparing within one search. */
export interface SearchHit {
  readonly id: string;
  readonly score: number;
}
