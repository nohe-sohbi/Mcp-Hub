import { useState, useEffect } from 'react';
import { Archive, RotateCcw, Trash2, Clock, FileText } from 'lucide-react';
import { getBackups, restoreBackup, deleteBackup } from '../services/api';

function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Backups() {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(null);
    const [message, setMessage] = useState(null);

    const loadData = () => {
        setLoading(true);
        getBackups()
            .then(setBackups)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const notify = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleRestore = async (backup) => {
        if (!window.confirm(`Restore "${backup.fileName}" to ${backup.originalPath}? The current file will be backed up first.`)) {
            return;
        }
        setBusy(backup.id);
        try {
            await restoreBackup(backup.id);
            notify('success', `Restored ${backup.fileName}`);
            loadData();
        } catch (error) {
            console.error('Failed to restore backup:', error);
            notify('error', 'Failed to restore backup');
        } finally {
            setBusy(null);
        }
    };

    const handleDelete = async (backup) => {
        if (!window.confirm(`Delete backup of "${backup.fileName}"? This cannot be undone.`)) {
            return;
        }
        setBusy(backup.id);
        try {
            await deleteBackup(backup.id);
            notify('success', 'Backup deleted');
            setBackups(prev => prev.filter(b => b.id !== backup.id));
        } catch (error) {
            console.error('Failed to delete backup:', error);
            notify('error', 'Failed to delete backup');
        } finally {
            setBusy(null);
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <section className="section">
                <div className="section-header">
                    <p className="section-subtitle">Safety</p>
                    <h1 className="section-title">Backups</h1>
                </div>

                <p className="text-lg text-muted" style={{ maxWidth: '600px' }}>
                    Every time a configuration file is modified, a
                    <span className="text-accent font-serif font-italic"> timestamped backup</span> is
                    kept automatically. Restore or clean them up here.
                </p>
            </section>

            {message && (
                <div
                    className="card mb-lg"
                    style={{
                        backgroundColor: message.type === 'error' ? '#FEE2E2' : '#DCFCE7',
                        borderColor: message.type === 'error' ? '#EF4444' : '#22C55E'
                    }}
                >
                    <span style={{ color: message.type === 'error' ? '#991B1B' : '#166534' }}>
                        {message.text}
                    </span>
                </div>
            )}

            {/* Backups list */}
            <section>
                {backups.length === 0 ? (
                    <div className="empty-state">
                        <Archive className="empty-icon" />
                        <h3 className="empty-title">No backups yet</h3>
                        <p className="empty-description">
                            Backups are created automatically when you add, edit, or remove servers.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-md">
                        <p className="text-muted text-sm">
                            {backups.length} backup{backups.length !== 1 ? 's' : ''} stored
                        </p>
                        {backups.map(backup => (
                            <div key={backup.id} className="card">
                                <div className="card-header">
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="flex items-center gap-sm">
                                            <FileText size={16} style={{ color: 'var(--color-accent)' }} />
                                            <span className="card-title">{backup.fileName}</span>
                                            {backup.size != null && (
                                                <span className="badge badge-muted">{formatSize(backup.size)}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-sm mt-sm text-sm text-muted" style={{ flexWrap: 'wrap' }}>
                                            <code style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>
                                                {backup.originalPath}
                                            </code>
                                        </div>
                                        {backup.timestamp && (
                                            <div className="flex items-center gap-sm mt-sm text-xs text-light">
                                                <Clock size={12} />
                                                <span>{backup.timestamp}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleRestore(backup)}
                                            disabled={busy === backup.id}
                                        >
                                            <RotateCcw size={14} />
                                            Restore
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleDelete(backup)}
                                            disabled={busy === backup.id}
                                            style={{ color: 'var(--color-error)' }}
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default Backups;
