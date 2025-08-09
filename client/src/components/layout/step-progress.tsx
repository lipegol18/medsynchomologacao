import React from "react";
import { cn } from "@/lib/utils";

export interface Step {
  number: number;
  label: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

export function StepProgress({ steps, currentStep, onStepClick }: StepProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  // Só permitimos clicar em passos já concluídos ou no passo atual
                  currentStep >= step.number 
                    ? "bg-primary text-card cursor-pointer hover:brightness-110 hover:scale-105 transition-all" 
                    : "border-2 border-[hsl(217,33%,20%)] text-muted-foreground",
                  // Destaque para o passo atual se for o selecionado
                  currentStep === step.number && "ring-2 ring-offset-2 ring-primary"
                )}
                onClick={() => {
                  // Só permitimos navegação para passos já concluídos (ou o atual)
                  if (onStepClick && currentStep >= step.number) {
                    onStepClick(step.number);
                  }
                }}
                role="button"
                tabIndex={currentStep >= step.number ? 0 : -1}
                aria-label={`Ir para o passo ${step.number}: ${step.label}`}
              >
                {step.number}
              </div>
              <span 
                className={cn(
                  "text-xs mt-1",
                  currentStep >= step.number 
                    ? "text-primary font-medium cursor-pointer" 
                    : "text-muted-foreground"
                )}
                onClick={() => {
                  // Só permitimos navegação para passos já concluídos (ou o atual)
                  if (onStepClick && currentStep >= step.number) {
                    onStepClick(step.number);
                  }
                }}
              >
                {step.label}
              </span>
            </div>
            
            {/* Add divider if not the last step */}
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "flex-1 h-1 mx-2",
                  currentStep > step.number 
                    ? "bg-primary" 
                    : "bg-[hsl(217,33%,20%)]"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
