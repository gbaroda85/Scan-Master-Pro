import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { DocumentCard } from '../components/DocumentCard';
import { FAB } from '../components/FAB';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LayoutGrid, List, Search, ScanLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { ScannedDocument } from '../lib/types';
import { exportToPDF, exportToZip } from '../lib/pdf';
import { useToast } from '../hooks/use-toast';

export default function Home() {
  const { state, refreshDocuments, dispatch } = useAppContext();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [renameDoc, setRenameDoc] = useState<ScannedDocument | null>(null);
  const [newName, setNewName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    refreshDocuments();
  }, []);

  const filteredDocs = state.documents.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      const { deleteDocument } = await import('../lib/storage');
      await deleteDocument(id);
      dispatch({ type: 'DELETE_DOCUMENT', payload: id });
      toast({ title: 'Document deleted' });
    }
  };

  const handleRename = async () => {
    if (!renameDoc || !newName.trim()) return;
    const { saveDocument } = await import('../lib/storage');
    const updated = { ...renameDoc, name: newName.trim() };
    await saveDocument(updated);
    dispatch({ type: 'UPDATE_DOCUMENT', payload: updated });
    setRenameDoc(null);
    toast({ title: 'Document renamed' });
  };

  const handleShare = async (doc: ScannedDocument) => {
    try {
      const { generatePDFBlob } = await import('../lib/pdf');
      const pdf = await generatePDFBlob(doc.pages);
      const file = new File([pdf], `${doc.name}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: doc.name });
      } else {
        toast({ title: "Sharing not supported", description: "Use export options instead." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportZip = async (doc: ScannedDocument) => {
    toast({ title: "Generating ZIP..." });
    await exportToZip(doc.pages, `${doc.name}.zip`);
  };

  const handleExportPdf = async (doc: ScannedDocument) => {
    toast({ title: "Generating PDF..." });
    await exportToPDF(doc.pages, `${doc.name}.pdf`);
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-primary" />
            DocScan
          </h1>
          <div className="flex items-center gap-2 bg-muted rounded-md p-1">
            <button
              className={`p-1.5 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              className={`p-1.5 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents..." 
            className="pl-9 bg-card border-border h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <main className="p-4">
        {state.documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center px-4">
            <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <ScanLine className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No documents yet</h2>
            <p className="text-muted-foreground mb-8 max-w-[250px]">
              Tap the camera button below to scan your first document.
            </p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No documents match "{search}"
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" 
              : "flex flex-col gap-3"
          }>
            {filteredDocs.map(doc => (
              <DocumentCard 
                key={doc.id} 
                document={doc} 
                viewMode={viewMode}
                onDelete={handleDelete}
                onRename={(d) => { setRenameDoc(d); setNewName(d.name); }}
                onShare={handleShare}
                onExportZip={handleExportZip}
                onExportPdf={handleExportPdf}
              />
            ))}
          </div>
        )}
      </main>

      <FAB />

      <Dialog open={!!renameDoc} onOpenChange={(open) => !open && setRenameDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              autoFocus 
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDoc(null)}>Cancel</Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}