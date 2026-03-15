export interface TransactionResult {
  /** Transaction signature (base58) */
  signature: string;
  /** Whether the transaction was confirmed */
  confirmed: boolean;
  /** Slot where the transaction was confirmed */
  slot?: number;
  /** Error message if failed */
  error?: string;
}
