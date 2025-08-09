import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Definir os schemas de validação
export const OpmeItemFormSchema = z.object({
  technicalName: z.string().min(1, "Nome técnico é obrigatório"),
  commercialName: z.string().min(1, "Nome comercial é obrigatório"),
  anvisaRegistrationNumber: z.string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  processNumber: z.string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  riskClass: z.string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  holderCnpj: z.string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  registrationHolder: z.string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  manufacturerName: z.string().min(1, "Fabricante é obrigatório"),
  countryOfManufacture: z.string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  registrationDate: z.date().optional().nullable(),
  expirationDate: z.date().optional().nullable(),
  isValid: z.boolean().default(true),
});

export type OpmeItemFormValues = z.infer<typeof OpmeItemFormSchema>;

interface OpmeItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onSave: (data: OpmeItemFormValues) => void;
  isSubmitting?: boolean;
}

export const OpmeItemForm = ({ 
  isOpen, 
  onClose, 
  initialData, 
  onSave,
  isSubmitting = false
}: OpmeItemFormProps) => {
  const form = useForm<OpmeItemFormValues>({
    resolver: zodResolver(OpmeItemFormSchema),
    defaultValues: initialData || {
      technicalName: "",
      commercialName: "",
      manufacturerName: "",
      anvisaRegistrationNumber: "",
      processNumber: "",
      riskClass: "",
      holderCnpj: "",
      registrationHolder: "",
      countryOfManufacture: "",
      registrationDate: null,
      expirationDate: null,
      isValid: true,
    },
  });

  const riskClassOptions = [
    { value: "I", label: "I" },
    { value: "II", label: "II" },
    { value: "III", label: "III" },
    { value: "IV", label: "IV" },
  ];

  const countryOptions = [
    { value: "Brasil", label: "Brasil" },
    { value: "Estados Unidos", label: "Estados Unidos" },
    { value: "Alemanha", label: "Alemanha" },
    { value: "China", label: "China" },
    { value: "Suíça", label: "Suíça" },
    { value: "Japão", label: "Japão" },
    { value: "França", label: "França" },
    { value: "Índia", label: "Índia" },
    { value: "Itália", label: "Itália" },
    { value: "Reino Unido", label: "Reino Unido" },
  ];
  
  // Função para formatar CNPJ enquanto o usuário digita
  const formatCNPJ = (value: string) => {
    if (!value) return value;
    
    // Remove todos os caracteres não numéricos
    const cnpj = value.replace(/\D/g, '');
    
    // Aplica a máscara do CNPJ: 00.000.000/0000-00
    if (cnpj.length <= 2) {
      return cnpj;
    } else if (cnpj.length <= 5) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
    } else if (cnpj.length <= 8) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
    } else if (cnpj.length <= 12) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
    } else {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
    }
  };

  function onSubmit(values: OpmeItemFormValues) {
    onSave(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar" : "Adicionar"} Item OPME</DialogTitle>
          <DialogDescription>
            {initialData 
              ? "Atualize as informações do item OPME abaixo." 
              : "Preencha as informações para adicionar um novo item OPME ao catálogo."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Tabs defaultValue="identificacao" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="identificacao">Identificação</TabsTrigger>
                <TabsTrigger value="registro">Dados de Registro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="identificacao" className="space-y-3 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="technicalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Técnico*</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Placa bloqueada para fêmur" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commercialName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Comercial*</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: TARGON - Sistema de haste" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="manufacturerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fabricante*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do fabricante" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="countryOfManufacture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>País de Fabricação</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o país de fabricação" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countryOptions.map((option) => (
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
                </div>
              </TabsContent>
              
              <TabsContent value="registro" className="space-y-3 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="anvisaRegistrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registro ANVISA</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: 10380700000" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="processNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número do Processo</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: 25351.123456/2021-00" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="riskClass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classe de Risco</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a classe de risco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {riskClassOptions.map((option) => (
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
                    name="isValid"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-start space-x-3 space-y-0 rounded-md border p-4 mt-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Registro Válido</FormLabel>
                          <FormDescription>
                            Indica se o registro ANVISA está válido
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="registrationHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detentor do Registro</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome da empresa detentora do registro" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="holderCnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ do Detentor</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="00.000.000/0000-00" 
                            {...field} 
                            value={formatCNPJ(field.value || "")}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="registrationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data do Registro</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "dd/MM/yyyy")
                                ) : (
                                  <span>Selecionar data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date)}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Validade</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "dd/MM/yyyy")
                                ) : (
                                  <span>Selecionar data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date)}
                              disabled={(date) =>
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <span className="mr-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                )}
                {initialData ? "Atualizar" : "Adicionar"} Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};