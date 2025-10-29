import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Lissner Family Photos
            </Link>
            <Link 
              href="/login" 
              className="btn-primary"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Lissner Family Photos
          </Link>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              Welcome, {user.email}
            </span>
            
            {user.isAdmin && (
              <Link 
                href="/admin" 
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Admin
              </Link>
            )}
            
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 