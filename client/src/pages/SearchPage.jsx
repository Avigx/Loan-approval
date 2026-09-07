import { useState, useEffect } from 'react';
import { searchDocuments, downloadDocument } from '../api/documents';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, RotateCcw, Eye, Download, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SearchPage = () => {
  const { canDownload } = useAuth();
  const [filters, setFilters] = useState({
    loanNumber: '',
    uniqueRef: '',
    customerName: '',
    folderCode: '',
    trackingNumber: '',
    documentType: '',
    dispatchFrom: '',
    dispatchTo: '',
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [viewDoc, setViewDoc] = useState(null);

  // Load folder types for dropdown
  useEffect(() => {
    api.get('/folders').then(({ data }) => setFolders(data.folders)).catch(() => {});
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      // Only send non-empty filters
      const params = {};
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params[key] = val;
      });
      const { data } = await searchDocuments(params);
      setResults(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      loanNumber: '',
      uniqueRef: '',
      customerName: '',
      folderCode: '',
      trackingNumber: '',
      documentType: '',
      dispatchFrom: '',
      dispatchTo: '',
    });
    setResults(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Search Documents</h1>
        <p className="text-surface-500 text-sm mt-1">Find documents by loan number, tracking number, or other filters</p>
      </div>

      {/* Search Filters */}
      <form onSubmit={handleSearch} className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              placeholder="e.g. L900..._INVO"
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
                <option key={f._id} value={f.folderCode}>
                  {f.displayLabel}
                </option>
              ))}
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
            <label className="label">Document Type</label>
            <input
              className="input"
              placeholder="e.g. Invocation Notice"
              value={filters.documentType}
              onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
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

        <div className="flex items-center gap-3 mt-5">
          <button id="search-submit" type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
          <button type="button" onClick={handleReset} className="btn-secondary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </form>

      {/* Results */}
      {results === null && !loading && (
        <div className="card p-16 text-center text-surface-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-lg">Enter filters and search</p>
          <p className="text-sm mt-1">Use the filters above to find documents</p>
        </div>
      )}

      {loading && (
        <div className="card p-16 text-center text-surface-400">
          <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-primary-500" />
          <p className="font-medium">Searching…</p>
        </div>
      )}

      {results && !loading && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-200 flex items-center justify-between">
            <p className="text-sm text-surface-600 font-medium">
              {results.pagination.total} document(s) found
            </p>
          </div>

          {results.documents.length === 0 ? (
            <div className="p-16 text-center text-surface-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No documents found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="table-header">Loan #</th>
                    <th className="table-header">Unique ID</th>
                    <th className="table-header">Customer</th>
                    <th className="table-header">Folder</th>
                    <th className="table-header">Doc Type</th>
                    <th className="table-header">Dispatch</th>
                    <th className="table-header">POD</th>
                    <th className="table-header">Tracking</th>
                    <th className="table-header">Remark</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {results.documents.map((doc) => (
                    <tr key={doc._id} className="hover:bg-surface-50 transition-colors">
                      <td className="table-cell font-medium text-primary-700">{doc.loanNumber}</td>
                      <td className="table-cell text-xs font-mono">{doc.uniqueRef}</td>
                      <td className="table-cell">{doc.customerName || '—'}</td>
                      <td className="table-cell">
                        <span className="badge-info">{doc.folderTypeId?.folderCode || '—'}</span>
                      </td>
                      <td className="table-cell text-xs">{doc.folderTypeId?.displayLabel || '—'}</td>
                      <td className="table-cell text-xs">
                        {doc.dispatchDate ? new Date(doc.dispatchDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="table-cell text-xs">{doc.podStatus || '—'}</td>
                      <td className="table-cell text-xs font-mono">{doc.trackingNumber || '—'}</td>
                      <td className="table-cell text-xs max-w-[150px] truncate">{doc.remark || '—'}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(doc)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canDownload && (
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View Document Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-surface-900 mb-4">Document Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-surface-500">Loan Number:</span><span className="font-medium">{viewDoc.loanNumber}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Unique ID:</span><span className="font-mono text-xs">{viewDoc.uniqueRef}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Customer:</span><span>{viewDoc.customerName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Folder:</span><span>{viewDoc.folderTypeId?.displayLabel}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">File Type:</span><span className="uppercase">{viewDoc.fileType}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Dispatch:</span><span>{viewDoc.dispatchDate ? new Date(viewDoc.dispatchDate).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">POD:</span><span>{viewDoc.podStatus || '—'}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Tracking:</span><span>{viewDoc.trackingNumber || '—'}</span></div>
              {viewDoc.remark && <div><span className="text-surface-500">Remark:</span><p className="mt-1">{viewDoc.remark}</p></div>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              {canDownload && (
                <button onClick={() => { handleDownload(viewDoc); setViewDoc(null); }} className="btn-primary flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download
                </button>
              )}
              <button onClick={() => setViewDoc(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
