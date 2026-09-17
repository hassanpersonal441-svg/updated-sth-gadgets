'use client';

import React from 'react';

interface ChatMessageContentProps {
  content: string;
  isLight?: boolean;
}

interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'link';
  content?: string;
  text?: string;
  href?: string;
}

interface BlockElement {
  type: 'line' | 'bullet' | 'number' | 'heading' | 'hr' | 'empty';
  number?: string;
  tokens?: InlineToken[];
}

function parseInline(text: string): InlineToken[] {
  // Matches **bold**, *italic*, [link](url)
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push({ type: 'bold', content: token.slice(2, -2) });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push({ type: 'italic', content: token.slice(1, -1) });
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push({ type: 'link', text: linkMatch[1], href: linkMatch[2] });
      } else {
        parts.push({ type: 'text', content: token });
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}

function parseBlocks(content: string): BlockElement[] {
  const lines = content.split('\n');
  const elements: BlockElement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push({ type: 'empty' });
      continue;
    }

    if (trimmed === '---' || trimmed === '***') {
      elements.push({ type: 'hr' });
      continue;
    }

    const headMatch = trimmed.match(/^#{1,4}\s+(.*)$/);
    if (headMatch) {
      elements.push({
        type: 'heading',
        tokens: parseInline(headMatch[1]),
      });
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push({
        type: 'number',
        number: numMatch[1],
        tokens: parseInline(numMatch[2]),
      });
      continue;
    }

    // Bullet lines starting with * or - or •
    if (/^[\*\-•]\s+/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[\*\-•]\s+/, '');
      elements.push({
        type: 'bullet',
        tokens: parseInline(bulletContent),
      });
      continue;
    }

    elements.push({
      type: 'line',
      tokens: parseInline(trimmed),
    });
  }

  return elements;
}

export function ChatMessageContent({ content, isLight = false }: ChatMessageContentProps) {
  const blocks = React.useMemo(() => parseBlocks(content), [content]);

  const renderInlineTokens = (tokens?: InlineToken[]) => {
    if (!tokens) return null;
    return tokens.map((token, idx) => {
      if (token.type === 'bold') {
        return (
          <strong
            key={idx}
            className={`font-bold ${isLight ? 'text-slate-950 font-bold' : 'text-white font-bold'}`}
          >
            {token.content}
          </strong>
        );
      }
      if (token.type === 'italic') {
        return (
          <em key={idx} className="italic opacity-90 text-[11px] sm:text-xs">
            {token.content}
          </em>
        );
      }
      if (token.type === 'link') {
        return (
          <a
            key={idx}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00C4CC] underline font-semibold hover:opacity-80 transition"
          >
            {token.text}
          </a>
        );
      }
      return <React.Fragment key={idx}>{token.content}</React.Fragment>;
    });
  };

  return (
    <div className="space-y-1 leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === 'empty') {
          return <div key={idx} className="h-1.5" />;
        }
        if (block.type === 'hr') {
          return (
            <hr
              key={idx}
              className={`my-2 border-t ${
                isLight ? 'border-slate-200' : 'border-slate-700/60'
              }`}
            />
          );
        }
        if (block.type === 'heading') {
          return (
            <div
              key={idx}
              className="font-bold text-xs sm:text-sm text-[#00C4CC] mt-2 mb-0.5"
            >
              {renderInlineTokens(block.tokens)}
            </div>
          );
        }
        if (block.type === 'number') {
          return (
            <div key={idx} className="flex items-start gap-1.5 my-0.5">
              <span className="text-[#00C4CC] font-bold text-xs shrink-0 select-none leading-5">
                {block.number}.
              </span>
              <span className="flex-1 leading-relaxed">
                {renderInlineTokens(block.tokens)}
              </span>
            </div>
          );
        }
        if (block.type === 'bullet') {
          return (
            <div key={idx} className="flex items-start gap-2 my-0.5">
              <span className="text-[#00C4CC] font-bold text-xs shrink-0 select-none leading-5">
                •
              </span>
              <span className="flex-1 leading-relaxed">
                {renderInlineTokens(block.tokens)}
              </span>
            </div>
          );
        }
        return (
          <div key={idx} className="leading-relaxed">
            {renderInlineTokens(block.tokens)}
          </div>
        );
      })}
    </div>
  );
}
