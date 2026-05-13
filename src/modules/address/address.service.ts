import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { IAddress } from './address.interface.js';
import { Address } from './address.model.js';

type AddressPayload = Omit<IAddress, 'user' | 'isDefault'> & {
  isDefault?: boolean;
};

const validateAddressId = (id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'Invalid address id');
  }
};

const createAddress = async (userId: string, payload: AddressPayload) => {
  const shouldSetDefault = payload.isDefault === true || (await Address.countDocuments({ user: userId })) === 0;

  if (shouldSetDefault) {
    await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
  }

  return Address.create({
    ...payload,
    user: userId,
    isDefault: shouldSetDefault,
  });
};

const getUserAddresses = async (userId: string) => {
  return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

const updateAddress = async (userId: string, addressId: string, payload: Partial<AddressPayload>) => {
  validateAddressId(addressId);

  if (payload.isDefault) {
    await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
  }

  const address = await Address.findOneAndUpdate(
    { _id: addressId, user: userId },
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!address) {
    throw new AppError(404, 'Address not found');
  }

  return address;
};

const deleteAddress = async (userId: string, addressId: string) => {
  validateAddressId(addressId);

  const address = await Address.findOneAndDelete({ _id: addressId, user: userId });
  if (!address) {
    throw new AppError(404, 'Address not found');
  }

  if (address.isDefault) {
    const nextAddress = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  return address;
};

const setDefaultAddress = async (userId: string, addressId: string) => {
  validateAddressId(addressId);

  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw new AppError(404, 'Address not found');
  }

  await Address.updateMany({ user: userId }, { $set: { isDefault: false } });

  address.isDefault = true;
  await address.save();

  return address;
};

export const AddressService = {
  createAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
