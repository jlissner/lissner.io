import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyMagicLink } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import toast from 'react-hot-toast'

export default function AuthCallback() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [hasVerified, setHasVerified] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    // Prevent multiple verification attempts
    if (hasVerified) return

    const token = searchParams.get('token')
    
    if (!token) {
      toast.error('Invalid magic link')
      navigate('/login')
      return
    }

    setHasVerified(true)

    verifyMagicLink(token)
      .then((response) => {
        login(response.user, response.token)
        navigate('/')
      })
      .catch((error) => {
        toast.error(error.message || 'Invalid or expired magic link')
        navigate('/login')
      })
      .finally(() => {
        setIsVerifying(false)
      })
  }, [searchParams, navigate, login, hasVerified])

  if (isVerifying) {
    return (
      <div className="container" style={{ maxWidth: '28rem', marginTop: '4rem' }}>
        <article style={{ textAlign: 'center' }}>
          <div data-loading="true" style={{ marginBottom: '1rem' }}></div>
          <h2>Verifying...</h2>
          <p>Please wait while we log you in.</p>
        </article>
      </div>
    )
  }

  return null
}
