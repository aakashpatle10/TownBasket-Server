import express from 'express';
import validateRequest from '../../middlewares/validateRequest.js';
import { ChatbotController } from './chatbot.controller.js';
import { chatbotMessageValidation } from './chatbot.validation.js';

const router = express.Router();

router.post('/message', validateRequest(chatbotMessageValidation), ChatbotController.sendMessage);

export const ChatbotRoutes = router;
