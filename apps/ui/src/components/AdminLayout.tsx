import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { userTokenAtom } from "../state/userAtom";

const navItems = [
  { path: "/", label: "Home", icon: "🏠" },
  { path: "/admin/users", label: "Users", icon: "👥" },
  { path: "/admin/files", label: "Files", icon: "📁" },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setUserToken] = useAtom(userTokenAtom);

  const handleLogout = () => {
    setUserToken(undefined);
    navigate("/login");
  };

  return (
    <div className="flex h-screen">
      {/* Side Navigation */}
      <nav className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold" style={{ color: "var(--grey-dark)" }}>
            Admin
          </h1>
        </div>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? "bg-gray-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
          <li>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-50 w-full text-left"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
} 