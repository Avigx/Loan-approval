import { useState, useEffect } from 'react';
import { searchDocuments, downloadDocument, deleteDocument, downloadBulkDocuments } from '../api/documents';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Search, RotateCcw, Eye, Download, DownloadCloud, FileText, Loader2,
  Trash2, ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import ConfirmModal from '../components/common/ConfirmModal';
import CopyButton from '../components/common/CopyButton';

const SearchPage = () => {
  const { canDownload, isAdmin } = useAuth();
  const [quickSearch, setQuickSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: '',
    uniqueRef: '',
    customerName: '',
    trackingNumber: '',
    folderCode: '',
    noticeType: '',
    dispatchFrom: '',
    dispatchTo: '',
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [viewDoc, setViewDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk download state
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Load folders for dropdown
  useEffect(() => {
    api.get('/folders').then(({ data }) => setFolders(data.folders)).catch(() => {});
  }, []);

  const handleSearch = async (e, page = 1) => {
    e?.preventDefault();
    setLoading(true);
    setCurrentPage(page);
    try {
      const params = { page: String(page), limit: '50' };

      // Quick search → loanNumber
      if (quickSearch.trim() && !showAdvanced) {
        params.loanNumber = quickSearch.trim();
      }

      // Advanced filters
      if (showAdvanced) {
        Object.entries(filters).forEach(([key, val]) => {
          if (val) params[key] = val;
        });
      }

      const { data } = await searchDocuments(params);
      setResults(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQuickSearch('');
    setFilters({
      loanNumber: '', uniqueRef: '', customerName: '',
      trackingNumber: '', folderCode: '', noticeType: '', dispatchFrom: '', dispatchTo: '',
    });
    setResults(null);
    setCurrentPage(1);
  };

  const handleDownload = async (doc) => {
    try {
      const { data } = await downloadDocument(doc._id);
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.uniqueRef}.${doc.fileType}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Download failed');
    }
  };

  const handleView = async (doc) => {
    try {
      const { data } = await api.get(`/documents/${doc._id}/view`);
      setViewDoc(data.document);
    } catch (err) {
      toast.error('Could not load document details');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget._id);
      toast.success('Document deleted successfully');
      setDeleteTarget(null);
      // Refresh search results
      handleSearch(null, currentPage);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (page) => {
    handleSearch(null, page);
  };

  const handleBulkDownload = async () => {
    if (!results?.documents?.length) return;
    setBulkDownloading(true);
    try {
      const ids = results.documents.map((doc) => doc._id);
      await downloadBulkDocuments(ids);
      toast.success('ZIP download started');
    } catch (err) {
      // When responseType is 'blob', axios wraps error JSON as a Blob — parse it
      let message = 'Unable to package documents for download';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.error) message = json.error;
        } catch (_) { /* ignore parse errors */ }
      } else if (err.response?.data?.error) {
        message = err.response.data.error;
      }
      toast.error(message);
    } finally {
      setBulkDownloading(false);
    }
  };

  const truncate = (str, len = 20) => {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
  };

  const formatNoticeType = (nt) => {
    if (!nt) return '—';
    return nt.charAt(0).toUpperCase() + nt.slice(1).toLowerCase();
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Search and manage documents across the repository"
        breadcrumbs={[{ label: 'Home' }, { label: 'Documents' }]}
      />

      {/* Primary Search */}
      <form onSubmit={handleSearch} className="mb-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="search-primary"
            type="text"
            placeholder="Search by loan number, ID, customer, tracking number…"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full pl-11 pr-32 py-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-600 transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
            >
              <Filter className="w-3 h-3" />
              Filters
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              id="search-submit"
              type="submit"
              disabled={loading}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="card p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label">Loan Number</label>
              <input
                id="search-loan-number"
                className="input"
                placeholder="e.g. L9001020228468693"
                value={filters.loanNumber}
                onChange={(e) => setFilters({ ...filters, loanNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Unique ID</label>
              <input
                className="input"
                placeholder="e.g. L900..._PRE_SALE_TRACKING"
                value={filters.uniqueRef}
                onChange={(e) => setFilters({ ...filters, uniqueRef: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Customer Name</label>
              <input
                className="input"
                placeholder="Enter customer name"
                value={filters.customerName}
                onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Folder</label>
              <select
                className="input"
                value={filters.folderCode}
                onChange={(e) => setFilters({ ...filters, folderCode: e.target.value })}
              >
                <option value="">All folders</option>
                {folders.map((f) => (
                  <option key={f._id} value={f.code}>
                    {f.displayLabel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notice Type</label>
              <select
                className="input"
                value={filters.noticeType}
                onChange={(e) => setFilters({ ...filters, noticeType: e.target.value })}
              >
                <option value="">All notice types</option>
                <option value="NOTICE">Notice</option>
                <option value="RECEIPT">Receipt</option>
                <option value="TRACKING">Tracking</option>
              </select>
            </div>
            <div>
              <label className="label">Tracking Number</label>
              <input
                className="input"
                placeholder="Enter tracking number"
                value={filters.trackingNumber}
                onChange={(e) => setFilters({ ...filters, trackingNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Dispatch From</label>
              <input
                type="date"
                className="input"
                value={filters.dispatchFrom}
                onChange={(e) => setFilters({ ...filters, dispatchFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Dispatch To</label>
              <input
                type="date"
                className="input"
                value={filters.dispatchTo}
                onChange={(e) => setFilters({ ...filters, dispatchTo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <button type="button" onClick={(e) => handleSearch(e)} className="btn-primary flex items-center gap-1.5 text-xs">
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
            <button type="button" onClick={handleReset} className="btn-ghost flex items-center gap-1.5 text-xs">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Empty state — no search yet */}
      {results === null && !loading && (
        <div className="card p-14 text-center text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-slate-600">Search your document repository</p>
          <p className="text-xs mt-1">Search by ID, loan number, customer, tracking number, or document metadata.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-14 text-center">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-primary-600" />
          <p className="text-sm text-slate-500">Searching…</p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              {results.pagination.total} document{results.pagination.total !== 1 ? 's' : ''} found
            </p>
            <div className="flex items-center gap-2">
              {canDownload && results.documents.length > 0 && (
                <button
                  id="download-all-btn"
                  onClick={handleBulkDownload}
                  disabled={bulkDownloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {bulkDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Preparing ZIP…
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-3.5 h-3.5" />
                      Download All
                    </>
                  )}
                </button>
              )}
              {results.pagination.totalPages > 1 && (
                <p className="text-xs text-slate-400">
                  Page {results.pagination.page} of {results.pagination.totalPages}
                </p>
              )}
            </div>
          </div>

          {results.documents.length === 0 ? (
            <div className="p-14 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-slate-600">No documents found</p>
              <p className="text-xs mt-1">Try adjusting your search criteria or filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="table-header">Loan #</th>
                      <th className="table-header">Unique ID</th>
                      <th className="table-header">Customer</th>
                      <th className="table-header">Folder</th>
                      <th className="table-header">Notice Type</th>
                      <th className="table-header">Dispatch</th>
                      <th className="table-header">Tracking</th>
                      <th className="table-header text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.documents.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="table-cell font-medium text-slate-900">
                          <div className="flex items-center gap-1">
                            <span title={doc.loanNumber}>{truncate(doc.loanNumber, 16)}</span>
                            <CopyButton value={doc.loanNumber} />
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono text-slate-600" title={doc.uniqueRef}>
                              {truncate(doc.uniqueRef, 18)}
                            </span>
                            <CopyButton value={doc.uniqueRef} />
                          </div>
                        </td>
                        <td className="table-cell text-xs">{truncate(doc.customerName, 18)}</td>
                        <td className="table-cell">
                          <span className="badge-info">{doc.folderId?.displayLabel || '—'}</span>
                        </td>
                        <td className="table-cell">
                          <span className="text-xs font-medium text-slate-700">
                            {formatNoticeType(doc.noticeType)}
                          </span>
                        </td>
                        <td className="table-cell text-xs">
                          {doc.dispatchDate ? new Date(doc.dispatchDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="table-cell text-xs font-mono">{truncate(doc.trackingNumber, 14)}</td>
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => handleView(doc)}
                              className="p-1.5 rounded text-slate-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                              title="View details"
                              aria-label="View document details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canDownload && (
                              <button
                                onClick={() => handleDownload(doc)}
                                className="p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Download"
                                aria-label="Download document"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setDeleteTarget(doc)}
                                className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete document"
                                aria-label="Delete document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {results.pagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Showing {((results.pagination.page - 1) * results.pagination.limit) + 1}–{Math.min(results.pagination.page * results.pagination.limit, results.pagination.total)} of {results.pagination.total}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handlePageChange(results.pagination.page - 1)}
                      disabled={results.pagination.page <= 1}
                      className="btn-secondary text-xs py-1 px-2.5 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(results.pagination.page + 1)}
                      disabled={results.pagination.page >= results.pagination.totalPages}
                      className="btn-secondary text-xs py-1 px-2.5 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete document?"
        message="You are about to permanently delete this document. This action cannot be undone."
        confirmLabel="Delete Document"
        variant="danger"
        details={deleteTarget ? [
          { label: 'Loan Number', value: deleteTarget.loanNumber },
          { label: 'Unique ID', value: deleteTarget.uniqueRef },
          { label: 'Customer', value: deleteTarget.customerName || '—' },
          { label: 'Folder', value: deleteTarget.folderId?.displayLabel || '—' },
          { label: 'Notice Type', value: formatNoticeType(deleteTarget.noticeType) },
        ] : []}
      />

      {/* View Document Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewDoc(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Document Details</h3>
              <button
                onClick={() => setViewDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Identification */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Identification</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Loan Number</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-slate-900">{viewDoc.loanNumber}</span>
                      <CopyButton value={viewDoc.loanNumber} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Unique ID</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-slate-700 max-w-[200px] truncate" title={viewDoc.uniqueRef}>{viewDoc.uniqueRef}</span>
                      <CopyButton value={viewDoc.uniqueRef} />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Customer</span>
                    <span className="text-xs text-slate-900">{viewDoc.customerName || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Document */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Document</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Folder</span>
                    <span className="text-xs text-slate-900">{viewDoc.folderId?.displayLabel || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Notice Type</span>
                    <span className="text-xs font-medium text-slate-900">{formatNoticeType(viewDoc.noticeType)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">File Type</span>
                    <span className="text-xs text-slate-900 uppercase">{viewDoc.fileType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Dispatch Date</span>
                    <span className="text-xs text-slate-900">{viewDoc.dispatchDate ? new Date(viewDoc.dispatchDate).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Tracking</span>
                    <span className="text-xs text-slate-900">{viewDoc.trackingNumber || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
              {isAdmin && (
                <button
                  onClick={() => { setViewDoc(null); setDeleteTarget(viewDoc); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
              {canDownload && (
                <button
                  onClick={() => { handleDownload(viewDoc); setViewDoc(null); }}
                  className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
              )}
              <button onClick={() => setViewDoc(null)} className="btn-secondary text-xs py-1.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
