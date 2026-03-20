import { ZodError } from "zod";

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "conflict"
  | "internal_error";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(params: {
    status: number;
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const hint = first
      ? `${first.path.length ? first.path.join(".") + ": " : ""}${first.message}`
      : "Invalid request payload";
    return new ApiError({
      status: 400,
      code: "bad_request",
      message: hint,
      details: { issues: err.issues },
    });
  }

  // Avoid leaking internal details to the client.
  return new ApiError({
    status: 500,
    code: "internal_error",
    message: "Internal server error",
  });
}

