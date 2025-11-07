import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiHeader } from '@nestjs/swagger';
import { BlankReturnMessageDto } from './return-message';
import { MergeClassOrMethodDecorators } from './merge';
import { ApiError } from './openapi';
import {
  ApiFromResolver,
  createResolver,
  ResolverDual,
  ResolverDynamic,
} from './resolver';
import { MetadataSetter, Reflector } from 'typed-reflector';
import { ModuleRef } from '@nestjs/core';

export interface RequireTokenOptions {
  resolver?: ResolverDual;
  tokenSource?: string | ResolverDynamic;
  errorCode?: number;
}

type RequireTokenMetadataMap = {
  requireTokenOptions: RequireTokenOptions;
};

const reflector = new Reflector<RequireTokenMetadataMap, {}>();
const Metadata = new MetadataSetter<RequireTokenMetadataMap, {}>();

const defaultHeaderName = 'x-server-token';
const defaultConfigName = 'SERVER_TOKEN';
const defaultErrorCode = 401;

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(
    @Inject(ConfigService) private config: ConfigService,
    @Inject(ModuleRef) private moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext) {
    const controller = context.getClass();
    const handlerName = context.getHandler()?.name;
    let config = {} as RequireTokenOptions;
    if (controller) {
      if (handlerName) {
        config =
          reflector.get('requireTokenOptions', controller, handlerName) || {};
      } else {
        config = reflector.get('requireTokenOptions', controller) || {};
      }
    }
    const resolver = createResolver(
      config.resolver || { paramType: 'header', paramName: defaultHeaderName },
    );
    const tokenSource = config.tokenSource || defaultConfigName;
    const [tokenFromClient, tokenFromConfig] = await Promise.all([
      resolver(context, this.moduleRef),
      typeof tokenSource === 'function'
        ? tokenSource(context, this.moduleRef)
        : this.config.get<string>(tokenSource),
    ]);
    if (tokenFromConfig && tokenFromConfig !== tokenFromClient) {
      throw new BlankReturnMessageDto(
        config.errorCode || defaultErrorCode,
        'Unauthorized',
      ).toException();
    }
    return true;
  }
}

export const RequireToken = (options: RequireTokenOptions = {}) => {
  const swaggerDec = options.resolver
    ? ApiFromResolver(options.resolver, {
        description: 'Server token',
        required: false,
      })
    : ApiHeader({
        name: defaultHeaderName,
        description: 'Server token',
        required: false,
      });
  return MergeClassOrMethodDecorators([
    UseGuards(TokenGuard),
    swaggerDec,
    ApiError(
      options.errorCode || defaultErrorCode,
      'Incorrect server token provided',
    ),
    ...(options ? [Metadata.set('requireTokenOptions', options)] : []),
  ]);
};
