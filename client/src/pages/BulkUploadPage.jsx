import { useState, useRef, useCallback } from 'react';
import { uploadBatch, downloadTemplate } from '../api/bulkUpload';
import { Upload, FileSpreadsheet, File, X, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';

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
    <div>
      <PageHeader
        title="Bulk Upload"
        description="Upload Excel/CSV template with document files for batch processing"
        breadcrumbs={[{ label: 'Home' }, { label: 'Bulk Upload' }]}
        actions={
          <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            Download Template
          </button>
        }
      />

      {/* Drop Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Template */}
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
          <FileSpreadsheet className="w-8 h-8 text-slate-400" />
          {templateFile ? (
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">{templateFile.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(templateFile.size)}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setTemplateFile(null); }}
                className="mt-1.5 text-red-500 text-[11px] hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-600">Drop Excel/CSV template</p>
              <p className="text-[11px] text-slate-400">or click to browse</p>
            </>
          )}
        </div>

        {/* Documents */}
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
          <Upload className="w-8 h-8 text-slate-400" />
          {documentFiles.length > 0 ? (
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">{documentFiles.length} file(s) selected</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Total: {formatSize(totalSize)}</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-600">Drop document files</p>
              <p className="text-[11px] text-slate-400">PDF, JPG, PNG, XLSX, CSV (max 25MB each)</p>
            </>
          )}
        </div>
      </div>

      {/* File List */}
      {documentFiles.length > 0 && (
        <div className="card p-4 mb-5">
          <h3 className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
            Staged Files ({documentFiles.length})
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {documentFiles.map((file, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded hover:bg-slate-50 group">
                <div className="flex items-center gap-2 min-w-0">
                  <File className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-700 truncate" title={file.name}>{file.name}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{formatSize(file.size)}</span>
                </div>
                <button
                  onClick={() => removeDocFile(i)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-0.5"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mb-6">
        <button
          id="start-upload"
          onClick={handleUpload}
          disabled={!templateFile || documentFiles.length === 0 || uploading}
          className="btn-primary flex items-center gap-1.5 text-xs"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Start Upload ({documentFiles.length} files)
        </button>
        <button onClick={handleReset} className="btn-ghost text-xs">
          Reset
        </button>
      </div>

      {/* Batch Result */}
      {batchResult && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Batch Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Batch Code</p>
              <p className="font-mono text-[11px] mt-1 text-slate-700 truncate" title={batchResult.batchCode}>{batchResult.batchCode}</p>
            </div>
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Status</p>
              <p className="mt-1 flex items-center gap-1">
                {batchResult.status === 'processing' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                {batchResult.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                {batchResult.status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                <span className="text-xs font-medium capitalize">{batchResult.status}</span>
              </p>
            </div>
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Successful</p>
              <p className="text-lg font-semibold text-emerald-700 mt-1">{batchResult.successfulRows ?? '—'}</p>
            </div>
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-[10px] text-red-600 uppercase tracking-wide">Failed</p>
              <p className="text-lg font-semibold text-red-700 mt-1">{batchResult.failedRows ?? '—'}</p>
            </div>
          </div>

          {/* Error Log */}
          {batchResult.errorLog?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-700 mb-2">Errors ({batchResult.errorLog.length})</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {batchResult.errorLog.map((err, i) => (
                  <div key={i} className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-100">
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
