import { Inject, Scope } from '@nestjs/common';
import { abortable, AbortableOpts } from 'nfkit';
import { ABORT_SIGNAL } from './abort-signal.provider';
import { ContextIdFactory, ModuleRef, REQUEST } from '@nestjs/core';
import { createProvider } from '../create-provider';
import { InjectionToken } from '@nestjs/common/interfaces/modules/injection-token.interface';
import { createMutateInject } from '../utility/create-mutate-inject';

const tokenMemo = new Map<any, symbol>();
export const abortableToken = (token: InjectionToken) => {
  if (tokenMemo.has(token)) return tokenMemo.get(token)!;
  const name = typeof token === 'function' ? token.name : String(token);
  const sym = Symbol.for(`Abortable(${name})`);
  tokenMemo.set(token, sym);
  return sym;
};

/**
 * 支持两种用法：
 *   @InjectAbortable(SomeService)
 *   @InjectAbortable()  // 自动推断类型
 */
export const InjectAbortable = createMutateInject(abortableToken);

export function createAbortableProvider<T>(
  token: InjectionToken<T>,
  opts?: AbortableOpts,
) {
  const provide = abortableToken(token);

  return createProvider(
    {
      provide,
      scope: Scope.REQUEST,
      inject: [ModuleRef, REQUEST, ABORT_SIGNAL],
    },
    async (moduleRef, req: Request, signal) => {
      // 让解析与当前请求上下文绑定（支持 request/transient 作用域）
      const ctxId = ContextIdFactory.getByRequest(req);
      // 严格模式关闭，允许跨模块边界解析（解决测试里 forFeature 子模块看不到 DemoService 的情况）
      const svc = await moduleRef.resolve<T>(token, ctxId, { strict: false });
      if (svc == null) {
        throw new Error(
          `Abortable: provider "${String(
            (token as any).name ?? token,
          )}" not found in container (even with strict:false)`,
        );
      }
      return abortable<T>(svc, signal, opts);
    },
  );
}
