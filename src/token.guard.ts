import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiHeader } from '@nestjs/swagger';
import { BlankReturnMessageDto } from './return-message';
import { MergeMethodDecorators } from './merge';
import { ApiError } from './openapi';

@Injectable()
export class TokenGuard implements CanActivate {
  private token = this.config.get<string>('SERVER_TOKEN');
  constructor(private config: ConfigService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-server-token'];
    if (this.token && token !== this.token) {
      throw new BlankReturnMessageDto(401, 'Unauthorized').toException();
    }
    return true;
  }
}

export const RequireToken = () =>
  MergeMethodDecorators([
    UseGuards(TokenGuard),
    ApiHeader({
      name: 'x-server-token',
      description: '服务器 token',
      required: false,
    }),
    ApiError(401, '服务器 Token 不正确'),
  ]);
