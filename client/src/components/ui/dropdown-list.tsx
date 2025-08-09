import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownListItem {
  id: number;
  title: string;
  patientName: string;
  hospitalName?: string;
  [key: string]: any;
}

interface DropdownListProps {
  items: DropdownListItem[];
  selectedItem?: DropdownListItem | null;
  onSelect: (item: DropdownListItem) => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}

export function DropdownList({
  items,
  selectedItem,
  onSelect,
  placeholder = "Selecione um item",
  isLoading = false,
  className
}: DropdownListProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (item: DropdownListItem) => {
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
      >
        <span className={cn(
          "block truncate",
          !selectedItem && "text-muted-foreground"
        )}>
          {isLoading ? "Carregando..." : selectedItem ? selectedItem.title : placeholder}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Debug Information */}
      {items.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">DEBUG - Pedidos Disponíveis:</p>
          <div className="space-y-1">
            {items.map((item) => (
              <p key={item.id} className="text-sm text-gray-600">
                ID: {item.id} - {item.title} - {item.patientName}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="py-2 px-3 text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : items.length === 0 ? (
            <div className="py-2 px-3 text-sm text-muted-foreground">
              Nenhum pedido disponível
            </div>
          ) : (
            <div className="py-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center py-2 pl-3 pr-9 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none",
                    selectedItem?.id === item.id && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex flex-col w-full">
                    <span className="font-medium text-sm truncate">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {item.patientName}
                      {item.hospitalName && (
                        <span> • {item.hospitalName}</span>
                      )}
                    </span>
                  </div>
                  {selectedItem?.id === item.id && (
                    <Check className="absolute right-2 h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}