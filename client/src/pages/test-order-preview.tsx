import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import logoHospital from "@assets/chn_Niteroi_1747830500072.png";
import assinaturaMedico from "@assets/image_1747832555798.png";
import logoMedSync from "../assets/medsync-logo-new.svg";
import jsPDF from "jspdf";

// Dados de exemplo para o pedido
const mockData = {
  procedureType: 'eletiva',
  procedureLaterality: 'direito',
  clinicalIndication: 'Paciente com dor crônica no ombro direito, limitação de movimento e crepitação. Não respondeu ao tratamento conservador após 6 meses.',
  additionalNotes: 'Paciente hipertenso controlado, sem outras comorbidades relevantes.',
  secondaryProcedures: [
    {
      procedure: {
        id: 2,
        code: '3.01.01.10-0',
        name: 'Artroscopia para tratamento de lesões do manguito rotador',
        description: 'Procedimento artroscópico para reparo de lesões do manguito rotador',
        active: true,
        porte: '9B',
        custoOperacional: 'CO 4',
        porteAnestesista: '4',
        numeroAuxiliares: '2'
      },
      quantity: 1
    },
    {
      procedure: {
        id: 7,
        code: '3.07.15.10-0',
        name: 'Sutura de tendão do ombro',
        description: 'Procedimento para sutura de tendões do ombro',
        active: true,
        porte: '8C',
        custoOperacional: 'CO 3',
        porteAnestesista: '3',
        numeroAuxiliares: '1'
      },
      quantity: 1
    }
  ],
  selectedOpmeItems: [
    {
      item: {
        id: 1,
        name: 'Placa LCP para úmero proximal',
        description: 'Placa anatômica de bloqueio para úmero proximal',
        anvisaRegistrationNumber: '80123450001'
      },
      quantity: 1
    }
  ],
  selectedSuppliers: [
    {
      id: 5,
      companyName: 'Axiste Comércio de Produtos Cirúrgicos Ltda',
      tradeName: 'Axiste Medical',
      cnpj: '03.461.635/0001-39',
      address: 'Rua Eugênio de Medeiros, 303',
      city: 'São Paulo',
      state: 'SP',
      active: true
    },
    {
      id: 6,
      companyName: 'Biotecmed Produtos Médicos e Hospitalares Ltda',
      tradeName: 'Biotecmed',
      cnpj: '18.117.482/0001-91',
      address: 'Av. das Américas, 500',
      city: 'Rio de Janeiro',
      state: 'RJ',
      active: true
    },
    null
  ]
};

export default function TestOrderPreview() {
  const [data, setData] = useState(mockData);
  const documentRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleExportPDF = () => {
    if (!documentRef.current) return;
    
    // Cria um novo documento PDF em formato A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Captura o HTML para converter em PDF
    const content = documentRef.current;
    
    // Usa o html2canvas internamente para renderizar o conteúdo
    pdf.html(content, {
      callback: function(pdf) {
        // Salva o PDF com nome do paciente e data
        pdf.save(`autorizacao_cirurgica_${new Date().toISOString().split('T')[0]}.pdf`);
      },
      x: 10,
      y: 10,
      width: 190, // Largura ligeiramente menor que A4 para margens
      windowWidth: content.scrollWidth
    });
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Teste de Visualização do Pedido</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportPDF}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={16} />
            Exportar PDF
          </Button>
          <Button 
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer size={16} />
            Imprimir
          </Button>
        </div>
      </div>
      
      {/* Container que simula o tamanho e as margens de uma página A4 */}
      <div className="flex justify-center mb-10">
        <div className="relative bg-gray-200 shadow-xl" style={{ width: '210mm', height: '297mm' }}>
          {/* Indicador de tamanho A4 */}
          <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded-md">
            Prévia A4 (210 x 297 mm)
          </div>
          
          {/* Área de conteúdo com margens reduzidas no topo */}
          <div className="absolute inset-0 mt-[7.5mm] mx-[15mm] mb-[15mm]">
            {/* Div principal que conterá o documento para exportação futura em PDF */}
            <div id="documento-pedido" ref={documentRef} className="w-full h-full bg-white text-black overflow-auto p-2">
              <div className="mb-2">
                <div className="flex items-start">
                  <div className="w-40 h-16 flex items-center justify-center overflow-hidden">
                    {/* Logo do hospital atualizado usando importação direta - aumentado em 30% */}
                    <img 
                      src={logoHospital} 
                      alt="Logo do Complexo Hospitalar de Niterói" 
                      className="max-h-full object-contain"
                    />
                  </div>
                </div>
              </div>
              
              {/* Informações do paciente */}
              <div className="mb-5 p-2 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold mb-1 border-b pb-1">Dados do Paciente</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-xs">
                    <p><span className="font-medium">Nome:</span> Rodrigo Roitman Pozzatti</p>
                    <p><span className="font-medium">Data de Nascimento:</span> 15/08/1990</p>
                    <p><span className="font-medium">Idade:</span> 34 anos</p>
                  </div>
                  <div className="text-xs">
                    <p><span className="font-medium">Plano de Saúde:</span> Bradesco Saúde</p>
                    <p><span className="font-medium">Número da Carteirinha:</span> 123456789012345</p>
                    <p><span className="font-medium">Tipo do Plano:</span> Premium</p>
                  </div>
                </div>
              </div>
              
              {/* Título do documento após dados do paciente */}
              <div className="pb-1 mb-4">
                <h2 className="text-base font-bold text-center text-blue-900">AUTORIZAÇÃO DE PROCEDIMENTO CIRÚRGICO</h2>
                
                {/* Indicação clínica e observações - Texto mais compacto */}
                <div className="mt-2 text-xs text-justify bg-gray-50 p-2 rounded-md">
                  <p className="mb-1">
                    Paciente apresenta dor e limitação do arco de movimento do ombro esquerdo com piora clínica e limitação das atividades diárias há 6 meses, não tolera atividades de força, refere piora gradativa, dor noturna intensa.
                  </p>
                  <p className="mb-1">
                    Ao exame físico, testes irritativos para o manguito rotador, dor intensa na articulação acromioclavicular e Bear Hug teste positivo. Exame de imagem: tendinopatia do manguito rotador, edema medular no terço distal da clavícula, alterações degenerativas da articulação acromioclavicular.
                  </p>
                  <p>
                    Após analgesia e fisioterapia (40 sessões) sem melhora. Solicito procedimento cirúrgico de Mumford da extremidade lateral da clávicula, sinovectomia e bloqueio nos ramos sensitivos dos nervos supraescapular e axilar.
                  </p>
                </div>
              </div>
              
              {/* Conteúdo do documento estruturado para PDF - sem os campos removidos conforme solicitação */}
              <div className="space-y-4 mt-4">
                {/* Dados do procedimento */}
                <div className="pb-2">
                  <div className="space-y-2">
                    {/* Procedimento Cirúrgico Principal */}
                    <div>
                      <p className="font-medium text-xs text-gray-700">Procedimento Cirúrgico Principal:</p>
                      <p className="text-xs text-gray-900 pl-4">1 x 3.01.01.10-0 - Artroscopia para tratamento de lesões do manguito rotador</p>
                    </div>
                    
                    {/* Procedimentos Cirúrgicos Secundários */}
                    <div>
                      <p className="font-medium text-xs text-gray-700">Procedimentos Cirúrgicos Secundários:</p>
                      <div className="grid grid-cols-1 text-xs text-gray-900 pl-4 gap-0.5">
                        <p>1 x 3.07.15.10-0 - Sutura de tendão do ombro</p>
                        <p>1 x 3.01.01.10-0 - Sinovectomia articular</p>
                      </div>
                    </div>
                    
                    <div className="flex text-xs">
                      <div className="w-1/2">
                        <p className="font-medium text-gray-700">Caráter do Procedimento:</p>
                        <p className="text-gray-900 pl-4">{data.procedureType === 'eletiva' ? 'Eletivo' : 'Urgência'}</p>
                      </div>
                      
                      {data.procedureLaterality && (
                        <div className="w-1/2">
                          <p className="font-medium text-gray-700">Lateralidade do Procedimento:</p>
                          <p className="text-gray-900 pl-4">{data.procedureLaterality === 'direito' ? 'Direito' : 
                            data.procedureLaterality === 'esquerdo' ? 'Esquerdo' : 
                            data.procedureLaterality === 'bilateral' ? 'Bilateral' : 'Indeterminado'}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Lista de Materiais Necessários - em coluna única */}
                    <div>
                      <p className="font-medium text-xs text-gray-700">Lista de Materiais Necessários:</p>
                      <div className="flex flex-col text-xs text-gray-900 pl-4 gap-0.5">
                        <p>1 x Placa LCP para úmero proximal</p>
                        <p>2 x Parafusos corticais 3.5mm</p>
                        <p>4 x Parafusos de bloqueio 3.5mm</p>
                        <p>1 x Fio Guia de Kirschner 2.0mm</p>
                      </div>
                    </div>
                    
                    {/* Fornecedores Indicados */}
                    <div>
                      <p className="font-medium text-xs text-gray-700">Fornecedores Indicados:</p>
                      <div className="grid grid-cols-1 text-xs text-gray-900 pl-4 gap-0.5">
                        <p>Axiste Medical - CNPJ: 03.461.635/0001-39</p>
                        <p>Biotecmed - CNPJ: 18.117.482/0001-91</p>
                        <p>Johnson & Johnson - CNPJ: 54.516.661/0001-01</p>
                      </div>
                    </div>
                    
                    {/* Local e Data */}
                    <div className="mt-4 text-right">
                      <p className="text-xs text-gray-900">Niterói, 21 de Maio de 2025</p>
                    </div>
                    
                    {/* Carimbo e Assinatura */}
                    <div className="mt-2 flex justify-center">
                      <img src={assinaturaMedico} alt="Carimbo e Assinatura do Médico" className="h-24" />
                    </div>
                    
                    {/* Dados do Médico */}
                    <div className="mt-1 flex flex-col items-center">
                      <div className="border-t border-gray-400 w-48 mb-1"></div>
                      <p className="text-xs font-bold text-gray-900">RODRIGO ROITMAN POZZATTI</p>
                      <p className="text-xs text-gray-900">ORTOPEDIA E TRAUMATOLOGIA</p>
                      <p className="text-xs text-gray-900">CRM 52 103932-6</p>
                    </div>
                    
                    {/* Rodapé com logo MedSync e versão - posicionado no fim da página */}
                    <div className="absolute bottom-0 left-0 right-0 pt-1 border-t border-gray-300 flex flex-row items-center justify-center">
                      <img src={logoMedSync} alt="Logo MedSync" className="h-8 mr-2" />
                      <p className="text-xs text-gray-500">Documento gerado por MedSync v2.5.3</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles para ajustar o layout */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Controles de Teste</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Button 
              onClick={() => setData({...data, procedureType: data.procedureType === 'eletiva' ? 'urgencia' : 'eletiva'})}
              className="w-full"
              variant="outline"
            >
              Alternar Caráter do Procedimento
            </Button>
          </div>
          <div>
            <Button 
              onClick={() => {
                const lateralidades = ['direito', 'esquerdo', 'bilateral', 'indeterminado', null];
                const currentIndex = lateralidades.indexOf(data.procedureLaterality);
                const nextIndex = (currentIndex + 1) % lateralidades.length;
                setData({...data, procedureLaterality: lateralidades[nextIndex]});
              }}
              className="w-full"
              variant="outline"
            >
              Alternar Lateralidade
            </Button>
          </div>
        </div>
      </div>
      
      {/* Estilos para impressão */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #documento-pedido, #documento-pedido * {
            visibility: visible;
          }
          #documento-pedido {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
          }
        }
      `}</style>
    </div>
  );
}