import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  MoreVertical, FileText, Image as ImageIcon, Trash2, Edit2, Share2,
  Download, FolderOpen, Images, CheckCircle2, Circle, Lock, Unlock,
} from 'lucide-react';
import { ScannedDocument } from '../lib/types';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent,
} from './ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface DocumentCardProps {
  document: ScannedDocument;
  viewMode: 'grid' | 'list';
  folders: string[];
  selected?: boolean;
  selectionMode?: boolean;
  onDelete: (id: string) => void;
  onRename: (doc: ScannedDocument) => void;
  onShare: (doc: ScannedDocument) => void;
  onShareAsImage: (doc: ScannedDocument) => void;
  onExportZip: (doc: ScannedDocument) => void;
  onExportPdf: (doc: ScannedDocument) => void;
  onMoveToFolder: (doc: ScannedDocument, folder: string | undefined) => void;
  onCreateFolderAndMove: (doc: ScannedDocument) => void;
  onLock: (doc: ScannedDocument) => void;
  onUnlock: (doc: ScannedDocument) => void;
  onToggleSelect?: (id: string) => void;
}

export function DocumentCard({
  document,
  viewMode,
  folders,
  selected = false,
  selectionMode = false,
  onDelete,
  onRename,
  onShare,
  onShareAsImage,
  onExportZip,
  onExportPdf,
  onMoveToFolder,
  onCreateFolderAndMove,
  onLock,
  onUnlock,
  onToggleSelect,
}: DocumentCardProps) {
  const dateStr = format(new Date(document.createdAt), 'MMM d, yyyy h:mm a');
  const isLocked = !!document.pinHash;

  const handleCardClick = () => {
    if (selectionMode && onToggleSelect) onToggleSelect(document.id);
  };

  const menuProps = {
    doc: document,
    folders,
    isLocked,
    onDelete: () => onDelete(document.id),
    onRename: () => onRename(document),
    onShare: () => onShare(document),
    onShareAsImage: () => onShareAsImage(document),
    onExportZip: () => onExportZip(document),
    onExportPdf: () => onExportPdf(document),
    onMoveToFolder: (folder: string | undefined) => onMoveToFolder(document, folder),
    onCreateFolderAndMove: () => onCreateFolderAndMove(document),
    onLock: () => onLock(document),
    onUnlock: () => onUnlock(document),
  };

  if (viewMode === 'list') {
    return (
      <Card
        data-testid={`card-doc-${document.id}`}
        onClick={handleCardClick}
        className={cn(
          'overflow-hidden transition-all border-border bg-card cursor-pointer',
          selected && 'ring-2 ring-primary'
        )}
      >
        <CardContent className="p-0 flex items-center">
          <div className="w-24 h-24 shrink-0 bg-muted border-r border-border relative overflow-hidden flex items-center justify-center">
            {document.thumbnail ? (
              <img src={document.thumbnail} alt={document.name} className="w-full h-full object-contain" />
            ) : (
              <ImageIcon className="text-muted-foreground w-8 h-8" />
            )}
            {isLocked && !selectionMode && (
              <div className="absolute bottom-1 right-1 bg-amber-500 text-white rounded-full p-0.5">
                <Lock className="w-3 h-3" />
              </div>
            )}
            {selectionMode && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                {selected
                  ? <CheckCircle2 className="w-7 h-7 text-primary" />
                  : <Circle className="w-7 h-7 text-white/70" />}
              </div>
            )}
          </div>
          <div className="p-4 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-base truncate">{document.name}</h3>
              {isLocked && <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <FileText className="w-3 h-3" />
              {document.pages.length} page{document.pages.length !== 1 && 's'}
              {document.folder && (
                <>
                  <span className="opacity-40">•</span>
                  <FolderOpen className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">{document.folder}</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">{dateStr}</p>
          </div>
          {!selectionMode && (
            <div className="p-4">
              <DocMenu {...menuProps} variant="ghost" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid={`card-doc-${document.id}`}
      onClick={handleCardClick}
      className={cn(
        'overflow-hidden transition-all border-border bg-card flex flex-col h-full cursor-pointer',
        selected && 'ring-2 ring-primary'
      )}
    >
      <div className="aspect-[3/4] w-full bg-muted relative overflow-hidden flex items-center justify-center border-b border-border">
        {document.thumbnail ? (
          <img src={document.thumbnail} alt={document.name} className="w-full h-full object-contain" />
        ) : (
          <ImageIcon className="text-muted-foreground w-12 h-12" />
        )}

        {/* Lock badge */}
        {isLocked && !selectionMode && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white rounded-full p-1 shadow-md">
            <Lock className="w-3.5 h-3.5" />
          </div>
        )}

        {selectionMode ? (
          <div className="absolute inset-0 bg-black/30 flex items-start justify-end p-2">
            {selected
              ? <CheckCircle2 className="w-7 h-7 text-primary drop-shadow-md" />
              : <Circle className="w-7 h-7 text-white/70 drop-shadow-md" />}
          </div>
        ) : (
          <div className="absolute top-2 right-2">
            <DocMenu {...menuProps} variant="glass" />
          </div>
        )}

        {document.folder && !selectionMode && (
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] rounded px-1.5 py-0.5 flex items-center gap-1 backdrop-blur-sm">
            <FolderOpen className="w-2.5 h-2.5" />
            <span className="truncate max-w-[60px]">{document.folder}</span>
          </div>
        )}
      </div>

      <CardContent className="p-3 flex-1 flex flex-col justify-between">
        <h3 className="font-semibold text-sm truncate mb-1 flex items-center gap-1" title={document.name}>
          {document.name}
          {isLocked && <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />}
        </h3>
        <p className="text-xs text-muted-foreground flex justify-between items-center">
          <span>{document.pages.length} pg{document.pages.length !== 1 && 's'}</span>
          <span>{format(new Date(document.createdAt), 'MMM d, yy')}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function DocMenu({
  doc, folders, isLocked,
  onDelete, onRename, onShare, onShareAsImage,
  onExportZip, onExportPdf, onMoveToFolder, onCreateFolderAndMove,
  onLock, onUnlock,
  variant = 'ghost',
}: {
  doc: ScannedDocument;
  folders: string[];
  isLocked: boolean;
  onDelete: () => void;
  onRename: () => void;
  onShare: () => void;
  onShareAsImage: () => void;
  onExportZip: () => void;
  onExportPdf: () => void;
  onMoveToFolder: (folder: string | undefined) => void;
  onCreateFolderAndMove: () => void;
  onLock: () => void;
  onUnlock: () => void;
  variant?: 'ghost' | 'glass';
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          data-testid="btn-doc-menu"
          className={cn(
            'h-8 w-8 rounded-full',
            variant === 'glass' && 'bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm'
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onRename}>
          <Edit2 className="w-4 h-4 mr-2" /> Rename
        </DropdownMenuItem>

        {/* Lock / Unlock */}
        {isLocked ? (
          <DropdownMenuItem onClick={onUnlock}>
            <Unlock className="w-4 h-4 mr-2 text-amber-500" /> Remove Lock
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onLock}>
            <Lock className="w-4 h-4 mr-2" /> Lock with PIN
          </DropdownMenuItem>
        )}

        {/* Share sub-menu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Share2 className="w-4 h-4 mr-2" /> Share
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={onShare}>
              <FileText className="w-4 h-4 mr-2" /> Share as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShareAsImage}>
              <Images className="w-4 h-4 mr-2" /> Share as Image
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Export sub-menu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download className="w-4 h-4 mr-2" /> Export
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={onExportPdf}>
              <FileText className="w-4 h-4 mr-2" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShareAsImage}>
              <Images className="w-4 h-4 mr-2" /> Download Images
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportZip}>
              <Download className="w-4 h-4 mr-2" /> Download ZIP
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Move to Folder sub-menu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderOpen className="w-4 h-4 mr-2" /> Move to Folder
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {folders.map((f) => (
              <DropdownMenuItem
                key={f}
                onClick={() => onMoveToFolder(f)}
                className={doc.folder === f ? 'text-primary font-medium' : ''}
              >
                <FolderOpen className="w-4 h-4 mr-2" /> {f}
              </DropdownMenuItem>
            ))}
            {doc.folder && (
              <DropdownMenuItem onClick={() => onMoveToFolder(undefined)}>
                <FolderOpen className="w-4 h-4 mr-2 opacity-30" /> Remove from folder
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateFolderAndMove}>
              <FolderOpen className="w-4 h-4 mr-2" /> New folder…
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
