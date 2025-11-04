import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ProviderToken, createAbortableProvider } from './abortable.token';
import { AbortableOpts } from 'nfkit';
import { AbortSignalProvider } from './abort-signal.provider';

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
    tokens: ProviderToken[],
    options?: AbortableModuleOptions,
  ): DynamicModule {
    const providers: Provider[] = tokens.map((token) =>
      createAbortableProvider(token, options?.abortableOptions),
    );

    return {
      module: AbortableModule,
      providers: [...providers],
      exports: [...providers],
    };
  }
}
