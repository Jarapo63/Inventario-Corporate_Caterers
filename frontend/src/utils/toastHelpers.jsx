import React from 'react';
import { toast } from 'react-hot-toast';

export const confirmAction = (message, onConfirm) => {
  toast(
    (t) => (
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1f2937' }}>{message}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              onConfirm();
            }}
            style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Confirmar
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: '6px 12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    ),
    { 
      duration: Infinity,
      style: { minWidth: '250px' }
    }
  );
};
