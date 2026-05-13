import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { ChatbotService } from './chatbot.service.js';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatbotService.sendMessage(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Chatbot response generated successfully',
    data: result,
  });
});

export const ChatbotController = {
  sendMessage,
};
