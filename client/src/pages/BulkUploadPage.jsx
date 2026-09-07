import { useState, useRef, useCallback } from 'react';
import { uploadBatch, downloadTemplate } from '../api/bulkUpload';
import { Upload, FileSpreadsheet, File, X, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const BulkUploadPage = () => {
  const [templateFile, setTemplateFile] = useState(null);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [dragActive, setDragActive] = useState({ template: false, documents: false });
  const templateRef = useRef(null);
  const documentsRef = useRef(null);

  const handleTemplateDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive((d) => ({ ...d, template: false }));
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file) setTemplateFile(file);
  }, []);

  const handleDocumentsDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive((d) => ({ ...d, documents: false }));
    const files = Array.from(e.dataTransfer?.files || e.target?.files || []);
    setDocumentFiles((prev) => [...prev, ...files]);
  }, []);

  const removeDocFile = (index) => {
    setDocumentFiles((files) => files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!templateFile || documentFiles.length === 0) {
      toast.error('Please add both a template and document files');
      return;
    }

    setUploading(true);
    setBatchResult(null);

    try {
      const formData = new FormData();
      formData.append('template', templateFile);
      documentFiles.forEach((file) => formData.append('documents', file));

      const { data } = await uploadBatch(formData);
      toast.success('Batch upload started!');
      setBatchResult(data.batch);

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const { data: statusData } = await import('../api/bulkUpload').then(m => m.getBatchStatus(data.batch.id));
          setBatchResult(statusData.batch);
          if (statusData.batch.status !== 'processing') {
            clearInterval(pollInterval);
          }
        } catch {
          clearInterval(pollInterval);
        }
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setTemplateFile(null);
    setDocumentFiles([]);
    setBatchResult(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const { data } = await downloadTemplate();
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_upload_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download template');
    }
  };

  const totalSize = documentFiles.reduce((sum, f) => sum + f.size, 0);
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Bulk Upload</h1>
          <p className="text-surface-500 text-sm mt-1">Upload Excel/CSV template + document files. Files auto-map by Folder Code.</p>
        </div>
        <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Drop Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Drop Zone */}
        <div
          className={`dropzone ${dragActive.template ? 'dropzone-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive((d) => ({ ...d, template: true })); }}
          onDragLeave={() => setDragActive((d) => ({ ...d, template: false }))}
          onDrop={handleTemplateDrop}
          onClick={() => templateRef.current?.click()}
        >
          <input
            ref={templateRef}
            type="file"
            accept=".xlsx,.csv,.xls"
            className="hidden"
            onChange={(e) => handleTemplateDrop(e)}
          />
          <FileSpreadsheet className="w-10 h-10 text-surface-400" />
          {templateFile ? (
            <div className="text-center">
              <p className="font-medium text-surface-700">{templateFile.name}</p>
              <p className="text-xs text-surface-400">{formatSize(templateFile.size)}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setTemplateFile(null); }}
                className="mt-2 text-red-500 text-xs hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <p className="font-medium text-surface-600">Drop Excel/CSV template</p>
              <p className="text-xs text-surface-400">or click to browse</p>
            </>
          )}
        </div>

        {/* Documents Drop Zone */}
        <div
          className={`dropzone ${dragActive.documents ? 'dropzone-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive((d) => ({ ...d, documents: true })); }}
          onDragLeave={() => setDragActive((d) => ({ ...d, documents: false }))}
          onDrop={handleDocumentsDrop}
          onClick={() => documentsRef.current?.click()}
        >
          <input
            ref={documentsRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv"
            className="hidden"
            onChange={(e) => handleDocumentsDrop(e)}
          />
          <Upload className="w-10 h-10 text-surface-400" />
          {documentFiles.length > 0 ? (
            <div className="text-center">
              <p className="font-medium text-surface-700">{documentFiles.length} file(s) selected</p>
              <p className="text-xs text-surface-400">Total: {formatSize(totalSize)}</p>
            </div>
          ) : (
            <>
              <p className="font-medium text-surface-600">Drop document files</p>
              <p className="text-xs text-surface-400">PDF, JPG, PNG, XLSX, CSV (max 25MB each)</p>
            </>
          )}
        </div>
      </div>

      {/* Document File List */}
      {documentFiles.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Staged Files ({documentFiles.length})</h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {documentFiles.map((file, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-surface-50 group">
                <div className="flex items-center gap-2 min-w-0">
                  <File className="w-4 h-4 text-surface-400 flex-shrink-0" />
                  <span className="text-sm text-surface-700 truncate">{file.name}</span>
                  <span className="text-xs text-surface-400">{formatSize(file.size)}</span>
                </div>
                <button
                  onClick={() => removeDocFile(i)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          id="start-upload"
          onClick={handleUpload}
          disabled={!templateFile || documentFiles.length === 0 || uploading}
          className="btn-primary flex items-center gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Start Upload ({documentFiles.length} files)
        </button>
        <button onClick={handleReset} className="btn-secondary">
          Reset
        </button>
      </div>

      {/* Batch Result */}
      {batchResult && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-3">Batch Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-surface-50">
              <p className="text-xs text-surface-500">Batch Code</p>
              <p className="font-mono text-xs mt-1">{batchResult.batchCode}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-50">
              <p className="text-xs text-surface-500">Status</p>
              <p className="mt-1 flex items-center gap-1">
                {batchResult.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
                {batchResult.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                {batchResult.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                <span className="text-sm font-medium capitalize">{batchResult.status}</span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50">
              <p className="text-xs text-emerald-600">Successful</p>
              <p className="text-lg font-bold text-emerald-700 mt-1">{batchResult.successfulRows ?? '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50">
              <p className="text-xs text-red-600">Failed</p>
              <p className="text-lg font-bold text-red-700 mt-1">{batchResult.failedRows ?? '—'}</p>
            </div>
          </div>

          {/* Error Log */}
          {batchResult.errorLog?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-red-700 mb-2">Errors ({batchResult.errorLog.length})</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {batchResult.errorLog.map((err, i) => (
                  <div key={i} className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {err.row && <span className="font-medium">Row {err.row}: </span>}
                    {err.file && <span className="font-medium">{err.file}: </span>}
                    {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUploadPage;
