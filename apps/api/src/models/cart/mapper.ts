import type {
  CartEntity,
  CartItemSnapshot,
  OrderingParticipantSnapshot,
  SelectedModifierOptionSnapshot,
} from './model';
import type {
  CartDto,
  CartItemDto,
  OrderingParticipantDto,
  SelectedModifierOptionDto,
} from '@repo/shared';

export function toOrderingParticipantDto(
  participant: OrderingParticipantSnapshot,
): OrderingParticipantDto {
  const dto: OrderingParticipantDto = {
    id: participant.id,
    avatarKey: participant.avatarKey,
    joinedAt: participant.joinedAt.toISOString(),
  };

  if (participant.displayName !== undefined) {
    dto.displayName = participant.displayName;
  }

  return dto;
}

function toSelectedModifierOptionDto(
  option: SelectedModifierOptionSnapshot,
): SelectedModifierOptionDto {
  return {
    modifierId: option.modifierId,
    modifierName: option.modifierName,
    optionId: option.optionId,
    optionName: option.optionName,
    priceAdjustment: option.priceAdjustment,
  };
}

export function toCartItemDto(item: CartItemSnapshot): CartItemDto {
  const dto: CartItemDto = {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    selectedOptions: item.selectedOptions.map(toSelectedModifierOptionDto),
    totalItemPrice: item.totalItemPrice,
    createdAt: item.createdAt.toISOString(),
  };

  if (item.addedByParticipantId !== undefined) {
    dto.addedByParticipantId = item.addedByParticipantId;
  }

  if (item.participantDisplayName !== undefined) {
    dto.participantDisplayName = item.participantDisplayName;
  }

  if (item.notes !== undefined) {
    dto.notes = item.notes;
  }

  return dto;
}

export function toCartDto(cart: CartEntity): CartDto {
  const dto: CartDto = {
    id: cart.id,
    storeId: cart.storeId,
    orderType: cart.orderType,
    checkoutMode: cart.checkoutMode,
    status: cart.status,
    participants: cart.participants.map(toOrderingParticipantDto),
    items: cart.items.map(toCartItemDto),
    subtotal: cart.subtotal,
    serviceFeeRate: cart.serviceFeeRate,
    serviceFeeAmount: cart.serviceFeeAmount,
    totalAmount: cart.totalAmount,
    expiresAt: cart.expiresAt.toISOString(),
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };

  if (cart.joinCode !== undefined) {
    dto.joinCode = cart.joinCode;
  }

  if (cart.tableNumber !== undefined) {
    dto.tableNumber = cart.tableNumber;
  }

  if (cart.notes !== undefined) {
    dto.notes = cart.notes;
  }

  if (cart.orderId !== undefined) {
    dto.orderId = cart.orderId;
  }
  if (cart.orderingClosesAt !== undefined) {
    dto.orderingClosesAt = cart.orderingClosesAt.toISOString();
  }

  return dto;
}
