import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import toast from 'react-hot-toast'
import { sendMagicLink } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

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
      <div className="container" style={{ maxWidth: '28rem', marginTop: '4rem' }}>
        <article style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--green-600)' }}>✓</div>
          <h2>Check your email!</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We've sent a magic link to <strong>{email}</strong>. 
            Click the link in the email to log in.
          </p>
          <button
            data-variant="secondary"
            onClick={() => {
              setEmailSent(false)
              setEmail('')
            }}
          >
            Try a different email
          </button>
        </article>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '28rem', marginTop: '4rem' }}>
      <article>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          Welcome to Lissner Family Photos
        </h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !email}
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
        
        <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', textAlign: 'center', marginTop: '1.5rem' }}>
          Only family members with approved email addresses can access this site.
        </p>
      </article>
    </div>
  )
}
