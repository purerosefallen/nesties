import { DynamicModule, Module } from '@nestjs/common';
import { createAbortableProvider } from './abortable.token';
import { AbortableOpts } from 'nfkit';
import { AbortSignalProvider } from './abort-signal.provider';
import { InjectionToken } from '@nestjs/common/interfaces/modules/injection-token.interface';

export interface AbortableModuleOptions {
  abortableOptions?: AbortableOpts;
}

@Module({})
export class AbortableModule {
  static forRoot(): DynamicModule {
    return {
      module: AbortableModule,
      providers: [AbortSignalProvider],
      exports: [AbortSignalProvider],
      global: true,
    };
  }

  static forFeature(
    tokens: InjectionToken[],
    options?: AbortableModuleOptions,
  ): DynamicModule {
    const providers = tokens.map((token) =>
      createAbortableProvider(token, options?.abortableOptions),
    );

    return {
      module: AbortableModule,
      providers: [...providers],
      exports: [...providers],
    };
  }
}
