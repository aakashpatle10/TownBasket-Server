import { IShop } from './shop.interface.js';
import { Shop } from './shop.model.js';

const createShop = async (payload: IShop) => {
  const shop = await Shop.create(payload);
  return shop;
};

const getAllShops = async () => {
  return await Shop.find().populate('owner', 'name email');
};

const getSingleShop = async (id: string) => {
  return await Shop.findById(id).populate('owner', 'name email');
};

export const ShopService = {
  createShop,
  getAllShops,
  getSingleShop,
};