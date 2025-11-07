// —— 解析结果结构 —— //
export type I18nPiece =
  | { type: 'raw'; value: string }
  | { type: 'ph'; rawInner: string; key: string };

/**
 * 栈式解析 #{ ... } 占位。支持内部成对花括号，如 #{ foo {{ bar }} }。
 * - 未闭合时：把从上次位置 i 到结尾整体作为 raw 放回（避免被拆成两段）
 * - key = trim(rawInner)
 */
export const parseI18n = (text: string): I18nPiece[] => {
  const pieces: I18nPiece[] = [];
  if (!text) return pieces;

  let i = 0;
  const n = text.length;

  while (i < n) {
    const start = text.indexOf('#{', i);
    if (start === -1) {
      // 没有更多占位符
      if (i < n) pieces.push({ type: 'raw', value: text.slice(i) });
      break;
    }

    // 先尝试匹配这个占位符是否闭合（此时不立即推入前导 raw）
    let j = start + 2; // 指向 '#{' 后第一个字符
    let depth = 1;
    while (j < n && depth > 0) {
      const ch = text.charCodeAt(j);
      if (ch === 123 /* '{' */) depth++;
      else if (ch === 125 /* '}' */) depth--;
      j++;
    }

    if (depth !== 0) {
      // 未闭合：把从 i 到末尾整体当作 raw（包含前导 + '#{' 尾巴）
      pieces.push({ type: 'raw', value: text.slice(i) });
      break;
    }

    // 到这里说明占位闭合：先推入前导 raw，再推占位片段
    if (start > i) {
      pieces.push({ type: 'raw', value: text.slice(i, start) });
    }

    const rawInner = text.slice(start + 2, j - 1);
    const key = rawInner.trim();
    pieces.push({ type: 'ph', rawInner, key });

    i = j; // 继续向后扫描
  }

  return pieces;
};
