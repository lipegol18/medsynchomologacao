import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { HealthInsurancePlan } from "@shared/schema";

interface HealthInsurancePlanSelectProps {
  selectedPlan: string;
  setSelectedPlan: (plan: string) => void;
  providerAnsCode?: string;
  disabled?: boolean;
  className?: string;
}

export function HealthInsurancePlanSelect({
  selectedPlan,
  setSelectedPlan,
  providerAnsCode,
  disabled = false,
  className = ""
}: HealthInsurancePlanSelectProps) {
  const [internalValue, setInternalValue] = useState(selectedPlan);

  // Carregar planos da operadora selecionada
  const { data: plans, isLoading } = useQuery<HealthInsurancePlan[]>({
    queryKey: [`/api/health-insurance-plans/provider/${providerAnsCode}`],
    enabled: !!providerAnsCode,
    queryFn: async () => {
      if (!providerAnsCode) return [];
      
      const response = await fetch(`/api/health-insurance-plans/provider/${providerAnsCode}`, {
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
    }
  });

  // Resetar seleção quando a operadora mudar
  useEffect(() => {
    if (!providerAnsCode) {
      setInternalValue("");
      setSelectedPlan("");
    }
  }, [providerAnsCode, setSelectedPlan]);

  // Sincronizar valor interno com prop externa
  useEffect(() => {
    setInternalValue(selectedPlan);
  }, [selectedPlan]);

  const handleValueChange = (value: string) => {
    const finalValue = value === "no-plan-specified" ? "" : value;
    setInternalValue(finalValue);
    setSelectedPlan(finalValue);
  };

  // Formatar o nome do plano para exibição
  const formatPlanName = (plan: HealthInsurancePlan) => {
    // Usar o nm_plano se disponível, senão usar um fallback
    let displayName = plan.nmPlano && plan.nmPlano.trim() !== '' 
      ? plan.nmPlano 
      : `Plano ${plan.cdPlano || plan.id}`;
    
    // Limitar o tamanho do nome para melhor exibição
    if (displayName.length > 60) {
      displayName = displayName.substring(0, 57) + '...';
    }
    
    return displayName;
  };

  // Gerar um valor único para cada plano
  const getPlanValue = (plan: HealthInsurancePlan) => {
    const formattedName = formatPlanName(plan);
    return `${plan.id}-${formattedName}`;
  };

  const isDisabled = disabled || !providerAnsCode || isLoading;

  return (
    <div className={className}>
      <Select
        value={internalValue}
        onValueChange={handleValueChange}
        disabled={isDisabled}
      >
        <SelectTrigger className="w-full h-8 text-sm bg-slate-700 border-slate-600 text-white">
          <SelectValue
            placeholder={
              !providerAnsCode
                ? "Selecione uma operadora primeiro"
                : isLoading
                ? "Carregando planos..."
                : "Selecionar plano..."
            }
          />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] bg-slate-800 border-slate-600">
          {isLoading && (
            <div className="flex items-center justify-center p-2 text-slate-300">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando planos...
            </div>
          )}
          
          {!isLoading && (!plans || plans.length === 0) && providerAnsCode && (
            <div className="p-2 text-center text-slate-400 text-sm">
              Nenhum plano encontrado para esta operadora
            </div>
          )}
          
          {!isLoading && plans && plans.length > 0 && (
            <>
              <SelectItem value="no-plan-specified" className="text-slate-300 hover:bg-slate-700">
                Não especificar plano
              </SelectItem>
              {plans.map((plan) => {
                const planValue = getPlanValue(plan);
                return (
                  <SelectItem
                    key={plan.id}
                    value={planValue}
                    className="text-slate-300 hover:bg-slate-700"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{formatPlanName(plan)}</span>
                      <div className="flex flex-col text-xs text-slate-400 mt-1">
                        {plan.segmentacao && plan.segmentacao !== 'null' && plan.segmentacao.trim() !== '' && (
                          <span>Segmentação: {plan.segmentacao}</span>
                        )}
                        {plan.situacao && plan.situacao !== 'null' && plan.situacao.trim() !== '' && (
                          <span>Status: {plan.situacao}</span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}