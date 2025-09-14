'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyMagicLink } from '@/ui/lib/api'
import { useAuth } from '@/ui/lib/auth-context'
import toast from 'react-hot-toast'

export default function AuthCallbackPage() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [hasVerified, setHasVerified] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    // Prevent multiple verification attempts
    if (hasVerified) return

    const token = searchParams.get('token')
    
    if (!token) {
      toast.error('Invalid magic link')
      router.push('/login')
      return
    }

    setHasVerified(true)

    verifyMagicLink(token)
      .then((response) => {
        login(response.user, response.token)
        router.push('/')
      })
      .catch((error) => {
        toast.error(error.message || 'Invalid or expired magic link')
        router.push('/login')
      })
      .finally(() => {
        setIsVerifying(false)
      })
  }, [searchParams, router, login, hasVerified])

  if (isVerifying) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying...</h2>
          <p className="text-gray-600">Please wait while we log you in.</p>
        </div>
      </div>
    )
  }

  return null
} 