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
  | { type: 'SET_LOADING'; payload: boolean };

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
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map((d) => (d.id === action.payload.id ? action.payload : d)),
      };
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
    case 'DELETE_PAGE':
      const newSession = state.currentSession.filter((_, i) => i !== action.payload);
      return {
        ...state,
        currentSession: newSession,
        currentPageIndex: Math.max(0, Math.min(state.currentPageIndex, newSession.length - 1)),
      };
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
  saveCurrentSessionAsDocument: (name: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const refreshDocuments = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const docs = await loadAllDocuments();
    dispatch({ type: 'SET_DOCUMENTS', payload: docs });
  };

  const saveCurrentSessionAsDocument = async (name: string) => {
    if (state.currentSession.length === 0) return;
    const { v4: uuidv4 } = await import('uuid');
    
    const doc: ScannedDocument = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
      pages: state.currentSession,
      thumbnail: state.currentSession[0].filteredDataUrl,
    };
    
    await saveDocument(doc);
    dispatch({ type: 'ADD_DOCUMENT', payload: doc });
    dispatch({ type: 'END_SESSION' });
  };

  return (
    <AppContext.Provider value={{ state, dispatch, refreshDocuments, saveCurrentSessionAsDocument }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}