import { useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface FolderNode {
  folder: {
    id: string
    name: string
    parentId: string | null
  }
  children: FolderNode[]
}

interface FolderSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  folders: FolderNode[]
}

function flattenFolders(
  nodes: FolderNode[],
  depth: number = 0,
  result: Array<{ id: string; name: string; depth: number }> = []
): Array<{ id: string; name: string; depth: number }> {
  for (const node of nodes) {
    result.push({
      id: node.folder.id,
      name: node.folder.name,
      depth
    })

    if (node.children.length > 0) {
      flattenFolders(node.children, depth + 1, result)
    }
  }

  return result
}

export function FolderSelect({ value, onChange, folders }: FolderSelectProps) {
  const flatFolders = useMemo(() => flattenFolders(folders), [folders])

  // Find the selected folder to display its name
  const selectedFolder = flatFolders.find(f => f.id === value)
  const displayValue = value === null
    ? '(Root - No folder)'
    : selectedFolder
      ? `${'  '.repeat(selectedFolder.depth)}${'→'.repeat(selectedFolder.depth)}${selectedFolder.depth > 0 ? ' ' : ''}${selectedFolder.name}`
      : 'Select a folder...'

  return (
    <Select
      value={value || 'root'}
      onValueChange={(val) => onChange(val === 'root' ? null : val)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a folder...">
          {displayValue}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-y-auto">
        <SelectItem value="root">(Root - No folder)</SelectItem>
        {flatFolders.map((folder) => (
          <SelectItem key={folder.id} value={folder.id}>
            {'  '.repeat(folder.depth)}
            {'→'.repeat(folder.depth)}
            {folder.depth > 0 && ' '}
            {folder.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
