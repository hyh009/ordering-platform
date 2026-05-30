import type { LocalizedString } from '@src/models/common/model';
import type {
  StoreCheckoutMode,
  StoreOrderType,
} from '@src/models/store/model';

export const cartStatuses = ['active', 'checked_out', 'abandoned'] as const;

export type CartStatus = (typeof cartStatuses)[number];

export type OrderingParticipantSnapshot = {
  id: string;
  /**
   * MVP customer-facing label for dine-in/takeaway ordering.
   * Add a dedicated contact/customer snapshot later if phone, email, or member
   * identity becomes part of the ordering flow.
   */
  displayName?: string;
  joinedAt: Date;
};

export type SelectedModifierOptionSnapshot = {
  modifierId: string;
  modifierName: LocalizedString;
  optionId: string;
  optionName: LocalizedString;
  priceAdjustment: number;
};

export type CartItemSnapshot = {
  id: string;
  productId: string;
  productName: LocalizedString;
  quantity: number;
  unitPrice: number;
  selectedOptions: SelectedModifierOptionSnapshot[];
  addedByParticipantId?: string;
  participantDisplayName?: string;
  notes?: string;
  totalItemPrice: number;
  createdAt: Date;
};

export type CartEntity = {
  id: string;
  organizationId: string;
  storeId: string;
  orderType: StoreOrderType;
  checkoutMode: StoreCheckoutMode;
  status: CartStatus;
  joinCode?: string;
  tableNumber?: string;
  participants: OrderingParticipantSnapshot[];
  items: CartItemSnapshot[];
  notes?: string;
  subtotal: number;
  serviceFeeRate: number;
  serviceFeeAmount: number;
  totalAmount: number;
  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
};
