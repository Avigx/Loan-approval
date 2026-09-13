import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Search,
  Upload,
  Users,
  Clock,
  LogOut,
  FileText,
  Shield,
  FolderOpen,
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const workspaceItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/search', icon: Search, label: 'Documents' },
    ...(isAdmin
      ? [{ to: '/bulk-upload', icon: Upload, label: 'Bulk Upload' }]
      : []),
  ];

  const adminItems = isAdmin
    ? [
        { to: '/users', icon: Users, label: 'Users' },
        { to: '/history', icon: Clock, label: 'History & Logs' },
        ...(isSuperAdmin
          ? [{ to: '/folders', icon: FolderOpen, label: 'Folders' }]
          : []),
      ]
    : [];

  const renderNavItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        isActive ? 'nav-link-active' : 'nav-link'
      }
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-slate-900 flex flex-col z-50 border-r border-slate-800">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary-700 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">LEGAL DMS</h1>
            <p className="text-slate-500 text-[10px] tracking-wide">Document Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {/* Workspace section */}
        <div>
          <div className="nav-section-label">Workspace</div>
          <div className="space-y-0.5">
            {workspaceItems.map(renderNavItem)}
          </div>
        </div>

        {/* Administration section */}
        {adminItems.length > 0 && (
          <div>
            <div className="nav-section-label">Administration</div>
            <div className="space-y-0.5">
              {adminItems.map(renderNavItem)}
            </div>
          </div>
        )}
      </nav>

      {/* User Info + Logout */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-md bg-primary-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-medium truncate">{user?.fullName}</p>
            <div className="flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-slate-500" />
              <p className="text-slate-500 text-[10px]">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150 text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
