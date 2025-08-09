import { useState, useEffect } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface ValidationRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
  isValid: boolean;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const [rules, setRules] = useState<ValidationRule[]>([
    {
      id: "length",
      label: "Pelo menos 8 caracteres",
      test: (pwd) => pwd.length >= 8,
      isValid: false,
    },
    {
      id: "lowercase",
      label: "Uma letra minúscula",
      test: (pwd) => /[a-z]/.test(pwd),
      isValid: false,
    },
    {
      id: "uppercase",
      label: "Uma letra maiúscula",
      test: (pwd) => /[A-Z]/.test(pwd),
      isValid: false,
    },
    {
      id: "number",
      label: "Um número",
      test: (pwd) => /\d/.test(pwd),
      isValid: false,
    },
    {
      id: "special",
      label: "Um caractere especial (!@#$%^&*)",
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      isValid: false,
    },
  ]);

  useEffect(() => {
    setRules(prevRules =>
      prevRules.map(rule => ({
        ...rule,
        isValid: rule.test(password),
      }))
    );
  }, [password]);

  const validRulesCount = rules.filter(rule => rule.isValid).length;
  const strengthPercentage = (validRulesCount / rules.length) * 100;
  
  const getStrengthColor = () => {
    if (strengthPercentage < 40) return "bg-red-500";
    if (strengthPercentage < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (strengthPercentage < 40) return "Fraca";
    if (strengthPercentage < 80) return "Média";
    return "Forte";
  };

  if (!password) return null;

  return (
    <div className={cn("space-y-3 p-3 border rounded-lg bg-slate-50", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Força da senha:</span>
          <span className={cn(
            "font-medium",
            strengthPercentage < 40 && "text-red-600",
            strengthPercentage >= 40 && strengthPercentage < 80 && "text-yellow-600",
            strengthPercentage >= 80 && "text-green-600"
          )}>
            {getStrengthText()}
          </span>
        </div>
        
        {/* Barra de progresso */}
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              getStrengthColor()
            )}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Lista de requisitos */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-600 mb-2">Requisitos:</p>
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-2 text-xs">
            {rule.isValid ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <X className="h-3 w-3 text-slate-400" />
            )}
            <span className={cn(
              "transition-colors",
              rule.isValid ? "text-green-700 font-medium" : "text-slate-600"
            )}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>

      {/* Dica adicional */}
      {strengthPercentage < 100 && (
        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded border border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Uma senha forte protege sua conta contra acessos não autorizados.
          </p>
        </div>
      )}
    </div>
  );
}