import type {
  AddCartItemRequest,
  CartDto,
  CartItemDto,
  CartItemInput,
  CartStatus,
  CreateCartRequest,
  CreateCartSuccessResponse,
  GetGuestCartSuccessResponse,
  GetGuestSessionSuccessResponse,
  GuestSessionDto,
  JoinCartRequest,
  JoinCartSuccessResponse,
  LeaveCartSuccessResponse,
  MutateGuestCartSuccessResponse,
  OrderingParticipantDto,
  SelectedModifierOptionDto,
  SubmitCartRequest,
  SubmitCartSuccessResponse,
  UpdateCartItemRequest,
} from '@repo/shared';

import type { Order } from '@/models/order';

export type {
  AddCartItemRequest,
  CartItemInput,
  CartStatus,
  CreateCartRequest,
  CreateCartSuccessResponse,
  GetGuestCartSuccessResponse,
  GetGuestSessionSuccessResponse,
  JoinCartRequest,
  JoinCartSuccessResponse,
  LeaveCartSuccessResponse,
  MutateGuestCartSuccessResponse,
  SubmitCartRequest,
  SubmitCartSuccessResponse,
  UpdateCartItemRequest,
};

export type CartDtoType = CartDto;
export type Cart = CartDto;
export type CartItem = CartItemDto;
export type SelectedModifierOption = SelectedModifierOptionDto;
export type OrderingParticipant = OrderingParticipantDto;

/** Frontend model of the restored storefront session context. */
export type GuestSession = {
  participantId: string;
  cart?: Cart;
  order?: Order;
};

export type GuestSessionDtoType = GuestSessionDto;
