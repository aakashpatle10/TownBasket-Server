import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { AddressController } from './address.controller.js';
import { createAddressValidation, updateAddressValidation } from './address.validation.js';

const router = express.Router();

router.post('/', authMiddleware, validateRequest(createAddressValidation), AddressController.createAddress);
router.get('/', authMiddleware, AddressController.getUserAddresses);
router.patch('/:id/default', authMiddleware, AddressController.setDefaultAddress);
router.patch('/:id', authMiddleware, validateRequest(updateAddressValidation), AddressController.updateAddress);
router.delete('/:id', authMiddleware, AddressController.deleteAddress);

export const AddressRoutes = router;
