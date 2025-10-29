import { ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
}

function LoadingAuth() {
    return (
      <div data-loading>
        <div data-loading="true"></div>
      </div>
    )
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login')
    } else if (!isLoading && user && requireAdmin && !user.isAdmin) {
      navigate('/')
    }
  }, [user, isLoading, navigate, requireAdmin])

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingAuth />
  }

  // If not authenticated, don't render anything (will redirect)
  if (!user) {
    return null
  }

  // If admin required but user is not admin, don't render
  if (requireAdmin && !user.isAdmin) {
    return null
  }

  return <>{children}</>
}
