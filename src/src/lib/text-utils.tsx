import type { ReactNode } from 'react'

/**
 * 文字列を「。」で分割し、改行（<br />）を挿入して返すユーティリティ
 */
export function formatTextWithLineBreaks(text: string): ReactNode[] {
  if (!text) return []
  return text.split('。').map((segment, i, arr) => (
    <span key={i}>
      {segment}
      {i !== arr.length - 1 && '。'}
      {i !== arr.length - 1 && <br />}
    </span>
  ))
}
