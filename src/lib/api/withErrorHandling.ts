import { NextResponse } from "next/server";
import { ApiError, toApiError } from "./errors";

export async function withErrorHandling(
  fn: () => Promise<NextResponse>,
) {
  try {
    return await fn();
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: apiErr.code,
          message: apiErr.message,
          details: apiErr.details,
        },
      },
      { status: (apiErr as ApiError).status },
    );
  }
}

