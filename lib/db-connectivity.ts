export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isDatabaseConnectionPoolExhaustion(error: unknown): boolean {
  return /too many clients|remaining connection slots are reserved|sorry, too many clients already/i.test(
    getErrorMessage(error),
  );
}

export function isDatabaseConnectivityFailure(error: unknown): boolean {
  return /can't reach database server|too many clients|econnrefused|econnreset|etimedout|p1001|connection terminated/i.test(
    getErrorMessage(error),
  );
}
