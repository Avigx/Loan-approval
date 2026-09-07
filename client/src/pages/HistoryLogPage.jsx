import { useState, useEffect } from 'react';
import { listAuditLogs } from '../api/auditLog';
import { Clock, Filter, Loader2, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const ACTION_TYPES = [
  'login', 'upload', 'view', 'download', 'search',
  'create_user', 'edit_permission', 'edit_role',
  'activate_user', 'deactivate_user',
];

const ACTION_COLORS = {
  login: 'bg-blue-100 text-blue-700',
  upload: 'bg-violet-100 text-violet-700',
  view: 'bg-emerald-100 text-emerald-700',
  download: 'bg-amber-100 text-amber-700',
  search: 'bg-primary-100 text-primary-700',
  create_user: 'bg-teal-100 text-teal-700',
  edit_permission: 'bg-orange-100 text-orange-700',
  edit_role: 'bg-pink-100 text-pink-700',
  activate_user: 'bg-green-100 text-green-700',
  deactivate_user: 'bg-red-100 text-red-700',
};

const HistoryLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    dateFrom: '',
    dateTo: '',
    page: '1',
  });

  const loadLogs = async (params = filters) => {
    setLoading(true);
    try {
      const cleanParams = {};
      Object.entries(params).forEach(([k, v]) => { if (v) cleanParams[k] = v; });
      const { data } = await listAuditLogs(cleanParams);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const handleFilter = () => {
    loadLogs({ ...filters, page: '1' });
  };

  const handlePageChange = (page) => {
    const newFilters = { ...filters, page: String(page) };
    setFilters(newFilters);
    loadLogs(newFilters);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">History & Logs</h1>
        <p className="text-surface-500 text-sm mt-1">Audit trail of all system actions</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Action Type</label>
            <select
              className="input w-48"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            >
              <option value="">All actions</option>
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date From</label>
            <input
              type="date"
              className="input w-44"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Date To</label>
            <input
              type="date"
              className="input w-44"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
          <button onClick={handleFilter} className="btn-primary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-surface-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No logs found</p>
            <p className="text-sm mt-1">Activity will appear here as actions are performed</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {logs.map((log) => (
              <div key={log._id} className="px-6 py-4 hover:bg-surface-50 transition-colors flex items-center gap-4">
                <div className="flex-shrink-0">
                  <Clock className="w-4 h-4 text-surface-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${ACTION_COLORS[log.action] || 'bg-surface-100 text-surface-700'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-surface-700">
                      by <span className="font-medium">{log.userId?.fullName || 'System'}</span>
                    </span>
                    {log.entityType && (
                      <span className="text-xs text-surface-400">
                        on {log.entityType}
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <p className="text-xs text-surface-400 mt-1 truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </p>
                  )}
                </div>
                <div className="text-xs text-surface-400 text-right flex-shrink-0">
                  <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                  <p>{new Date(log.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-surface-200 flex items-center justify-between">
            <p className="text-sm text-surface-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryLogPage;
