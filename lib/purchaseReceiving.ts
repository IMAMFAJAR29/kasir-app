export type ReceiptQcStatus = "MATCH" | "SHORT" | "OVER" | "NOT_MATCH";

export function evaluateReceiptLine(
  deliveryQty: number,
  receivedQty: number,
  productMatches: boolean
): { qcStatus: ReceiptQcStatus; difference: number } {
  const difference = receivedQty - deliveryQty;

  if (!productMatches) {
    return { qcStatus: "NOT_MATCH", difference };
  }
  if (difference < 0) {
    return { qcStatus: "SHORT", difference };
  }
  if (difference > 0) {
    return { qcStatus: "OVER", difference };
  }
  return { qcStatus: "MATCH", difference };
}
