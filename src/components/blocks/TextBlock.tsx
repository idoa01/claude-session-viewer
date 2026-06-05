import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import '../../config/languages'
import type { TextBlock as TextBlockType } from '../../types/session'

// oneDark with token colors boosted to full saturation/lightness
const vividTheme: Record<string, React.CSSProperties> = {
  ...oneDark,
  comment:      { color: 'hsl(220, 10%, 52%)', fontStyle: 'italic' },
  prolog:       { color: 'hsl(220, 10%, 52%)' },
  cdata:        { color: 'hsl(220, 10%, 52%)' },
  punctuation:  { color: 'hsl(220, 14%, 80%)' },
  'attr-name':  { color: 'hsl(29, 80%, 72%)' },
  'class-name': { color: 'hsl(29, 80%, 72%)' },
  boolean:      { color: 'hsl(29, 80%, 72%)' },
  constant:     { color: 'hsl(29, 80%, 72%)' },
  number:       { color: 'hsl(29, 80%, 72%)' },
  atrule:       { color: 'hsl(29, 80%, 72%)' },
  keyword:      { color: 'hsl(286, 75%, 78%)' },
  property:     { color: 'hsl(355, 75%, 75%)' },
  tag:          { color: 'hsl(355, 75%, 75%)' },
  symbol:       { color: 'hsl(355, 75%, 75%)' },
  deleted:      { color: 'hsl(355, 75%, 75%)' },
  important:    { color: 'hsl(355, 75%, 75%)' },
  selector:     { color: 'hsl(95, 55%, 72%)' },
  string:       { color: 'hsl(95, 55%, 72%)' },
  char:         { color: 'hsl(95, 55%, 72%)' },
  builtin:      { color: 'hsl(95, 55%, 72%)' },
  inserted:     { color: 'hsl(95, 55%, 72%)' },
  regex:        { color: 'hsl(95, 55%, 72%)' },
  'attr-value': { color: 'hsl(95, 55%, 72%)' },
  variable:     { color: 'hsl(207, 90%, 75%)' },
  operator:     { color: 'hsl(207, 90%, 75%)' },
  function:     { color: 'hsl(207, 90%, 75%)' },
  url:          { color: 'hsl(187, 65%, 68%)' },
}
import styles from './TextBlock.module.css'

const highlighterStyle: React.CSSProperties = {
  margin: 0,
  padding: '12px 16px',
  background: 'transparent',
  borderRadius: 0,
  fontSize: '12px',
  lineHeight: '1.6',
  overflowX: 'auto',
}

interface Props {
  block: TextBlockType
}

export function TextBlock({ block }: Props) {
  return (
    <div className={styles.text}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = Boolean(className) || String(children).includes('\n')
            const lang = className?.replace('language-', '') ?? ''
            if (isBlock) {
              return (
                <div className={styles.codeWrapper}>
                  {lang && <span className={styles.langLabel}>{lang}</span>}
                  <SyntaxHighlighter
                    language={lang || 'text'}
                    style={vividTheme as never}
                    customStyle={highlighterStyle}
                    PreTag="div"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              )
            }
            return <code className={styles.inlineCode} {...props}>{children}</code>
          },
          pre({ children }) {
            return <>{children}</>
          },
          table({ children }) {
            return <table className={styles.table}>{children}</table>
          },
          th({ children }) {
            return <th className={styles.th}>{children}</th>
          },
          td({ children }) {
            return <td className={styles.td}>{children}</td>
          },
        }}
      >
        {block.text}
      </ReactMarkdown>
    </div>
  )
}
