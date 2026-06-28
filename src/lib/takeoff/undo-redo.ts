export interface UndoAction {
  type: 'create' | 'delete' | 'update'
  measurementId: string
  previousData?: unknown
  newData?: unknown
}

export interface UndoRedoState {
  undoStack: UndoAction[]
  redoStack: UndoAction[]
}

export function createUndoRedoState(): UndoRedoState {
  return { undoStack: [], redoStack: [] }
}

export function pushAction(state: UndoRedoState, action: UndoAction): UndoRedoState {
  return {
    undoStack: [...state.undoStack, action],
    redoStack: [],
  }
}

export function undo(state: UndoRedoState): { state: UndoRedoState; action: UndoAction | null } {
  if (state.undoStack.length === 0) return { state, action: null }
  const action = state.undoStack[state.undoStack.length - 1]
  return {
    state: {
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, action],
    },
    action,
  }
}

export function redo(state: UndoRedoState): { state: UndoRedoState; action: UndoAction | null } {
  if (state.redoStack.length === 0) return { state, action: null }
  const action = state.redoStack[state.redoStack.length - 1]
  return {
    state: {
      undoStack: [...state.undoStack, action],
      redoStack: state.redoStack.slice(0, -1),
    },
    action,
  }
}

export function canUndo(state: UndoRedoState): boolean {
  return state.undoStack.length > 0
}

export function canRedo(state: UndoRedoState): boolean {
  return state.redoStack.length > 0
}
