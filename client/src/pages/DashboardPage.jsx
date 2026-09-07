import { useState, useEffect } from 'react';
import { getDocumentStats } from '../api/documents';
import { FileText, Upload, CheckCircle, XCircle, FolderOpen, TrendingUp } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, gradient, iconBg }) => (
  <div className="card p-6 relative overflow-hidden group">
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-surface-500 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-surface-900 mt-0.5">{value?.toLocaleString() ?? '—'}</p>
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocumentStats()
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-200" />
                <div className="space-y-2">
                  <div className="w-20 h-3 bg-surface-200 rounded" />
                  <div className="w-12 h-6 bg-surface-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: FileText,
      label: 'Total Documents',
      value: stats?.totalDocuments || 0,
      gradient: 'from-primary-500 to-primary-700',
      iconBg: 'bg-gradient-to-br from-primary-500 to-primary-700',
    },
    {
      icon: Upload,
      label: 'Upload Batches',
      value: stats?.totalBatches || 0,
      gradient: 'from-violet-500 to-violet-700',
      iconBg: 'bg-gradient-to-br from-violet-500 to-violet-700',
    },
    {
      icon: CheckCircle,
      label: 'Successful Rows',
      value: stats?.successfulRows || 0,
      gradient: 'from-emerald-500 to-emerald-700',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    },
    {
      icon: XCircle,
      label: 'Failed Rows',
      value: stats?.failedRows || 0,
      gradient: 'from-red-500 to-red-700',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
          <p className="text-surface-500 text-sm mt-1">Overview of your document management system</p>
        </div>
        <div className="flex items-center gap-2 text-surface-500 text-sm">
          <TrendingUp className="w-4 h-4" />
          <span>Real-time data</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* Folder-wise Document Count */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-surface-900">Folder-wise Document Count</h2>
        </div>

        {stats?.folderCounts?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {stats.folderCounts.map((folder) => (
              <div
                key={folder._id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-50 border border-surface-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all duration-200"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-700 truncate">{folder.displayLabel || folder._id}</p>
                  <p className="text-xs text-surface-400">{folder._id}</p>
                </div>
                <span className="ml-3 bg-primary-100 text-primary-700 text-sm font-bold px-2.5 py-1 rounded-lg">
                  {folder.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-surface-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No documents yet</p>
            <p className="text-sm mt-1">Documents will appear here after uploading</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
