import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ScannedDocument, ScannedPage } from '../lib/types';
import { loadAllDocuments, saveDocument, deleteDocument } from '../lib/storage';

interface AppState {
  documents: ScannedDocument[];
  currentSession: ScannedPage[];
  currentPageIndex: number;
  isLoading: boolean;
}

type AppAction =
  | { type: 'SET_DOCUMENTS'; payload: ScannedDocument[] }
  | { type: 'ADD_DOCUMENT'; payload: ScannedDocument }
  | { type: 'DELETE_DOCUMENT'; payload: string }
  | { type: 'UPDATE_DOCUMENT'; payload: ScannedDocument }
  | { type: 'START_SESSION'; payload: ScannedPage[] }
  | { type: 'ADD_PAGE'; payload: ScannedPage }
  | { type: 'UPDATE_PAGE'; payload: { index: number; page: ScannedPage } }
  | { type: 'DELETE_PAGE'; payload: number }
  | { type: 'SET_CURRENT_PAGE_INDEX'; payload: number }
  | { type: 'END_SESSION' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'MERGE_INTO_DOCUMENT'; payload: ScannedDocument }
  | { type: 'DELETE_DOCUMENTS'; payload: string[] };

const initialState: AppState = {
  documents: [],
  currentSession: [],
  currentPageIndex: 0,
  isLoading: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload, isLoading: false };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [action.payload, ...state.documents] };
    case 'DELETE_DOCUMENT':
      return { ...state, documents: state.documents.filter((d) => d.id !== action.payload) };
    case 'DELETE_DOCUMENTS':
      return { ...state, documents: state.documents.filter((d) => !action.payload.includes(d.id)) };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map((d) => (d.id === action.payload.id ? action.payload : d)),
      };
    case 'MERGE_INTO_DOCUMENT':
      return { ...state, documents: [action.payload, ...state.documents] };
    case 'START_SESSION':
      return { ...state, currentSession: action.payload, currentPageIndex: 0 };
    case 'ADD_PAGE':
      return {
        ...state,
        currentSession: [...state.currentSession, action.payload],
        currentPageIndex: state.currentSession.length,
      };
    case 'UPDATE_PAGE':
      return {
        ...state,
        currentSession: state.currentSession.map((p, i) =>
          i === action.payload.index ? action.payload.page : p
        ),
      };
    case 'DELETE_PAGE': {
      const newSession = state.currentSession.filter((_, i) => i !== action.payload);
      return {
        ...state,
        currentSession: newSession,
        currentPageIndex: Math.max(0, Math.min(state.currentPageIndex, newSession.length - 1)),
      };
    }
    case 'SET_CURRENT_PAGE_INDEX':
      return { ...state, currentPageIndex: action.payload };
    case 'END_SESSION':
      return { ...state, currentSession: [], currentPageIndex: 0 };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshDocuments: () => Promise<void>;
  saveCurrentSessionAsDocument: (name: string, folder?: string) => Promise<void>;
  mergeDocuments: (ids: string[], mergedName: string, folder?: string) => Promise<void>;
  moveToFolder: (doc: ScannedDocument, folder: string | undefined) => Promise<void>;
  renameFolder: (oldName: string, newName: string) => Promise<void>;
  deleteFolder: (name: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const refreshDocuments = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const docs = await loadAllDocuments();
    dispatch({ type: 'SET_DOCUMENTS', payload: docs });
  };

  const saveCurrentSessionAsDocument = async (name: string, folder?: string) => {
    if (state.currentSession.length === 0) return;
    const { v4: uuidv4 } = await import('uuid');
    const doc: ScannedDocument = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
      pages: state.currentSession,
      thumbnail: state.currentSession[0].filteredDataUrl,
      folder,
    };
    await saveDocument(doc);
    dispatch({ type: 'ADD_DOCUMENT', payload: doc });
    dispatch({ type: 'END_SESSION' });
  };

  const mergeDocuments = async (ids: string[], mergedName: string, folder?: string) => {
    const { v4: uuidv4 } = await import('uuid');
    const selectedDocs = state.documents.filter((d) => ids.includes(d.id));
    // Preserve order of selection
    const orderedDocs = ids.map((id) => selectedDocs.find((d) => d.id === id)!).filter(Boolean);
    const allPages = orderedDocs.flatMap((d) => d.pages);
    const mergedDoc: ScannedDocument = {
      id: uuidv4(),
      name: mergedName,
      createdAt: Date.now(),
      pages: allPages,
      thumbnail: allPages[0]?.filteredDataUrl ?? '',
      folder,
    };
    await saveDocument(mergedDoc);
    dispatch({ type: 'MERGE_INTO_DOCUMENT', payload: mergedDoc });
  };

  const moveToFolder = async (doc: ScannedDocument, folder: string | undefined) => {
    const updated: ScannedDocument = { ...doc, folder };
    await saveDocument(updated);
    dispatch({ type: 'UPDATE_DOCUMENT', payload: updated });
  };

  const renameFolder = async (oldName: string, newName: string) => {
    const affected = state.documents.filter((d) => d.folder === oldName);
    for (const doc of affected) {
      const updated = { ...doc, folder: newName };
      await saveDocument(updated);
      dispatch({ type: 'UPDATE_DOCUMENT', payload: updated });
    }
  };

  const deleteFolder = async (name: string) => {
    const affected = state.documents.filter((d) => d.folder === name);
    for (const doc of affected) {
      const updated = { ...doc, folder: undefined };
      await saveDocument(updated);
      dispatch({ type: 'UPDATE_DOCUMENT', payload: updated });
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        refreshDocuments,
        saveCurrentSessionAsDocument,
        mergeDocuments,
        moveToFolder,
        renameFolder,
        deleteFolder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
