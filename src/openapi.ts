import { BlankReturnMessageDto } from './return-message';
import { ApiResponse } from '@nestjs/swagger';

export const ApiError = (status: number, description: string) =>
  ApiResponse({ status, type: BlankReturnMessageDto, description });
