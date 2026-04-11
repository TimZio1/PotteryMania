/** Thrown when outbound email cannot be sent (missing config or provider rejection). */
export class EmailTransportError extends Error {
  readonly code: "EMAIL_TRANSPORT_NOT_CONFIGURED" | "EMAIL_SEND_FAILED";

  constructor(code: "EMAIL_TRANSPORT_NOT_CONFIGURED" | "EMAIL_SEND_FAILED", message?: string) {
    super(message ?? code);
    this.name = "EmailTransportError";
    this.code = code;
  }
}

export function isEmailTransportError(e: unknown): e is EmailTransportError {
  return e instanceof EmailTransportError;
}
