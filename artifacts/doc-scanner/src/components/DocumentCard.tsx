import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { MoreVertical, FileText, Image as ImageIcon, Trash2, Edit2, Share2, Download } from 'lucide-react';
import { ScannedDocument } from '../lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { format } from 'date-fns';

interface DocumentCardProps {
  document: ScannedDocument;
  viewMode: 'grid' | 'list';
  onDelete: (id: string) => void;
  onRename: (doc: ScannedDocument) => void;
  onShare: (doc: ScannedDocument) => void;
  onExportZip: (doc: ScannedDocument) => void;
  onExportPdf: (doc: ScannedDocument) => void;
}

export function DocumentCard({
  document,
  viewMode,
  onDelete,
  onRename,
  onShare,
  onExportZip,
  onExportPdf
}: DocumentCardProps) {
  const dateStr = format(new Date(document.createdAt), 'MMM d, yyyy h:mm a');

  if (viewMode === 'list') {
    return (
      <Card className="overflow-hidden hover-elevate transition-all border-border bg-card">
        <CardContent className="p-0 flex items-center">
          <div className="w-24 h-24 shrink-0 bg-muted border-r border-border relative overflow-hidden flex items-center justify-center">
            {document.thumbnail ? (
              <img src={document.thumbnail} alt={document.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-muted-foreground w-8 h-8" />
            )}
          </div>
          <div className="p-4 flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{document.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <FileText className="w-3 h-3" /> {document.pages.length} page{document.pages.length !== 1 && 's'}
              <span className="opacity-50">•</span>
              {dateStr}
            </p>
          </div>
          <div className="p-4">
            <DocMenu
              onDelete={() => onDelete(document.id)}
              onRename={() => onRename(document)}
              onShare={() => onShare(document)}
              onExportZip={() => onExportZip(document)}
              onExportPdf={() => onExportPdf(document)}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover-elevate transition-all border-border bg-card flex flex-col h-full">
      <div className="aspect-[3/4] w-full bg-muted relative overflow-hidden flex items-center justify-center border-b border-border">
        {document.thumbnail ? (
          <img src={document.thumbnail} alt={document.name} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="text-muted-foreground w-12 h-12" />
        )}
        <div className="absolute top-2 right-2">
          <DocMenu
            onDelete={() => onDelete(document.id)}
            onRename={() => onRename(document)}
            onShare={() => onShare(document)}
            onExportZip={() => onExportZip(document)}
            onExportPdf={() => onExportPdf(document)}
            variant="glass"
          />
        </div>
      </div>
      <CardContent className="p-3 flex-1 flex flex-col justify-between">
        <h3 className="font-semibold text-sm truncate mb-1" title={document.name}>{document.name}</h3>
        <p className="text-xs text-muted-foreground flex justify-between items-center">
          <span>{document.pages.length} pg{document.pages.length !== 1 && 's'}</span>
          <span>{format(new Date(document.createdAt), 'MMM d, yy')}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function DocMenu({
  onDelete, onRename, onShare, onExportZip, onExportPdf, variant = 'ghost'
}: {
  onDelete: () => void;
  onRename: () => void;
  onShare: () => void;
  onExportZip: () => void;
  onExportPdf: () => void;
  variant?: 'ghost' | 'glass';
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full ${variant === 'glass' ? 'bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm' : ''}`}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onRename}>
          <Edit2 className="w-4 h-4 mr-2" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onExportPdf}>
          <Download className="w-4 h-4 mr-2" /> Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportZip}>
          <Download className="w-4 h-4 mr-2" /> Export ZIP
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10">
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}