import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, ShieldCheck, X } from "lucide-react";

export function LgpdDisclaimer() {
  // Componente desabilitado conforme solicitado - o diálogo não será mostrado
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Forçar a definição como "aceito" para evitar que seja exibido novamente
    localStorage.setItem("lgpdAccepted", "true");
  }, []);

  const handleAccept = () => {
    console.log("Botão aceitar clicado");
    // Salva no localStorage para não mostrar novamente
    localStorage.setItem("lgpdAccepted", "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <ShieldCheck className="mr-2 h-6 w-6 text-primary" />
            Termo de Consentimento para Tratamento de Dados Pessoais
          </DialogTitle>
          <DialogDescription className="pt-2 text-muted-foreground">
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD) - Lei nº 13.709/2018
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-4 text-foreground text-sm">
            <p>
              O MedSync está comprometido com a proteção dos seus dados pessoais. Ao utilizar nosso sistema, 
              você concorda com a coleta e processamento de suas informações conforme descrito neste termo.
            </p>

            <h3 className="font-semibold text-primary text-base mt-4">Finalidade do Tratamento</h3>
            <p>
              Seus dados pessoais e de saúde serão utilizados exclusivamente para:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gerenciamento de pedidos cirúrgicos e materiais OPME (Órteses, Próteses e Materiais Especiais)</li>
              <li>Cadastro e identificação de pacientes</li>
              <li>Processamento de laudos médicos</li>
              <li>Geração de relatórios necessários ao procedimento médico</li>
              <li>Comunicações relacionadas ao seu atendimento médico</li>
            </ul>

            <h3 className="font-semibold text-primary text-base mt-4">Dados Pessoais Coletados</h3>
            <p>
              Coletamos e processamos os seguintes tipos de dados:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dados de identificação pessoal (nome, CPF, data de nascimento)</li>
              <li>Dados de contato (telefone, endereço)</li>
              <li>Dados do convênio médico</li>
              <li>Dados sensíveis de saúde, incluindo laudos médicos, histórico de procedimentos e condições de saúde</li>
            </ul>

            <h3 className="font-semibold text-primary text-base mt-4">Armazenamento e Segurança</h3>
            <p>
              Adotamos medidas técnicas e organizacionais apropriadas para proteger seus dados pessoais contra 
              acesso não autorizado, perda, alteração ou divulgação. Seus dados serão armazenados pelo período 
              necessário para cumprir as finalidades descritas neste termo e atender às exigências legais e 
              regulatórias aplicáveis.
            </p>

            <h3 className="font-semibold text-primary text-base mt-4">Seus Direitos</h3>
            <p>
              De acordo com a LGPD, você tem direito a:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos</li>
              <li>Revogar o consentimento a qualquer momento</li>
              <li>Solicitar a portabilidade dos dados a outro fornecedor de serviço</li>
            </ul>

            <p className="text-muted-foreground italic mt-4">
              Observação: O tratamento de dados de saúde é considerado sensível pela LGPD e requer proteção 
              especial. Garantimos que esses dados serão tratados com o mais alto nível de segurança e 
              confidencialidade, sendo acessados apenas por profissionais autorizados e vinculados ao 
              sigilo profissional.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-2 pt-4">
          <div className="flex items-center text-xs text-muted-foreground">
            <Info className="h-4 w-4 mr-1" />
            <span>Ao clicar em "Aceitar", você concorda com nossos termos de uso.</span>
          </div>
          <Button type="button" onClick={handleAccept} className="min-w-[120px]">
            Aceitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}