'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import toast from 'react-hot-toast'
import { sendMagicLink } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      await sendMagicLink(email)
      setEmailSent(true)
      toast.success('Magic link sent to your email!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send magic link')
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render if user is already logged in
  if (user) {
    return null
  }

  if (emailSent) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Check your email!</h2>
          <p className="text-gray-600 mb-6">
            We've sent a magic link to <strong>{email}</strong>. 
            Click the link in the email to log in.
          </p>
          <button
            onClick={() => {
              setEmailSent(false)
              setEmail('')
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Try a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Welcome to Lissner Family Photos
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
              placeholder="Enter your email"
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
        
        <p className="text-xs text-gray-500 text-center mt-6">
          Only family members with approved email addresses can access this site.
        </p>
      </div>
    </div>
  )
} 