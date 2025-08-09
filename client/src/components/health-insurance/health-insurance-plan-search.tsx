import React, { useState, useEffect } from "react";
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
import { HealthInsurancePlan } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface HealthInsurancePlanSearchProps {
  selectedPlan: HealthInsurancePlan | null;
  setSelectedPlan: (plan: HealthInsurancePlan | null) => void;
  providerId?: string; // ANS code da operadora para filtrar planos
  onPlanSelected?: (plan: HealthInsurancePlan) => void;
  className?: string;
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function HealthInsurancePlanSearch({ 
  selectedPlan, 
  setSelectedPlan, 
  providerId,
  onPlanSelected,
  className 
}: HealthInsurancePlanSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPlans, setFilteredPlans] = useState<HealthInsurancePlan[]>([]);
  
  // Construir a URL da query baseada no provedor
  const queryKey = providerId 
    ? [`/api/health-insurance-plans/provider/${providerId}`]
    : ["/api/health-insurance-plans"];
  
  // Carregar planos da operadora ou todos os planos
  const { data: plans, isLoading } = useQuery<HealthInsurancePlan[]>({
    queryKey,
    queryFn: async () => {
      const url = providerId 
        ? `/api/health-insurance-plans/provider/${providerId}`
        : "/api/health-insurance-plans";
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar planos: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !providerId || !!providerId // Só carregar se não precisar de provedor ou se provedor está definido
  });

  // Filtrar planos baseado na busca
  useEffect(() => {
    if (!plans) {
      setFilteredPlans([]);
      return;
    }

    if (!searchQuery.trim()) {
      // Mostrar todos se não há busca, limitado a 50 para performance
      setFilteredPlans(plans.slice(0, 50));
      return;
    }

    const normalizedQuery = normalizeText(searchQuery);
    
    const filtered = plans.filter(plan => {
      const normalizedPlanName = normalizeText(plan.nmPlano || '');
      
      // Busca apenas por nome do plano (normalizado)
      const nameMatch = normalizedPlanName.includes(normalizedQuery);
      
      return nameMatch;
    }).slice(0, 50); // Limitar a 50 resultados para performance
    
    setFilteredPlans(filtered);
  }, [plans, searchQuery]);

  const handleSelect = (plan: HealthInsurancePlan) => {
    setSelectedPlan(plan);
    if (onPlanSelected) {
      onPlanSelected(plan);
    }
    setOpen(false);
    setSearchQuery(""); // Limpar busca após seleção
  };

  const displayValue = selectedPlan 
    ? `${selectedPlan.nmPlano || `Plano ${selectedPlan.cdPlano}`}`
    : "Selecionar plano...";

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-8 text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando planos...
              </div>
            ) : (
              <span className={cn(
                "truncate",
                !selectedPlan && "text-muted-foreground"
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
              placeholder="Buscar por nome do plano..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {filteredPlans.length === 0 && !isLoading && (
                <CommandEmpty>
                  {searchQuery 
                    ? "Nenhum plano encontrado." 
                    : providerId
                    ? "Nenhum plano disponível para esta operadora."
                    : "Digite para buscar planos."
                  }
                </CommandEmpty>
              )}
              {isLoading && (
                <CommandEmpty>
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2">Carregando...</span>
                  </div>
                </CommandEmpty>
              )}
              <CommandGroup>
                {filteredPlans.map((plan) => (
                  <CommandItem
                    key={plan.id}
                    value={`${plan.nmPlano}-${plan.cdPlano}`}
                    onSelect={() => handleSelect(plan)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center w-full">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedPlan?.id === plan.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {plan.nmPlano || `Plano ${plan.cdPlano}`}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}