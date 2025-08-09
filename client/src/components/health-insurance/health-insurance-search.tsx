import React, { useState, useEffect, useRef } from "react";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { HealthInsuranceProvider } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface HealthInsuranceSearchProps {
  selectedProvider: HealthInsuranceProvider | null;
  setSelectedProvider: (provider: HealthInsuranceProvider | null) => void;
  onProviderSelected?: (provider: HealthInsuranceProvider) => void;
  className?: string;
}

export function HealthInsuranceSearch({ 
  selectedProvider, 
  setSelectedProvider, 
  onProviderSelected,
  className 
}: HealthInsuranceSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HealthInsuranceProvider[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  
  const searchTimeoutRef = useRef<number | null>(null);

  // Carregar operadoras recentes (primeiras 50)
  const { data: recentProviders, isLoading: isLoadingRecent } = useQuery<HealthInsuranceProvider[]>({
    queryKey: ["/api/health-insurance-providers"],
    queryFn: async () => {
      const response = await fetch("/api/health-insurance-providers", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar operadoras: ${response.status}`);
      }
      
      const providers = await response.json();
      return providers.slice(0, 50); // Limitar a 50 para performance
    }
  });

  // Função para buscar operadoras no servidor
  const searchProviders = async (query: string) => {
    try {
      setIsLoadingSearch(true);
      console.log(`Buscando operadoras com termo: "${query}"`);
      
      const response = await fetch(`/api/health-insurance-providers/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro na busca: ${response.status}`);
      }

      const results = await response.json();
      console.log(`Encontradas ${results.length} operadoras`);
      setSearchResults(results);
    } catch (error) {
      console.error('Erro ao buscar operadoras:', error);
      setSearchResults([]);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Debounce na busca
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      searchProviders(searchQuery.trim());
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelect = (provider: HealthInsuranceProvider) => {
    setSelectedProvider(provider);
    if (onProviderSelected) {
      onProviderSelected(provider);
    }
    setOpen(false);
    setSearchQuery(""); // Limpar busca após seleção
  };

  // Determinar quais operadoras mostrar
  const displayedProviders = searchQuery.trim() ? searchResults : (recentProviders || []);
  const currentLoading = searchQuery.trim() ? isLoadingSearch : isLoadingRecent;

  const displayValue = selectedProvider 
    ? `${selectedProvider.name} (${selectedProvider.ansCode})`
    : "Selecionar operadora...";

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-8 text-sm"
            disabled={isLoadingRecent}
          >
            {isLoadingRecent ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando operadoras...
              </div>
            ) : (
              <span className={cn(
                "truncate",
                !selectedProvider && "text-muted-foreground"
              )}>
                {displayValue}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Buscar por nome, CNPJ ou código ANS..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {displayedProviders.length === 0 && !currentLoading && (
                <CommandEmpty>
                  {searchQuery.trim() === "" 
                    ? "Digite para buscar operadoras..." 
                    : "Nenhuma operadora encontrada."}
                </CommandEmpty>
              )}
              
              {currentLoading && (
                <CommandEmpty>
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2">Carregando...</span>
                  </div>
                </CommandEmpty>
              )}
              
              {displayedProviders.length > 0 && (
                <CommandGroup>
                  {displayedProviders.map((provider: HealthInsuranceProvider) => (
                    <CommandItem
                      key={provider.id}
                      value={`${provider.name}-${provider.ansCode}`}
                      onSelect={() => handleSelect(provider)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center w-full">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedProvider?.id === provider.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium text-sm truncate">{provider.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            CNPJ: {provider.cnpj} | ANS: {provider.ansCode}
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}