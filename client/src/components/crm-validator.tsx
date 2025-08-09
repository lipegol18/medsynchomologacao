import { useState } from 'react';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CRMValidatorProps {
  id?: string;
  crmValue: string | number | undefined;
  onChange: (value: string) => void;
  onValidate: (value: boolean) => void;
  disabled?: boolean;
}

export function CRMValidator({ 
  id = 'crm', 
  crmValue, 
  onChange, 
  onValidate,
  disabled = false 
}: CRMValidatorProps) {
  const { toast } = useToast();
  const [validatedDoctorName, setValidatedDoctorName] = useState('');
  const [validatedDoctorLocation, setValidatedDoctorLocation] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Função para validar CRM
  const validateCRM = async (crm: number | string) => {
    if (!crm || crm.toString().length < 4) {
      setValidatedDoctorName('');
      setValidatedDoctorLocation('');
      onValidate(false);
      return false;
    }
    
    console.log(`CRM informado: ${crm}`);
    
    // Aceita qualquer CRM com pelo menos 4 dígitos
    setValidatedDoctorName('CRM válido');
    setValidatedDoctorLocation('');
    onValidate(true);
    return true;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>CRM (para médicos)</Label>
      <div className="flex space-x-2">
        <Input
          id={id}
          type="text"
          placeholder="Digite o CRM (somente números)"
          value={crmValue || ''}
          onChange={(e) => {
            // Permite apenas números
            const value = e.target.value.replace(/\D/g, '');
            onChange(value);
            
            // Limpa validação quando campo fica vazio
            if (value.length === 0) {
              setValidatedDoctorName('');
              setValidatedDoctorLocation('');
              onValidate(false);
            } else if (value.length >= 4) {
              // Só valida se tiver pelo menos 4 dígitos
              validateCRM(value);
            }
          }}
          onBlur={() => crmValue && validateCRM(crmValue)}
          disabled={disabled}
        />
      </div>
      
      {/* Exibir o nome do médico se o CRM for validado */}
      {validatedDoctorName && (
        <div className="text-sm font-medium text-green-600 mt-1">
          <span className="flex items-center">
            <Check className="h-4 w-4 mr-1" />
            {validatedDoctorName}
          </span>
          {validatedDoctorLocation && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-5 pl-1">
              {validatedDoctorLocation}
            </span>
          )}
        </div>
      )}
    </div>
  );
}