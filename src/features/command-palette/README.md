# Command Palette

Keyboard-first command execution system with typed, JSON-serializable configuration and extensible handler architecture.

## Architecture

### Core Concepts

- **CommandConfig**: JSON-serializable configuration. Can be loaded from API, file, or hardcoded.
- **Command**: Runtime version with bound handlers and context.
- **HandlerContext**: Dependency injection container for handler execution (toast, analytics, API, etc.).
- **HandlerFactory**: Maps handler config to executable function.

### Service Layer

#### ToastService
Responsible for user notifications.
- Location: `src/services/toast.ts`
- Interface: `ToastService { show(message, duration?) }`
- Implementation: Can be React Toast, custom, or headless for testing.

#### Handler Registry
Extensible handler system for different command execution types.
- Location: `src/features/command-palette/hydrate.ts`
- Supports: `'toast'`, future: `'api'`, `'dialog'`, `'navigation'`, etc.
- Extension: Use `registerHandler(type, factory)` to add custom handlers.

## Usage

### 1. Define Commands

\`\`\`typescript
// src/features/command-palette/commands.ts
import type { CommandConfig } from './types'

const myCommands: CommandConfig[] = [
  {
    id: 'save',
    title: 'Save File',
    keywords: ['save', 'file', 'write'],
    shortcut: 'Cmd+S',
    description: 'Save the current file',
    handler: { 
      type: 'toast', 
      message: 'File saved!',
      duration: 2000 
    },
  },
]
\`\`\`

### 2. Hydrate Commands

\`\`\`typescript
import { hydrateCommands } from './hydrate'
import { EXAMPLE_COMMANDS } from './commands'

const toastService = useToast() // From your toast service

const commands = hydrateCommands(EXAMPLE_COMMANDS, {
  toast: toastService,
})

// commands[0].handler() -> executes the toast handler
\`\`\`

### 3. Register Custom Handlers

\`\`\`typescript
import { registerHandler } from './hydrate'

// Before hydrating commands
registerHandler('api', (config, context) => {
  if (config.type !== 'api') throw new Error('Invalid config')
  
  return () => {
    fetch(config.endpoint, { method: config.method })
      .then(() => context.toast.show('Success'))
      .catch(err => context.toast.show(\`Error: \${err.message}\`))
  }
})

// Now commands can use: handler: { type: 'api', endpoint: '/api/save', method: 'POST' }
\`\`\`

## Separation of Concerns

### Service Layer (\`src/services/\`)
- **toast.ts**: Toast notification service only
- Responsibility: Show/hide messages
- No business logic, no command knowledge

### Feature Layer (\`src/features/command-palette/\`)
- **types.ts**: All interfaces (CommandConfig, Command, HandlerConfig, etc.)
- **hydrate.ts**: Command instantiation and handler binding
- **commands.ts**: Command definitions and examples
- Responsibility: Command execution orchestration

### Handler Factories
- Pure functions: \`(config, context) => () => void\`
- No side effects except within the returned function
- Fully testable in isolation
- Can be registered at runtime

## Extending the System

### Adding a New Handler Type

1. Update \`HandlerConfig\` union in \`types.ts\`:
\`\`\`typescript
export type HandlerConfig = 
  | { type: 'toast'; message: string; duration?: number }
  | { type: 'custom'; customProp: string } // NEW
\`\`\`

2. Register factory in your app setup:
\`\`\`typescript
registerHandler('custom', (config, context) => {
  if (config.type !== 'custom') throw new Error('Invalid config')
  return () => {
    // Handle custom logic using config.customProp
  }
})
\`\`\`

3. Use in commands:
\`\`\`typescript
{
  id: 'my-command',
  title: 'My Command',
  keywords: ['my'],
  handler: { type: 'custom', customProp: 'value' },
}
\`\`\`

### Adding a New Service to Context

1. Update \`HandlerContext\` in \`types.ts\`:
\`\`\`typescript
export interface HandlerContext {
  toast: ToastService
  analytics?: AnalyticsService // NEW
  logger?: LoggerService        // NEW
}
\`\`\`

2. Handlers can now access the new service:
\`\`\`typescript
registerHandler('tracked', (config, context) => {
  return () => {
    context.analytics?.track('command_executed', { id: config.id })
  }
})
\`\`\`

## Testing

\`\`\`typescript
// test: Command hydration with mock context
const mockToast = { show: vi.fn() }
const commands = hydrateCommands(EXAMPLE_COMMANDS, { toast: mockToast })
commands[0].handler()
expect(mockToast.show).toHaveBeenCalled()

// test: Custom handler registration
registerHandler('test', (config, context) => {
  return () => context.toast.show('test')
})
// Verify command uses custom handler
\`\`\`

## Files

\`\`\`
src/features/command-palette/
├── README.md           (this file)
├── types.ts            (interfaces)
├── hydrate.ts          (handler factory + registry)
└── commands.ts         (example commands)

src/services/
└── toast.ts            (toast service implementation)
\`\`\`
