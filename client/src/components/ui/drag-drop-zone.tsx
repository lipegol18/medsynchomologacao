import React, { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DragDropZoneProps {
  onFileDrop: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DragDropZone({
  onFileDrop,
  accept = "image/*",
  disabled = false,
  children,
  className
}: DragDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // e.stopPropagation(); // Para a propagação
    dragCounter.current++;
    if (!disabled && dragCounter.current === 1) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // e.stopPropagation(); // Para a propagação
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // e.stopPropagation(); // Para a propagação
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // e.stopPropagation(); // Para a propagação
    dragCounter.current = 0;
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      
      // Verificar se o arquivo é do tipo aceito
      if (accept) {
        const acceptedTypes = accept.split(',').map(type => type.trim());
        const isAccepted = acceptedTypes.some(acceptType => {
          if (acceptType === 'image/*') {
            return file.type.startsWith('image/');
          } else if (acceptType === '.pdf') {
            return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          } else if (acceptType.includes('*')) {
            return file.type.match(acceptType.replace('*', '.*'));
          } else {
            return file.type === acceptType;
          }
        });
        
        if (!isAccepted) {
          console.warn('Tipo de arquivo não aceito:', file.type, 'Aceitos:', accept);
          return;
        }
      }
      
      onFileDrop(file);
    }
  }, [onFileDrop, accept, disabled]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative transition-all duration-200",
        isDragOver && !disabled && "ring-2 ring-blue-500 ring-opacity-50 bg-blue-50/10",
        className
      )}
    >
      {children}
      {isDragOver && !disabled && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-500/10 rounded-md flex items-center justify-center z-10">
          <span className="text-blue-400 font-medium text-sm">
            Solte a imagem aqui
          </span>
        </div>
      )}
    </div>
  );
}