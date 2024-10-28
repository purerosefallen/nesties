import { BlankReturnMessageDto, ReturnMessageDto } from './return-message';
import { ApiResponse, ApiResponseOptions } from '@nestjs/swagger';
import { ClassOrArray } from './insert-field';

export const ApiTypeResponse = (
  // eslint-disable-next-line @typescript-eslint/ban-types
  type: ClassOrArray,
  options: ApiResponseOptions = {},
) =>
  ApiResponse({
    status: 200,
    type: ReturnMessageDto(type),
    ...options,
  });

export const ApiBlankResponse = (options: ApiResponseOptions = {}) =>
  ApiResponse({
    status: 200,
    type: BlankReturnMessageDto,
    ...options,
  });

export const ApiError = (status: number, description: string) =>
  ApiBlankResponse({ status, description });
