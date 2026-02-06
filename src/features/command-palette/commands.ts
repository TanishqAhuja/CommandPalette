import type { CommandConfig } from './types'

/**
 * Example command configurations.
 * These are JSON-serializable and can be loaded from an API or config file.
 */
export const EXAMPLE_COMMANDS: CommandConfig[] = [
  {
    id: 'cmd.palette.open',
    title: 'Toggle Command Palette',
    keywords: ['command', 'palette', 'open'],
    shortcut: 'Cmd+K',
    description: 'Open or close the command palette',
    handlerConfig: { type: 'toast', message: 'Opening command palette...' },
  },
  {
    id: 'file.new',
    title: 'New File',
    keywords: ['new', 'file', 'create'],
    shortcut: 'Cmd+N',
    description: 'Create a new file',
    handlerConfig: { type: 'toast', message: 'Creating new file...' },
  },
  {
    id: 'file.open',
    title: 'Open File',
    keywords: ['open', 'file'],
    shortcut: 'Cmd+O',
    description: 'Open file dialog',
    handlerConfig: { type: 'toast', message: 'Opening file dialog...' },
  },
  {
    id: 'editor.format',
    title: 'Format Document',
    keywords: ['format', 'document', 'prettier'],
    shortcut: 'Shift+Alt+F',
    description: 'Format the current document using Prettier',
    handlerConfig: { type: 'toast', message: 'Formatting document...' },
  },
  {
    id: 'editor.search',
    title: 'Find in Files',
    keywords: ['search', 'find', 'grep'],
    shortcut: 'Cmd+Shift+F',
    description: 'Search across all files',
    handlerConfig: { type: 'toast', message: 'Opening find in files...' },
  },
  {
    id: 'git.commit',
    title: 'Git: Commit',
    keywords: ['git', 'commit', 'save'],
    description: 'Stage and commit changes',
    handlerConfig: { type: 'toast', message: 'Committing changes...' },
  },
  {
    id: 'git.push',
    title: 'Git: Push',
    keywords: ['git', 'push', 'upload'],
    shortcut: 'Cmd+Shift+P',
    description: 'Push commits to remote',
    handlerConfig: { type: 'toast', message: 'Pushing to remote...' },
  },
]
