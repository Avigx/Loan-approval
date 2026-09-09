import { useState, useEffect } from 'react';
import { getDocumentStats } from '../api/documents';
import { FileText, Upload, CheckCircle, XCircle, FolderOpen } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="card p-4">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-md flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-semibold text-slate-900 mt-0.5">{value?.toLocaleString() ?? '—'}</p>
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
      <div>
        <PageHeader
          title="Dashboard"
          description="Overview of your document management system"
          breadcrumbs={[{ label: 'Home' }, { label: 'Dashboard' }]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md skeleton" />
                <div className="space-y-2">
                  <div className="w-20 h-3 skeleton" />
                  <div className="w-12 h-5 skeleton" />
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
      accent: 'bg-primary-700',
    },
    {
      icon: Upload,
      label: 'Upload Batches',
      value: stats?.totalBatches || 0,
      accent: 'bg-slate-700',
    },
    {
      icon: CheckCircle,
      label: 'Successful Uploads',
      value: stats?.successfulRows || 0,
      accent: 'bg-emerald-600',
    },
    {
      icon: XCircle,
      label: 'Failed Uploads',
      value: stats?.failedRows || 0,
      accent: 'bg-red-600',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your document management system"
        breadcrumbs={[{ label: 'Home' }, { label: 'Dashboard' }]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* Folder-wise Document Count */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-slate-900">Documents by Folder</h2>
        </div>

        {stats?.folderCounts?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {stats.folderCounts.map((folder) => (
              <div
                key={folder._id}
                className="flex items-center justify-between p-2.5 rounded-md bg-slate-50 border border-slate-200"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{folder.displayLabel || folder._id}</p>
                  <p className="text-[10px] text-slate-400">{folder._id}</p>
                </div>
                <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0">
                  {folder.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No documents yet</p>
            <p className="text-xs mt-0.5">Documents will appear here after uploading</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
