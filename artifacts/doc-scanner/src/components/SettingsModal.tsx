import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ScanLine, FileText, FolderOpen, Lock, Trash2, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { state, dispatch, refreshDocuments } = useAppContext();
  const { toast } = useToast();

  const docCount = state.documents.length;
  const pageCount = state.documents.reduce((sum, d) => sum + d.pages.length, 0);
  const lockedCount = state.documents.filter((d) => d.pinHash).length;
  const folderCount = new Set(state.documents.map((d) => d.folder).filter(Boolean)).size;

  const handleClearAll = async () => {
    if (!confirm(`Delete all ${docCount} document(s)? This cannot be undone.`)) return;
    const { deleteDocument } = await import('../lib/storage');
    for (const doc of state.documents) await deleteDocument(doc.id);
    await refreshDocuments();
    toast({ title: 'All documents deleted' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-center mb-1">
            <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center">
              <ScanLine className="w-7 h-7" />
            </div>
          </div>
          <DialogTitle className="text-center">DocScan Settings</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <StatCard icon={<FileText className="w-4 h-4" />} label="Documents" value={docCount} />
          <StatCard icon={<FileText className="w-4 h-4" />} label="Pages" value={pageCount} />
          <StatCard icon={<FolderOpen className="w-4 h-4" />} label="Folders" value={folderCount} />
          <StatCard icon={<Lock className="w-4 h-4" />} label="Locked" value={lockedCount} />
        </div>

        <div className="rounded-lg bg-muted p-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            All scans, edits, and PINs are stored only on this device — nothing is uploaded to a server.
            DocScan works fully offline as an installable app.
          </span>
        </div>

        <Button
          variant="outline"
          onClick={handleClearAll}
          disabled={docCount === 0}
          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Clear All Data
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col items-center justify-center gap-1">
      <div className="text-primary">{icon}</div>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
