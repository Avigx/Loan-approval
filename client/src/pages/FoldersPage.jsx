import { useState, useEffect, useCallback } from 'react';
import { listFolders, createFolder, updateFolder, deleteFolder } from '../api/folders';
import { FolderOpen, Plus, Pencil, Trash2, Loader2, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';

const emptyForm = { name: '', code: '', displayLabel: '' };

const FoldersPage = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listFolders();
      setFolders(data.folders);
    } catch {
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-generate code and display label from name
  const handleNameChange = (name) => {
    const code = name.trim().toUpperCase().replace(/\s+/g, '_');
    const displayLabel = name.trim();
    setForm({ ...form, name, code, displayLabel });
  };

  const handleEdit = (f) => {
    setEditId(f._id);
    setForm({
      name: f.name,
      code: f.code,
      displayLabel: f.displayLabel,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ ...emptyForm });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.displayLabel.trim()) {
      toast.error('All fields are required');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await updateFolder(editId, form);
        toast.success('Folder updated');
      } else {
        await createFolder(form);
        toast.success('Folder created');
      }
      handleCancel();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteFolder(id);
      toast.success('Folder deactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Folders"
        description="Manage folder categories for document classification"
        breadcrumbs={[{ label: 'Home' }, { label: 'Folders' }]}
        actions={
          !showForm && (
            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }); }}
              className="btn-primary flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Folder
            </button>
          )
        }
      />

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {editId ? 'Edit Folder' : 'Create Folder'}
            </h3>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  placeholder="e.g. Post sale"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Code</label>
                <input
                  className="input font-mono"
                  placeholder="e.g. POST_SALE"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div>
                <label className="label">Display Label</label>
                <input
                  className="input"
                  placeholder="e.g. Post sale"
                  value={form.displayLabel}
                  onChange={(e) => setForm({ ...form, displayLabel: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5 text-xs">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {editId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-ghost text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Folders Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-14 text-center">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary-600" />
          </div>
        ) : folders.length === 0 ? (
          <div className="p-14 text-center text-slate-400">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-slate-600">No folders configured</p>
            <p className="text-xs mt-1">Click "Add Folder" to create your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="table-header">Name</th>
                  <th className="table-header">Code</th>
                  <th className="table-header">Display Label</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {folders.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="table-cell text-xs font-medium text-slate-900">{f.name}</td>
                    <td className="table-cell">
                      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{f.code}</span>
                    </td>
                    <td className="table-cell text-xs text-slate-700">{f.displayLabel}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => handleEdit(f)}
                          className="p-1.5 rounded text-slate-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(f._id)}
                          disabled={deletingId === f._id}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Deactivate"
                        >
                          {deletingId === f._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoldersPage;
