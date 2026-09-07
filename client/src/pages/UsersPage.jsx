import { useState, useEffect, useMemo } from 'react';
import { listUsers, listClients, createUser, updateUser } from '../api/users';
import { useAuth } from '../context/AuthContext';
import {
  Users as UsersIcon,
  Plus,
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Building2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Loader2,
  Edit3,
  UserCheck,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { value: 'CLIENT_ADMIN', label: 'Client Admin', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'CUSTOMER', label: 'Customer', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
];

const PERMISSIONS = [
  { value: 'VIEW_DOWNLOAD', label: 'View & Download', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'VIEW_ONLY', label: 'View Only', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'DOWNLOAD_DISABLED', label: 'Download Disabled', color: 'bg-red-50 text-red-700 border-red-200' },
];

const UsersPage = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [permissionFilter, setPermissionFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'CUSTOMER',
    permission: 'VIEW_ONLY',
    clientId: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, clientsRes] = await Promise.all([
        listUsers(),
        listClients().catch(() => ({ data: { clients: [] } })),
      ]);
      setUsers(usersRes.data.users || []);
      setClients(clientsRes.data.clients || []);
    } catch (err) {
      toast.error('Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: users.length,
      superAdmins: users.filter((u) => u.role === 'SUPER_ADMIN').length,
      clientAdmins: users.filter((u) => u.role === 'CLIENT_ADMIN').length,
      customers: users.filter((u) => u.role === 'CUSTOMER').length,
      active: users.filter((u) => u.active).length,
      inactive: users.filter((u) => !u.active).length,
    };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.clientId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.clientId?.code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesPermission = permissionFilter === 'ALL' || u.permission === permissionFilter;

      return matchesSearch && matchesRole && matchesPermission;
    });
  }, [users, searchQuery, roleFilter, permissionFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUser({
        ...newUser,
        clientId: newUser.clientId ? newUser.clientId : null,
      });
      toast.success('User account created successfully');
      setShowAddModal(false);
      setNewUser({
        fullName: '',
        email: '',
        password: '',
        role: 'CUSTOMER',
        permission: 'VIEW_ONLY',
        clientId: '',
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUserField = async (userId, data, successMessage) => {
    try {
      await updateUser(userId, data);
      toast.success(successMessage || 'Updated successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleSaveEditModal = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateUser(editingUser._id, {
        fullName: editingUser.fullName,
        role: editingUser.role,
        permission: editingUser.permission,
        clientId: editingUser.clientId || null,
        active: editingUser.active,
      });
      toast.success(`Updated access for ${editingUser.fullName}`);
      setEditingUser(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save access changes');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-surface-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <p className="text-sm font-medium">Loading user access directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-surface-900">User & Access Governance</h1>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                Super Admin Access
              </span>
            )}
          </div>
          <p className="text-surface-500 text-sm mt-1">
            Review registered individuals, authorize accounts, assign roles, and configure document access permissions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Total People</span>
            <UsersIcon className="w-4 h-4 text-surface-400" />
          </div>
          <div className="text-2xl font-bold text-surface-900 mt-2">{stats.total}</div>
          <div className="text-xs text-surface-400 mt-1">{stats.active} active accounts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-600 uppercase tracking-wider">Super Admins</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2">{stats.superAdmins}</div>
          <div className="text-xs text-surface-400 mt-1">Full system governance</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Client Admins</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-2">{stats.clientAdmins}</div>
          <div className="text-xs text-surface-400 mt-1">Tenant managers</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Customers / Users</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{stats.customers}</div>
          <div className="text-xs text-surface-400 mt-1">End users & recipients</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-surface-500 font-medium">
            <Filter className="w-3.5 h-3.5" /> Filter by:
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-surface-200 rounded-lg px-2.5 py-2 bg-white text-surface-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          >
            <option value="ALL">All Roles ({stats.total})</option>
            <option value="SUPER_ADMIN">Super Admins ({stats.superAdmins})</option>
            <option value="CLIENT_ADMIN">Client Admins ({stats.clientAdmins})</option>
            <option value="CUSTOMER">Customers ({stats.customers})</option>
          </select>

          <select
            value={permissionFilter}
            onChange={(e) => setPermissionFilter(e.target.value)}
            className="text-xs border border-surface-200 rounded-lg px-2.5 py-2 bg-white text-surface-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          >
            <option value="ALL">All Permissions</option>
            <option value="VIEW_DOWNLOAD">View & Download</option>
            <option value="VIEW_ONLY">View Only</option>
            <option value="DOWNLOAD_DISABLED">Download Disabled</option>
          </select>

          {(searchQuery || roleFilter !== 'ALL' || permissionFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setPermissionFilter('ALL');
              }}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-50 border-b border-surface-200 text-xs font-semibold text-surface-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Document Permission</th>
                <th className="px-5 py-3.5">Client / Organization</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-sm">
              {filteredUsers.map((u) => {
                const isCurrent = u._id === currentUser?.id;
                const canModify = isSuperAdmin || (currentUser?.role === 'CLIENT_ADMIN' && u.role === 'CUSTOMER');

                return (
                  <tr key={u._id} className="hover:bg-surface-50/80 transition-colors">
                    {/* User Info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                          {u.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-surface-900 flex items-center gap-2">
                            <span>{u.fullName}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-100 text-surface-500 font-normal">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-surface-500 text-xs truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role Dropdown / Badge */}
                    <td className="px-5 py-4">
                      {canModify ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUserField(u._id, { role: e.target.value }, `Role updated for ${u.fullName}`)}
                          className="text-xs font-medium border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white text-surface-800 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm cursor-pointer"
                          disabled={!isSuperAdmin && u.role === 'SUPER_ADMIN'}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-100 text-surface-700">
                          {u.role?.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>

                    {/* Permission Dropdown / Badge */}
                    <td className="px-5 py-4">
                      {canModify ? (
                        <select
                          value={u.permission}
                          onChange={(e) => handleUpdateUserField(u._id, { permission: e.target.value }, `Permission updated for ${u.fullName}`)}
                          className="text-xs font-medium border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white text-surface-800 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm cursor-pointer"
                        >
                          {PERMISSIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-100 text-surface-700">
                          {u.permission?.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>

                    {/* Client / Organization */}
                    <td className="px-5 py-4">
                      {isSuperAdmin ? (
                        <select
                          value={u.clientId?._id || u.clientId || ''}
                          onChange={(e) => handleUpdateUserField(u._id, { clientId: e.target.value || null }, `Client assigned for ${u.fullName}`)}
                          className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white text-surface-700 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm cursor-pointer max-w-[160px] truncate"
                        >
                          <option value="">Global / No Client</option>
                          {clients.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-surface-700 font-medium">
                          {u.clientId?.name ? `${u.clientId.name} (${u.clientId.code})` : '—'}
                        </span>
                      )}
                    </td>

                    {/* Active Toggle */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleUpdateUserField(u._id, { active: !u.active }, u.active ? 'Account deactivated' : 'Account activated')}
                        disabled={isCurrent}
                        title={isCurrent ? 'You cannot deactivate your own account' : u.active ? 'Click to deactivate' : 'Click to activate'}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                          u.active ? 'bg-emerald-500' : 'bg-surface-300'
                        } ${isCurrent ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                            u.active ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      {canModify && (
                        <button
                          onClick={() =>
                            setEditingUser({
                              _id: u._id,
                              fullName: u.fullName,
                              email: u.email,
                              role: u.role,
                              permission: u.permission,
                              clientId: u.clientId?._id || u.clientId || '',
                              active: u.active,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-surface-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Access
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-16 text-center text-surface-400">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-surface-700">No users match the criteria</p>
            <p className="text-xs text-surface-400 mt-1">Try changing your search query or reset filters.</p>
          </div>
        )}
      </div>

      {/* Edit Access Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-surface-900">Manage Access & Role</h3>
                <p className="text-xs text-surface-500">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary-500" />
                  System Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  disabled={!isSuperAdmin && editingUser.role === 'SUPER_ADMIN'}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-surface-400 mt-1">
                  Super Admin can manage everything. Client Admin manages designated clients. Customers have read access.
                </p>
              </div>

              {/* Permission Selection */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-primary-500" />
                  Document Permission
                </label>
                <select
                  value={editingUser.permission}
                  onChange={(e) => setEditingUser({ ...editingUser, permission: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  {PERMISSIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Organization (Only Super Admin can reassign) */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary-500" />
                    Assigned Client Organization
                  </label>
                  <select
                    value={editingUser.clientId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="">Global / No Client</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 border border-surface-200">
                <div>
                  <div className="text-xs font-semibold text-surface-800">Account Status</div>
                  <div className="text-[11px] text-surface-500">
                    {editingUser.active ? 'User can log in and access system' : 'User is blocked from logging in'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser({ ...editingUser, active: !editingUser.active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editingUser.active ? 'bg-emerald-500' : 'bg-surface-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      editingUser.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm shadow-md">
                  Save Access Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-surface-900">Add New User</h3>
                <p className="text-xs text-surface-500">Pre-authorize and configure a new account</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alice Smith"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="alice@company.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Permission</label>
                  <select
                    value={newUser.permission}
                    onChange={(e) => setNewUser({ ...newUser, permission: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                  >
                    {PERMISSIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Assign Client</label>
                  <select
                    value={newUser.clientId}
                    onChange={(e) => setNewUser({ ...newUser, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                  >
                    <option value="">Global / No Client</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm shadow-md">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
