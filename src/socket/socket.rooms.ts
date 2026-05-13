export const SOCKET_ROOMS = {
  user: (userId: string): string => `user_${userId}`,
  admin: (): string => 'admin_platform',
  seller: (sellerId: string): string => `seller_${sellerId}`,
  delivery: (deliveryId: string): string => `delivery_${deliveryId}`,
  order: (orderId: string): string => `order_${orderId}`,
  orderChat: (orderId: string, chatType: string): string => `order_${orderId}_chat_${chatType}`,
} as const;
