import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { DocumentCard } from '../components/DocumentCard';
import { FAB } from '../components/FAB';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  LayoutGrid, List, Search, ScanLine, FolderPlus, FolderOpen,
  Merge, X, CheckSquare, Trash2, Edit2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { ScannedDocument } from '../lib/types';
import { exportToPDF, exportToZip, shareAsImages, sharePDF } from '../lib/pdf';
import { useToast } from '../hooks/use-toast';
import { cn } from '../lib/utils';

type DialogMode =
  | { kind: 'rename'; doc: ScannedDocument }
  | { kind: 'merge' }
  | { kind: 'new-folder' }
  | { kind: 'move-to-folder'; doc: ScannedDocument }
  | { kind: 'rename-folder'; name: string }
  | null;

export default function Home() {
  const { state, refreshDocuments, dispatch, mergeDocuments, moveToFolder, renameFolder, deleteFolder } =
    useAppContext();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = "All"
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    refreshDocuments();
  }, []);

  // Derive folders from all documents
  const folders = useMemo(() => {
    const set = new Set<string>();
    state.documents.forEach((d) => { if (d.folder) set.add(d.folder); });
    return Array.from(set).sort();
  }, [state.documents]);

  const filteredDocs = useMemo(() => {
    return state.documents.filter((doc) => {
      const matchSearch = doc.name.toLowerCase().includes(search.toLowerCase());
      const matchFolder = activeFolder === null ? true : doc.folder === activeFolder;
      return matchSearch && matchFolder;
    });
  }, [state.documents, search, activeFolder]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  // --- Actions ---

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    const { deleteDocument } = await import('../lib/storage');
    await deleteDocument(id);
    dispatch({ type: 'DELETE_DOCUMENT', payload: id });
    toast({ title: 'Document deleted' });
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected document(s)?`)) return;
    const { deleteDocument } = await import('../lib/storage');
    for (const id of selectedIds) await deleteDocument(id);
    dispatch({ type: 'DELETE_DOCUMENTS', payload: selectedIds });
    toast({ title: `${selectedIds.length} document(s) deleted` });
    exitSelectionMode();
  };

  const handleRenameSubmit = async () => {
    if (dialogMode?.kind !== 'rename' || !inputValue.trim()) return;
    const { saveDocument } = await import('../lib/storage');
    const updated = { ...dialogMode.doc, name: inputValue.trim() };
    await saveDocument(updated);
    dispatch({ type: 'UPDATE_DOCUMENT', payload: updated });
    toast({ title: 'Document renamed' });
    setDialogMode(null);
  };

  const handleShare = async (doc: ScannedDocument) => {
    try {
      toast({ title: 'Preparing PDF…' });
      await sharePDF(doc.pages, doc.name);
    } catch (err) {
      console.error(err);
      toast({ title: 'Share failed — downloading instead', variant: 'destructive' });
      try { await exportToPDF(doc.pages, `${doc.name}.pdf`); } catch { /* ignore */ }
    }
  };

  const handleShareAsImage = async (doc: ScannedDocument) => {
    try {
      toast({ title: 'Preparing images…' });
      await shareAsImages(doc.pages, doc.name);
    } catch (err) {
      console.error(err);
      toast({ title: 'Image export failed', variant: 'destructive' });
    }
  };

  const handleExportZip = async (doc: ScannedDocument) => {
    toast({ title: 'Generating ZIP…' });
    await exportToZip(doc.pages, `${doc.name}.zip`);
  };

  const handleExportPdf = async (doc: ScannedDocument) => {
    toast({ title: 'Generating PDF…' });
    await exportToPDF(doc.pages, `${doc.name}.pdf`);
  };

  const handleMergeSubmit = async () => {
    if (selectedIds.length < 2 || !inputValue.trim()) return;
    await mergeDocuments(selectedIds, inputValue.trim(), activeFolder ?? undefined);
    toast({ title: 'Documents merged successfully' });
    setDialogMode(null);
    exitSelectionMode();
  };

  const handleNewFolderSubmit = async (pendingDoc?: ScannedDocument) => {
    const name = inputValue.trim();
    if (!name) return;
    if (pendingDoc) {
      await moveToFolder(pendingDoc, name);
      toast({ title: `Moved to "${name}"` });
    } else {
      // Create an empty folder by just switching to it — folders are derived from docs
      // so show a toast explaining the user should move a doc into it
      toast({ title: `Folder "${name}" will appear when a document is moved into it.` });
    }
    setDialogMode(null);
  };

  const handleMoveToFolderSubmit = async () => {
    if (dialogMode?.kind !== 'move-to-folder' || !inputValue.trim()) return;
    await moveToFolder(dialogMode.doc, inputValue.trim());
    toast({ title: `Moved to "${inputValue.trim()}"` });
    setDialogMode(null);
  };

  const handleRenameFolderSubmit = async () => {
    if (dialogMode?.kind !== 'rename-folder' || !inputValue.trim()) return;
    await renameFolder(dialogMode.name, inputValue.trim());
    if (activeFolder === dialogMode.name) setActiveFolder(inputValue.trim());
    toast({ title: 'Folder renamed' });
    setDialogMode(null);
  };

  const handleDeleteFolder = async (name: string) => {
    if (!confirm(`Remove folder "${name}"? Documents inside will be kept but unfoldered.`)) return;
    await deleteFolder(name);
    if (activeFolder === name) setActiveFolder(null);
    toast({ title: `Folder "${name}" deleted` });
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {selectionMode ? (
            <>
              <Button variant="ghost" size="sm" onClick={exitSelectionMode} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <span className="font-semibold text-sm">
                {selectedIds.length} selected
              </span>
              <div className="flex items-center gap-1">
                {selectedIds.length >= 2 && (
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="btn-merge"
                    onClick={() => { setInputValue('Merged Document'); setDialogMode({ kind: 'merge' }); }}
                    className="text-xs"
                  >
                    <Merge className="w-3.5 h-3.5 mr-1" /> Merge
                  </Button>
                )}
                {selectedIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    data-testid="btn-delete-selected"
                    onClick={handleDeleteSelected}
                    className="text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-primary" /> DocScan
              </h1>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  data-testid="btn-new-folder"
                  title="New Folder"
                  onClick={() => { setInputValue(''); setDialogMode({ kind: 'new-folder' }); }}
                >
                  <FolderPlus className="w-4 h-4" />
                </Button>
                {state.documents.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    data-testid="btn-select-mode"
                    title="Select"
                    onClick={() => setSelectionMode(true)}
                  >
                    <CheckSquare className="w-4 h-4" />
                  </Button>
                )}
                <div className="flex items-center bg-muted rounded-md p-1 ml-1">
                  <button
                    className={cn('p-1.5 rounded-sm transition-colors', viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    className={cn('p-1.5 rounded-sm transition-colors', viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative px-4 pb-2">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
            className="pl-9 bg-card border-border h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Folder Tabs */}
        {folders.length > 0 && (
          <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto no-scrollbar">
            <FolderTab
              label="All"
              active={activeFolder === null}
              count={state.documents.length}
              onClick={() => setActiveFolder(null)}
            />
            {folders.map((f) => (
              <FolderTab
                key={f}
                label={f}
                active={activeFolder === f}
                count={state.documents.filter((d) => d.folder === f).length}
                onClick={() => setActiveFolder(f)}
                onRename={() => { setInputValue(f); setDialogMode({ kind: 'rename-folder', name: f }); }}
                onDelete={() => handleDeleteFolder(f)}
              />
            ))}
          </div>
        )}
      </header>

      {/* Document Grid / List */}
      <main className="p-4">
        {state.documents.length === 0 ? (
          <EmptyState />
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search ? `No documents match "${search}"` : `No documents in "${activeFolder}"`}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4' : 'flex flex-col gap-3'}>
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                viewMode={viewMode}
                folders={folders}
                selected={selectedIds.includes(doc.id)}
                selectionMode={selectionMode}
                onDelete={handleDelete}
                onRename={(d) => { setInputValue(d.name); setDialogMode({ kind: 'rename', doc: d }); }}
                onShare={handleShare}
                onShareAsImage={handleShareAsImage}
                onExportZip={handleExportZip}
                onExportPdf={handleExportPdf}
                onMoveToFolder={moveToFolder}
                onCreateFolderAndMove={(d) => { setInputValue(''); setDialogMode({ kind: 'move-to-folder', doc: d }); }}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </main>

      {!selectionMode && <FAB />}

      {/* ── Dialogs ── */}

      {/* Rename Document */}
      <Dialog open={dialogMode?.kind === 'rename'} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rename Document</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleRenameSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge */}
      <Dialog open={dialogMode?.kind === 'merge'} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Merge {selectedIds.length} Documents</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground px-1">
            Pages from all selected documents will be combined in the order they were selected. Give the merged document a name:
          </p>
          <div className="py-2">
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus placeholder="Merged document name" onKeyDown={(e) => e.key === 'Enter' && handleMergeSubmit()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleMergeSubmit} disabled={!inputValue.trim()}>
              <Merge className="w-4 h-4 mr-2" /> Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder */}
      <Dialog open={dialogMode?.kind === 'new-folder'} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus placeholder="Folder name" onKeyDown={(e) => e.key === 'Enter' && handleNewFolderSubmit()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={() => handleNewFolderSubmit()} disabled={!inputValue.trim()}>
              <FolderPlus className="w-4 h-4 mr-2" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to New Folder */}
      <Dialog open={dialogMode?.kind === 'move-to-folder'} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus placeholder="Folder name" onKeyDown={(e) => e.key === 'Enter' && handleMoveToFolderSubmit()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleMoveToFolderSubmit} disabled={!inputValue.trim()}>
              <FolderOpen className="w-4 h-4 mr-2" /> Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder */}
      <Dialog open={dialogMode?.kind === 'rename-folder'} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rename Folder</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleRenameFolderSubmit()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleRenameFolderSubmit} disabled={!inputValue.trim()}>
              <Edit2 className="w-4 h-4 mr-2" /> Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderTab({
  label, active, count, onClick, onRename, onDelete,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="relative group flex-shrink-0">
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-all whitespace-nowrap',
          active
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
        )}
      >
        {label !== 'All' && <FolderOpen className="w-3 h-3" />}
        {label}
        <span className={cn('text-[10px] rounded-full px-1', active ? 'bg-white/20' : 'bg-muted')}>{count}</span>
      </button>
      {/* Rename / delete for named folders (on long hover) */}
      {onRename && onDelete && (
        <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onRename(); }}
            className="w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
            title="Rename folder"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center text-destructive hover:text-destructive/80"
            title="Delete folder"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center px-4">
      <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
        <ScanLine className="w-12 h-12" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No documents yet</h2>
      <p className="text-muted-foreground mb-8 max-w-[250px]">
        Tap the camera button below to scan your first document.
      </p>
    </div>
  );
}
