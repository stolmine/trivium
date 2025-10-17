import { useState } from 'react'
import type { Root } from 'mdast'
import { EditableContent } from './EditableContent'
import type { ClozeNote } from '../../types'

export function EditableContentExample() {
  const [mode, setMode] = useState<'styled' | 'literal'>('styled')
  const [markdown, setMarkdown] = useState('This is a [test link](https://example.com) in markdown.')

  const mockAST: Root = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'This is a ',
            position: {
              start: { line: 1, column: 1, offset: 0 },
              end: { line: 1, column: 11, offset: 10 }
            }
          },
          {
            type: 'link',
            url: 'https://example.com',
            children: [
              {
                type: 'text',
                value: 'test link',
                position: {
                  start: { line: 1, column: 12, offset: 11 },
                  end: { line: 1, column: 21, offset: 20 }
                }
              }
            ],
            position: {
              start: { line: 1, column: 11, offset: 10 },
              end: { line: 1, column: 45, offset: 44 }
            }
          },
          {
            type: 'text',
            value: ' in markdown.',
            position: {
              start: { line: 1, column: 45, offset: 44 },
              end: { line: 1, column: 58, offset: 57 }
            }
          }
        ],
        position: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 58, offset: 57 }
        }
      }
    ],
    position: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 58, offset: 57 }
    }
  }

  const mockMarks: ClozeNote[] = [
    {
      id: 1,
      textId: 1,
      userId: 1,
      originalText: 'test link',
      parsedSegments: '[]',
      clozeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startPosition: 11,
      endPosition: 20
    }
  ]

  const handleContentChange = (newMarkdown: string) => {
    console.log('Content changed:', newMarkdown)
    setMarkdown(newMarkdown)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode('styled')}
          className={`px-4 py-2 rounded ${mode === 'styled' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          Styled Mode
        </button>
        <button
          onClick={() => setMode('literal')}
          className={`px-4 py-2 rounded ${mode === 'literal' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          Literal Mode
        </button>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Editable Content</h3>
        <EditableContent
          mode={mode}
          markdown={markdown}
          ast={mode === 'styled' ? mockAST : undefined}
          marks={mockMarks}
          editableRange={{ start: 0, end: markdown.length }}
          onContentChange={handleContentChange}
        />
      </div>

      <div className="mt-4 p-4 bg-muted rounded-lg">
        <h4 className="font-semibold mb-2">Current Markdown:</h4>
        <pre className="text-sm">{markdown}</pre>
      </div>
    </div>
  )
}
