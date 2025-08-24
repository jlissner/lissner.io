import { expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Extend Vitest's expect with Testing Library matchers
import '@testing-library/jest-dom/vitest'

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: vi.fn(),
  },
  writable: true,
})

// Mock File API
global.File = class MockFile {
  name: string
  type: string
  size: number

  constructor(fileParts: any[], fileName: string, options: any = {}) {
    this.name = fileName
    this.type = options.type || ''
    this.size = fileParts.reduce((acc, part) => acc + part.length, 0)
  }
} as any
