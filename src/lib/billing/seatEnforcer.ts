import { ApiError } from "../api/errors";

export function assertSeatsAvailable(params: {
  isBeta: boolean;
  seatQuantity: number;
  activeMemberCount: number;
}) {
  if (params.isBeta) return;

  if (params.seatQuantity <= 0) {
    throw new ApiError({
      status: 409,
      code: "conflict",
      message: "No active subscription seats available",
    });
  }

  if (params.activeMemberCount >= params.seatQuantity) {
    throw new ApiError({
      status: 409,
      code: "conflict",
      message: "Seat limit reached",
    });
  }
}

