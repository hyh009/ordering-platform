/**
 * @openapi
 * components:
 *   schemas:
 *     PublicStoreOrderMode:
 *       type: object
 *       required:
 *         - type
 *         - checkoutMode
 *       properties:
 *         type:
 *           type: string
 *           enum:
 *             - dine_in
 *             - takeaway
 *         checkoutMode:
 *           type: string
 *           enum:
 *             - pay_first
 *             - pay_later
 *     PublicStore:
 *       type: object
 *       required:
 *         - id
 *         - displayName
 *         - locale
 *         - businessHours
 *         - serviceFeeRate
 *         - orderModes
 *       properties:
 *         id:
 *           type: string
 *           example: store-123
 *         displayName:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         description:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         locale:
 *           type: object
 *           properties:
 *             defaultLocale:
 *               type: string
 *               example: zh-TW
 *             supportedLocales:
 *               type: array
 *               items:
 *                 type: string
 *         businessHours:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               dayOfWeek:
 *                 type: integer
 *               isOpen:
 *                 type: boolean
 *               openTime:
 *                 type: string
 *                 example: '09:00'
 *               closeTime:
 *                 type: string
 *                 example: '21:00'
 *         serviceFeeRate:
 *           type: number
 *           example: 0.1
 *         orderModes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PublicStoreOrderMode'
 *     PublicMenu:
 *       type: object
 *       required:
 *         - categories
 *         - products
 *         - modifiers
 *         - allergens
 *         - dietaryMarkers
 *       properties:
 *         categories:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               description:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               imageUrl:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               description:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *               price:
 *                 type: number
 *               allergenIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               dietaryMarkerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               modifierIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               isSoldOut:
 *                 type: boolean
 *         modifiers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               selectionType:
 *                 type: string
 *                 enum:
 *                   - single_choice
 *                   - multiple_choice
 *               minSelect:
 *                 type: integer
 *               maxSelect:
 *                 type: integer
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       $ref: '#/components/schemas/LocalizedMetadataName'
 *                     priceAdjustment:
 *                       type: number
 *                     isDefault:
 *                       type: boolean
 *                     isSoldOut:
 *                       type: boolean
 *         allergens:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PublicMetadataItem'
 *         dietaryMarkers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PublicMetadataItem'
 *     PublicMetadataItem:
 *       type: object
 *       required:
 *         - id
 *         - name
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *     OrderingParticipant:
 *       type: object
 *       required:
 *         - id
 *         - avatarKey
 *         - joinedAt
 *       properties:
 *         id:
 *           type: string
 *           example: participant-123
 *         avatarKey:
 *           type: string
 *           enum: [bear, cat, dog, eagle, elephant, flamingo, gorilla, lion, monkey, octopus, owl, ox, sheep, unicorn, wolf, zebra]
 *         displayName:
 *           type: string
 *           example: Amy
 *         joinedAt:
 *           type: string
 *           format: date-time
 *     SelectedModifierOption:
 *       type: object
 *       required:
 *         - modifierId
 *         - modifierName
 *         - optionId
 *         - optionName
 *         - priceAdjustment
 *       properties:
 *         modifierId:
 *           type: string
 *         modifierName:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         optionId:
 *           type: string
 *         optionName:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         priceAdjustment:
 *           type: number
 *     CartItem:
 *       type: object
 *       required:
 *         - id
 *         - productId
 *         - productName
 *         - quantity
 *         - unitPrice
 *         - selectedOptions
 *         - totalItemPrice
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           example: cart-item-123
 *         productId:
 *           type: string
 *         productName:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         unitPrice:
 *           type: number
 *           description: Unit price including selected option adjustments.
 *         selectedOptions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SelectedModifierOption'
 *         addedByParticipantId:
 *           type: string
 *         participantDisplayName:
 *           type: string
 *         notes:
 *           type: string
 *         totalItemPrice:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Cart:
 *       type: object
 *       required:
 *         - id
 *         - storeId
 *         - orderType
 *         - checkoutMode
 *         - status
 *         - participants
 *         - items
 *         - subtotal
 *         - serviceFeeRate
 *         - serviceFeeAmount
 *         - totalAmount
 *         - expiresAt
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: cart-123
 *         storeId:
 *           type: string
 *         orderType:
 *           type: string
 *           enum:
 *             - dine_in
 *             - takeaway
 *         checkoutMode:
 *           type: string
 *           enum:
 *             - pay_first
 *             - pay_later
 *         status:
 *           type: string
 *           enum:
 *             - active
 *             - checked_out
 *             - abandoned
 *         joinCode:
 *           type: string
 *           example: WXK7M2PQ9R
 *         tableNumber:
 *           type: string
 *           example: T1
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderingParticipant'
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         notes:
 *           type: string
 *         subtotal:
 *           type: number
 *         serviceFeeRate:
 *           type: number
 *         serviceFeeAmount:
 *           type: number
 *         totalAmount:
 *           type: number
 *         orderId:
 *           type: string
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         orderingClosesAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     OrderBatch:
 *       type: object
 *       required:
 *         - id
 *         - batchNumber
 *         - status
 *         - submittedAt
 *         - items
 *         - subtotal
 *       properties:
 *         id:
 *           type: string
 *           example: batch-123
 *         batchNumber:
 *           type: integer
 *         status:
 *           type: string
 *           enum:
 *             - pending_confirmation
 *             - preparing
 *             - ready
 *             - cancelled
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         submittedByParticipantId:
 *           type: string
 *         confirmedAt:
 *           type: string
 *           format: date-time
 *         readyAt:
 *           type: string
 *           format: date-time
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         subtotal:
 *           type: number
 *     Order:
 *       type: object
 *       required:
 *         - id
 *         - storeId
 *         - orderType
 *         - checkoutMode
 *         - businessDate
 *         - displayNumber
 *         - status
 *         - paymentStatus
 *         - canAddOn
 *         - participants
 *         - items
 *         - batches
 *         - subtotal
 *         - serviceFeeRate
 *         - serviceFeeAmount
 *         - totalAmount
 *         - orderingClosesAt
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: order-123
 *         storeId:
 *           type: string
 *         orderType:
 *           type: string
 *           enum:
 *             - dine_in
 *             - takeaway
 *         checkoutMode:
 *           type: string
 *           enum:
 *             - pay_first
 *             - pay_later
 *         businessDate:
 *           type: string
 *           example: '2026-06-10'
 *         displayNumber:
 *           type: string
 *           example: '023'
 *         status:
 *           type: string
 *           enum:
 *             - pending_payment
 *             - pending_confirmation
 *             - preparing
 *             - ready
 *             - served
 *             - completed
 *             - cancelled
 *         paymentStatus:
 *           type: string
 *           enum:
 *             - unpaid
 *             - paid
 *             - refunded
 *             - voided
 *         canAddOn:
 *           type: boolean
 *           description: >-
 *             Whether a guest may still add another batch to this order
 *             (dine-in pay-later, unpaid, not finished, before the deadline).
 *         tableNumber:
 *           type: string
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderingParticipant'
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         batches:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderBatch'
 *         notes:
 *           type: string
 *         subtotal:
 *           type: number
 *         serviceFeeRate:
 *           type: number
 *         serviceFeeAmount:
 *           type: number
 *         totalAmount:
 *           type: number
 *         orderingClosesAt:
 *           type: string
 *           format: date-time
 *         paidAt:
 *           type: string
 *           format: date-time
 *         servedAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     GuestSession:
 *       description: >-
 *         Guest ordering context. `cart` and `order` are independently optional
 *         and can coexist: `cart` is the live next-round draft (present while a
 *         usable/active draft cart exists, omitted once terminal); `order` is
 *         present whenever an order exists for the participant. A session may
 *         carry a draft cart, an order, both, or neither.
 *       type: object
 *       required:
 *         - participantId
 *       properties:
 *         participantId:
 *           type: string
 *           example: participant-123
 *         joinCode:
 *           type: string
 *           description: Present only while the Join Code is currently usable.
 *         cart:
 *           description: Live next-round draft cart, present when one is usable.
 *           $ref: '#/components/schemas/Cart'
 *         order:
 *           description: Submitted order, present when one exists for the participant.
 *           $ref: '#/components/schemas/Order'
 *     CartItemInput:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           maximum: 99
 *         selectedOptions:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - modifierId
 *               - optionId
 *             properties:
 *               modifierId:
 *                 type: string
 *               optionId:
 *                 type: string
 *         notes:
 *           type: string
 *           maxLength: 500
 *   securitySchemes:
 *     guestToken:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: Guest ordering token issued by cart create or join.
 */
