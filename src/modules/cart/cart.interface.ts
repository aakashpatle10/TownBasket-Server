import { Types } from 'mongoose';

export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
  priceAtAddition: number;
}

export interface ICart {
  user: Types.ObjectId;
  items: ICartItem[];
  subtotal: number;
  totalItems: number;
}
