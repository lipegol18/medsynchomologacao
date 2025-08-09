import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TestPatientForm({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState({
    fullName: "",
    cpf: "",
    email: "",
    phone: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    console.log(`Campo ${name} alterado para: ${value}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Dados do formulário:", formData);
    alert("Formulário enviado com sucesso!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Teste de Formulário de Paciente</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome Completo</label>
            <Input 
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nome completo do paciente"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">CPF</label>
            <Input 
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              placeholder="000.000.000-00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input 
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@exemplo.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Telefone</label>
            <Input 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(00) 00000-0000"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}