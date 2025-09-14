'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PhotoGrid from '@/ui/components/PhotoGrid'
import UploadButton from '@/ui/components/UploadButton'
import { useAuth } from '@/ui/lib/auth-context'

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
      ))}
    </div>
  )
}

function LoadingAuth() {
  return (
    <div className="flex justify-center items-center min-h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingAuth />
  }

  // If not authenticated, don't render anything (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lissner Family Photos</h1>
          <p className="text-gray-600 mt-2">Welcome to our family photo collection</p>
        </div>
        <UploadButton />
      </div>
      
      <Suspense fallback={<LoadingSkeleton />}>
        <PhotoGrid />
      </Suspense>
    </div>
  )
} 