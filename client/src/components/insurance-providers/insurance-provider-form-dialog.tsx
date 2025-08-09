import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InsertHealthInsuranceProvider } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Estendendo o schema para validação
const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cnpj: z.string().min(14, "CNPJ deve ter 14 dígitos"),
  ansCode: z.string().min(1, "Código ANS é obrigatório"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  website: z.string().optional(),
  contactPerson: z.string().optional(),
  active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface InsuranceProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: InsertHealthInsuranceProvider & { id?: number };
  mode: "create" | "edit";
}

export function InsuranceProviderFormDialog({
  open,
  onOpenChange,
  provider,
  mode,
}: InsuranceProviderFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const defaultValues: FormData = {
    name: provider?.name || "",
    cnpj: provider?.cnpj || "",
    ansCode: provider?.ansCode || "",
    address: provider?.address || "",
    city: provider?.city || "",
    state: provider?.state || "",
    zipCode: provider?.zipCode || "",
    phone: provider?.phone || "",
    email: provider?.email || "",
    website: provider?.website || "",
    contactPerson: provider?.contactPerson || "",
    active: provider?.active ?? true,
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  // Atualizar formulário quando os dados do provider mudarem
  useEffect(() => {
    if (provider) {
      form.reset({
        name: provider.name || "",
        cnpj: provider.cnpj || "",
        ansCode: provider.ansCode || "",
        address: provider.address || "",
        city: provider.city || "",
        state: provider.state || "",
        zipCode: provider.zipCode || "",
        phone: provider.phone || "",
        email: provider.email || "",
        website: provider.website || "",
        contactPerson: provider.contactPerson || "",
        active: provider.active ?? true,
      });
    }
  }, [provider, form]);

  const createProviderMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("/api/health-insurance-providers", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-insurance-providers"] });
      toast({
        title: "Operadora criada com sucesso",
        description: "A operadora de saúde foi adicionada ao sistema.",
        variant: "default",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar operadora",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest(`/api/health-insurance-providers/${provider?.id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-insurance-providers"] });
      toast({
        title: "Operadora atualizada com sucesso",
        description: "As informações da operadora foram atualizadas.",
        variant: "default",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar operadora",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: FormData) => {
    setIsSubmitting(true);
    if (mode === "create") {
      createProviderMutation.mutate(data);
    } else {
      updateProviderMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Cadastrar Operadora de Saúde" : "Editar Operadora de Saúde"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Preencha os dados para cadastrar uma nova operadora de saúde."
              : "Atualize os dados da operadora de saúde."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome da Operadora <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="00.000.000/0001-00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ansCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código ANS <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="00000-000" />
                    </FormControl>
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
                      <Input {...field} placeholder="(00) 0000-0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Pessoa de Contato</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="col-span-2 flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Status da Operadora</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {field.value ? "A operadora está ativa no sistema." : "A operadora está inativa no sistema."}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Cadastrar" : "Atualizar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}