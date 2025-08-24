import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

// Mock auth context
const mockAuthContext = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    isAdmin: false,
  },
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
}

// Create a wrapper component that provides all necessary contexts
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Helper to create mock files
export const createMockFile = (
  name: string,
  type: string = 'image/jpeg',
  size: number = 1024
): File => {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Helper to create mock FileList
export const createMockFileList = (files: File[]): FileList => {
  const fileList = {
    ...files,
    length: files.length,
    item: (index: number) => files[index] || null,
  }
  return fileList as FileList
}

// Mock auth hook
export const mockUseAuth = () => mockAuthContext

// Helper to wait for async operations
export const waitFor = async (callback: () => void | Promise<void>, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('Timeout')), timeout)
    const check = async () => {
      try {
        await callback()
        clearTimeout(timeoutId)
        resolve(undefined)
      } catch (error) {
        setTimeout(check, 10)
      }
    }
    check()
  })
}
