// abort-http-signal.ts
import type { IncomingMessage } from 'http';
import type { Request as ExpressReq } from 'express';
import type { FastifyRequest } from 'fastify';
import { BlankReturnMessageDto } from '../return-message';

type AnyReq = ExpressReq | FastifyRequest | IncomingMessage;

function toRawReq(req: AnyReq): IncomingMessage {
  // Fastify: req.raw 是 IncomingMessage；Express: req 本身就是 IncomingMessage
  if ((req as any)?.raw?.socket) return (req as any).raw as IncomingMessage;
  return req as IncomingMessage;
}

/**
 * 仅通过 req 自动适配 Express/Fastify，绑定 HTTP 取消到 AbortSignal。
 * - 优先监听 'aborted'（客户端中断最可靠的信号）
 * - 可选兜底：在 socket 'close' 时，仅当请求未完整接收/或已标记 aborted 时，才触发 abort，避免正常完成的误伤
 * - reason 固定为 499 HttpException
 *
 * 注意：若你的 abortable() 在 signal.reason 是 Error 时会“原样 throw reason”，
 * 那么上层会收到 HttpException(499)。若仍想统一抛 AbortedError，可改为：
 *   const reason = new AbortedError('Request aborted', httpErr);
 * 并让 throwIfAborted 先抛 AbortedError（保留 cause）。
 */
export function createAbortSignalFromHttp(req: AnyReq): AbortSignal {
  const rawReq = toRawReq(req);
  const ac = new AbortController();

  const makeReason = () =>
    new BlankReturnMessageDto(499, 'Request aborted').toException();

  const abortOnce = () => {
    if (!ac.signal.aborted) ac.abort(makeReason());
    cleanup();
  };

  const onClose = () => {
    abortOnce();
  };

  const cleanup = () => {
    rawReq.off?.('close', onClose);
  };

  rawReq.once?.('close', onClose);

  return ac.signal;
}
