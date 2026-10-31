// Source code on screen: one monospace line, lightly syntax-colored. Segments
// are placed by character column, so aligned code stays aligned.
import {Node, NodeProps, Txt} from '@motion-canvas/2d';
import {colors} from '../theme';

export const mono = 'JetBrains Mono';
const CHAR_W = 0.6; // advance of one character, in em
export const codeWidth = (chars: number, size: number) => chars * size * CHAR_W;

const KEYWORD = '#c4b0f0';
const STRING = '#a6e3a1';
const DECORATOR = '#8fd8e8';
const TOKENS =
  /(#.*$|--.*$|"[^"]*"|'[^']*'|@\w[\w.]*|<\/?[a-z0-9]+|\b(?:from|import|def|return|with|as|assert|CREATE|TABLE|INDEX|ON|INTEGER|PRIMARY|KEY|TEXT|NOT|NULL|DEFAULT)\b)/g;

function tokenFill(token: string) {
  if (token.startsWith('#') || token.startsWith('--')) return colors.textMuted;
  if (token.startsWith('"') || token.startsWith("'")) return STRING;
  if (token.startsWith('@') || token.startsWith('<')) return DECORATOR;
  return KEYWORD;
}

function segments(line: string) {
  const out: {text: string; fill: string; col: number}[] = [];
  const plain = (from: number, to: number) => {
    // Leading spaces don't render: the column carries the indentation.
    const text = line.slice(from, to);
    const indent = text.length - text.trimStart().length;
    if (text.trim()) out.push({text: text.trimStart(), fill: colors.textLight, col: from + indent});
  };
  let at = 0;
  for (const m of line.matchAll(TOKENS)) {
    plain(at, m.index);
    out.push({text: m[0], fill: tokenFill(m[0]), col: m.index});
    at = m.index + m[0].length;
  }
  plain(at, line.length);
  return out;
}

// `fill` overrides the syntax colors (e.g. terminal output, diffs).
export function CodeLine({text, size = 18, fill, ...props}: {text: string; size?: number; fill?: string} & NodeProps) {
  return (
    <Node {...props}>
      {segments(text).map(s => (
        <Txt
          x={codeWidth(s.col, size)}
          offsetX={-1}
          fontFamily={mono}
          fontSize={size}
          fill={fill ?? s.fill}
          textWrap={'pre'}
          text={s.text}
        />
      ))}
    </Node>
  );
}
