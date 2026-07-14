import { useState, useCallback } from 'react';
import { useToast } from '../lib/ToastContext';

// ── Undo stack (in-memory per session) ────────────────────────────────────────
// Each entry: { id, label, undoFn, expiresAt }

let undoStack = [];
let undoListeners = [];

function notifyListeners() {
  undoListeners.forEach(fn => fn([...undoStack]));
}

export function pushUndo({ label, undoFn, ttlMs = 10_000 }) {
  const id = `undo-${Date.now()}`;
  const entry = { id, label, undoFn, expiresAt: Date.now() + ttlMs };
  undoStack = [entry, ...undoStack].slice(0, 20); // keep last 20
  notifyListeners();

  // Auto-expire
  setTimeout(() => {
    undoStack = undoStack.filter(e => e.id !== id);
    notifyListeners();
  }, ttlMs);

  return id;
}

export function popUndo(id) {
  const entry = undoStack.find(e => e.id === id);
  if (entry) {
    undoStack = undoStack.filter(e => e.id !== id);
    notifyListeners();
  }
  return entry;
}

// ── useUndo hook ──────────────────────────────────────────────────────────────

export function useUndo() {
  const toast = useToast();

  const withUndo = useCallback(async ({
    action,          // async fn that performs the action
    label,           // "Invoice deleted"
    undoFn,          // async fn that reverses it
    successMessage,  // "Invoice deleted" (shown in toast)
    ttlMs = 8_000,   // how long to show the undo option
  }) => {
    // Do the action
    const result = await action();

    // Show toast with undo button
    const undoId = pushUndo({ label, undoFn, ttlMs });

    // Custom toast with undo button
    const toastEl = document.createElement('div');
    toastEl.className = 'toast toast-info undo-toast';
    toastEl.innerHTML = `
      <span>${successMessage ?? label}</span>
      <button class="undo-btn">Undo</button>
      <button class="toast-close" aria-label="Dismiss">×</button>
    `;

    const container = document.querySelector('.toast-container');
    if (container) {
      container.appendChild(toastEl);

      const undoBtn  = toastEl.querySelector('.undo-btn');
      const closeBtn = toastEl.querySelector('.toast-close');

      function cleanup() {
        toastEl.remove();
        undoStack = undoStack.filter(e => e.id !== undoId);
        notifyListeners();
      }

      undoBtn?.addEventListener('click', async () => {
        cleanup();
        try {
          await undoFn();
          toast.success(`${label} — undone`);
        } catch (err) {
          toast.error(`Could not undo: ${err.message}`);
        }
      });

      closeBtn?.addEventListener('click', cleanup);
      setTimeout(cleanup, ttlMs);
    }

    return result;
  }, [toast]);

  return { withUndo };
}

// ── UndoToast styles (add to global CSS) ─────────────────────────────────────
// .undo-toast { display: flex; align-items: center; gap: 10px; }
// .undo-btn   { font-size:12px; fontWeight:600; color:#2D4A35; bg:none; border:none; cursor:pointer; padding:0 4px; text-decoration:underline; }

// ── Server-side undo (for irreversible operations) ────────────────────────────
// These call API endpoints that actually reverse DB changes

export const SERVER_UNDO = {
  // Invoice operations
  voidInvoice: (orgId, invoiceId) => ({
    label:   'Invoice voided',
    undoFn:  async () => {
      const token = localStorage.getItem('accessToken') ?? '';
      await fetch(`${import.meta.env.VITE_API_URL}/orgs/${orgId}/invoices/${invoiceId}/restore`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
    },
  }),

  deleteContact: (orgId, contactId, contactName) => ({
    label:   `${contactName} deleted`,
    undoFn:  async () => {
      const token = localStorage.getItem('accessToken') ?? '';
      await fetch(`${import.meta.env.VITE_API_URL}/orgs/${orgId}/contacts/${contactId}/restore`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
    },
  }),

  dismissExpense: (expenseId, setExpenses) => ({
    label:   'Expense rejected',
    undoFn:  () => {
      setExpenses(prev => prev.map(e =>
        e.id === expenseId ? { ...e, status: 'pending' } : e
      ));
    },
  }),
};
