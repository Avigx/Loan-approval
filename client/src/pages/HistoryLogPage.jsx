import { useState, useEffect } from 'react';
import { listAuditLogs } from '../api/auditLog';
import { Clock, Filter, Loader2, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';

const ACTION_TYPES = [
  'login', 'upload', 'view', 'download', 'search', 'delete',
  'create_user', 'edit_permission', 'edit_role',
  'activate_user', 'deactivate_user',
];

const ACTION_COLORS = {
  login: 'bg-blue-50 text-blue-700 border-blue-200',
  upload: 'bg-violet-50 text-violet-700 border-violet-200',
  view: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  download: 'bg-amber-50 text-amber-700 border-amber-200',
  search: 'bg-slate-100 text-slate-600 border-slate-200',
  delete: 'bg-red-50 text-red-700 border-red-200',
  create_user: 'bg-teal-50 text-teal-700 border-teal-200',
  edit_permission: 'bg-orange-50 text-orange-700 border-orange-200',
  edit_role: 'bg-pink-50 text-pink-700 border-pink-200',
  activate_user: 'bg-green-50 text-green-700 border-green-200',
  deactivate_user: 'bg-red-50 text-red-700 border-red-200',
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
    <div>
      <PageHeader
        title="History & Logs"
        description="Complete audit trail of all system actions"
        breadcrumbs={[{ label: 'Home' }, { label: 'History & Logs' }]}
      />

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Action Type</label>
            <select
              className="input w-44"
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
              className="input w-40"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Date To</label>
            <input
              type="date"
              className="input w-40"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
          <button onClick={handleFilter} className="btn-primary flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-14 text-center">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-14 text-center text-slate-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-slate-600">No logs found</p>
            <p className="text-xs mt-0.5">Activity will appear here as actions are performed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="table-header">Action</th>
                  <th className="table-header">User</th>
                  <th className="table-header">Entity</th>
                  <th className="table-header">Details</th>
                  <th className="table-header text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="table-cell">
                      <span className={`badge border ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="table-cell text-xs font-medium text-slate-700">
                      {log.userId?.fullName || 'System'}
                    </td>
                    <td className="table-cell text-xs text-slate-500">
                      {log.entityType || '—'}
                    </td>
                    <td className="table-cell text-xs text-slate-500 max-w-[240px]">
                      <span className="truncate block" title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}>
                        {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : log.details) : '—'}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-slate-500 text-right whitespace-nowrap">
                      <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn-secondary text-xs py-1 px-2.5 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-secondary text-xs py-1 px-2.5 disabled:opacity-50"
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
