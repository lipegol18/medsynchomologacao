import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TableProperties } from "lucide-react";
import { Scanner } from "@/components/ui/scanner";
import { insertPatientSchema, type Patient } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface PatientInfoProps {
  patient: Patient | null;
  setPatient: (patient: Patient) => void;
}

// Extend the schema with specific validation rules
const formSchema = insertPatientSchema.extend({
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
});

const genderOptions = [
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Outro" },
];

const insuranceOptions = [
  { value: "unimed", label: "Unimed" },
  { value: "amil", label: "Amil" },
  { value: "bradesco", label: "Bradesco Saúde" },
  { value: "sulamerica", label: "SulAmérica" },
  { value: "other", label: "Outro" },
];

export function PatientInfo({ patient, setPatient }: PatientInfoProps) {
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: patient?.fullName || "",
      cpf: patient?.cpf || "",
      birthDate: patient?.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : "",
      gender: patient?.gender || "",
      phone: patient?.phone || "",
      insurance: patient?.insurance || "",
      insuranceNumber: patient?.insuranceNumber || "",
      notes: patient?.notes || "",
    },
  });

  const onSubmit = useCallback((data: z.infer<typeof formSchema>) => {
    // This is handled by the parent component when moving to the next step
    if (!patient) {
      const newPatient = {
        id: 0, // Temporary ID, will be assigned by backend
        ...data,
      };
      setPatient(newPatient as Patient);

      toast({
        title: "Paciente cadastrado",
        description: "Informações do paciente registradas com sucesso",
      });
    } else {
      setPatient({
        ...patient,
        ...data,
      });

      toast({
        title: "Paciente atualizado",
        description: "Informações do paciente atualizadas com sucesso",
      });
    }
  }, [patient, setPatient, toast]);

  const handleScanComplete = useCallback((extractedText: string) => {
    setIsScanning(false);
    
    // Basic Brazilian document data extraction
    // This is a simplified example - in a real app, we would use more robust pattern matching
    
    // Extract name
    const nameMatch = extractedText.match(/Nome[:\s]+([^\n]+)/i);
    if (nameMatch && nameMatch[1]) {
      form.setValue("fullName", nameMatch[1].trim());
    }
    
    // Extract CPF
    const cpfMatch = extractedText.match(/CPF[:\s]+([0-9.-]+)/i) || 
                    extractedText.match(/([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2})/);
    if (cpfMatch && cpfMatch[1]) {
      form.setValue("cpf", cpfMatch[1].trim());
    }
    
    // Extract birth date (assuming DD/MM/YYYY format in document)
    const dateMatch = extractedText.match(/Nascimento[:\s]+([0-9/]+)/i) || 
                     extractedText.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);
    if (dateMatch && dateMatch[1]) {
      const parts = dateMatch[1].split('/');
      if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        form.setValue("birthDate", isoDate);
      }
    }
    
    toast({
      title: "Documento processado",
      description: "Dados extraídos e preenchidos nos campos correspondentes",
    });
  }, [form, toast]);

  // Update form when patient props change
  useEffect(() => {
    if (patient) {
      form.reset({
        fullName: patient.fullName,
        cpf: patient.cpf,
        birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : "",
        gender: patient.gender,
        phone: patient.phone || "",
        insurance: patient.insurance || "",
        insuranceNumber: patient.insuranceNumber || "",
        notes: patient.notes || "",
      });
    }
  }, [patient, form]);

  return (
    <>
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-medium text-neutral-800 mb-4">Informações do Paciente</h3>
        
        {isScanning ? (
          <Scanner
            onScanComplete={handleScanComplete}
            type="identification"
          />
        ) : (
          <div className="mb-6 border-2 border-dashed border-neutral-300 rounded-lg p-4 bg-neutral-50">
            <div className="text-center">
              <TableProperties className="h-12 w-12 mx-auto mb-2 text-neutral-400" />
              <h4 className="font-medium text-neutral-700 mb-1">Escanear Documento</h4>
              <p className="text-sm text-neutral-500 mb-4">
                Escaneie um documento de identificação brasileiro para preencher automaticamente os dados do paciente
              </p>
              
              <button 
                className="bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
                onClick={() => setIsScanning(true)}
              >
                Iniciar Escaneamento
              </button>
            </div>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo do paciente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 123.456.789-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genderOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="insurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Convênio</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um convênio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {insuranceOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="insuranceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Carteirinha</FormLabel>
                    <FormControl>
                      <Input placeholder="Número do convênio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Clínicas</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre o paciente (alergias, condições pré-existentes, etc.)" 
                      className="resize-none" 
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </Card>
      
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6 opacity-70">
        <div className="flex items-center mb-4">
          <TableProperties className="mr-2 text-neutral-500" />
          <h3 className="text-lg font-medium text-neutral-800">
            Laudo do Exame de Imagem
            <span className="ml-3 text-sm font-normal text-neutral-500">(Próximo passo)</span>
          </h3>
        </div>
        
        <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
          <div className="flex items-center justify-center h-24">
            <span className="material-icons text-neutral-400 mr-2">lock</span>
            <p className="text-neutral-500">Complete as informações do paciente para continuar</p>
          </div>
        </div>
      </Card>
    </>
  );
}
