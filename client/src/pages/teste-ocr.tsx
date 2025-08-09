import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ScanLine, Upload, FileText, CreditCard, User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Tesseract from 'tesseract.js';

interface ExtratedData {
  fullName?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  gender?: 'M' | 'F';
  planType?: string;
  cardNumber?: string;
  expirationDate?: string;
  documentType?: 'rg' | 'insurance-card' | 'unknown';
}

export default function TesteOCR() {
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [extractedData, setExtractedData] = useState<ExtratedData>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setRawText("");
    setConfidenceScore(0);
    setExtractedData({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processarDocumento = async (file: File) => {
    if (!file) return;

    setProcessing(true);
    setRawText("");
    setConfidenceScore(0);
    setExtractedData({});

    try {
      // Processamento OCR com Tesseract.js
      const result = await Tesseract.recognize(
        file,
        'por', // Utilizando o idioma português
        {
          logger: (m) => {
            console.log(m);
          }
        }
      );

      setRawText(result.data.text);
      setConfidenceScore(result.data.confidence);

      // Análise do texto para extração de dados
      const text = result.data.text.toLowerCase();
      let extractedInfo: ExtratedData = {};

      // Determinar tipo de documento
      if (
        text.includes("identidade") || 
        text.includes("registro geral") || 
        text.includes("rg") || 
        text.includes("república federativa do brasil")
      ) {
        extractedInfo.documentType = 'rg';
        
        // Processar como RG
        // Extrair CPF
        const cpfRegex = /(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2})/gi;
        const cpfMatch = text.match(cpfRegex);
        if (cpfMatch && cpfMatch.length > 0) {
          extractedInfo.cpf = cpfMatch[0].replace(/[^\d]/g, "");
        }

        // Extrair RG
        const rgRegex = /(\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{1,2})/gi;
        const rgMatch = text.match(rgRegex);
        if (rgMatch && rgMatch.length > 0) {
          // Filtrar para evitar confusão com CPF
          const possibleRg = rgMatch.filter(item => {
            const digits = item.replace(/[^\d]/g, "");
            return digits.length < 11; // RG geralmente tem menos dígitos que CPF
          });
          
          if (possibleRg.length > 0) {
            extractedInfo.rg = possibleRg[0].replace(/[^\d]/g, "");
          }
        }

        // Extrair nome
        const nameLines = text.split('\n').filter(line => 
          !line.includes("república") && 
          !line.includes("federativa") && 
          !line.includes("brasil") && 
          !line.includes("identidade") &&
          !line.includes("registro") &&
          !line.includes("nascimento") &&
          !line.includes("expedição") &&
          !line.includes("doc.") &&
          line.length > 5
        );
        
        if (nameLines.length > 0) {
          // Tentar encontrar a linha que parece com um nome
          const nameLine = nameLines.find(line => 
            !line.match(/^\d/) && // Não começa com número
            !line.includes("/") && // Não contém data
            line.split(" ").length > 1 // Tem pelo menos duas palavras
          );
          
          if (nameLine) {
            extractedInfo.fullName = nameLine.trim()
              .split(" ")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
          }
        }

        // Extrair data de nascimento
        const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
        const dateMatches = text.match(dateRegex);
        if (dateMatches && dateMatches.length > 0) {
          extractedInfo.birthDate = dateMatches[0];
        }

        // Tentar identificar gênero
        if (text.includes("sexo: m") || text.includes("sexo m") || text.includes("sex: m") || text.includes("sex m")) {
          extractedInfo.gender = 'M';
        } else if (text.includes("sexo: f") || text.includes("sexo f") || text.includes("sex: f") || text.includes("sex f")) {
          extractedInfo.gender = 'F';
        } else {
          // Inferência baseada no nome
          const firstNameMatch = extractedInfo.fullName?.match(/^(\S+)/);
          if (firstNameMatch && firstNameMatch[1]) {
            const firstName = firstNameMatch[1].toLowerCase();
            // Lista de terminações comuns para nomes femininos em português
            const femaleEndings = ['a', 'ia', 'na', 'ina', 'ana', 'ela', 'ria', 'lia', 'isa'];
            const isFemale = femaleEndings.some(ending => firstName.endsWith(ending));
            extractedInfo.gender = isFemale ? 'F' : 'M';
          }
        }
      } 
      // Verificar se é carteirinha de plano de saúde
      else if (
        text.includes("plano") || 
        text.includes("saúde") || 
        text.includes("seguro") || 
        text.includes("beneficiário") ||
        text.includes("convênio") ||
        text.includes("bradesco") ||
        text.includes("unimed") ||
        text.includes("amil") ||
        text.includes("sulamerica")
      ) {
        extractedInfo.documentType = 'insurance-card';
        
        // Extrair nome do beneficiário
        const nameLines = text.split('\n').filter(line => 
          !line.includes("plano") && 
          !line.includes("saúde") && 
          !line.includes("seguro") && 
          !line.includes("beneficiário") &&
          !line.includes("validade") &&
          !line.includes("cartão") &&
          line.length > 5
        );
        
        if (nameLines.length > 0) {
          // Tentar encontrar a linha que parece com um nome
          const nameLine = nameLines.find(line => 
            !line.match(/^\d/) && // Não começa com número
            !line.includes("/") && // Não contém data
            line.split(" ").length > 1 // Tem pelo menos duas palavras
          );
          
          if (nameLine) {
            extractedInfo.fullName = nameLine.trim()
              .split(" ")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
          }
        }
        
        // Extrair número da carteirinha
        const cardRegex = /\b\d{6,20}\b/g; // Números com 6-20 dígitos
        const cardMatches = text.match(cardRegex);
        if (cardMatches && cardMatches.length > 0) {
          extractedInfo.cardNumber = cardMatches[0];
        }
        
        // Tenta identificar tipo do plano
        const planTypes = ["básico", "essencial", "premium", "master", "plus", "família", "individual", "empresarial"];
        for (const type of planTypes) {
          if (text.includes(type)) {
            extractedInfo.planType = type.charAt(0).toUpperCase() + type.slice(1);
            break;
          }
        }
        
        // Extrair data de validade
        const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
        const dateMatches = text.match(dateRegex);
        if (dateMatches && dateMatches.length > 0) {
          extractedInfo.expirationDate = dateMatches[0];
        }
      } else {
        extractedInfo.documentType = 'unknown';
      }

      setExtractedData(extractedInfo);
      
      // Mudar para a aba de resultado após o processamento
      setActiveTab("results");
    } catch (error) {
      console.error("Erro no processamento OCR:", error);
      setRawText(`Erro no processamento: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teste de OCR</h1>
        <Button variant="outline" onClick={resetForm}>
          Limpar
        </Button>
      </div>
      
      <Alert className="mb-6">
        <ScanLine className="h-4 w-4" />
        <AlertTitle>Teste de processamento OCR</AlertTitle>
        <AlertDescription>
          Esta página permite testar o processamento OCR em documentos como RG e carteirinhas de planos de saúde.
          Os dados são processados localmente e não são armazenados.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Documento</CardTitle>
            <CardDescription>
              Selecione um documento para análise OCR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
                <TabsTrigger value="camera" className="flex-1">Câmera</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    id="file-upload"
                  />
                  <Button 
                    variant="secondary" 
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Selecionar arquivo
                  </Button>
                </div>
                
                {selectedFile && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-1">Arquivo selecionado:</p>
                    <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                      <FileText className="h-4 w-4" />
                      <span className="truncate flex-1">{selectedFile.name}</span>
                      <Badge>{Math.round(selectedFile.size / 1024)} KB</Badge>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="camera" className="space-y-4">
                <div className="flex flex-col items-center justify-center border border-gray-300 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Funcionalidade de câmera em desenvolvimento
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={() => selectedFile && processarDocumento(selectedFile)} 
              disabled={!selectedFile || processing}
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Processar documento
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Resultado da Análise</CardTitle>
            <CardDescription>
              Dados extraídos do documento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {preview ? (
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={preview} 
                      alt="Preview do documento" 
                      className="w-full h-auto object-contain max-h-[300px]"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center border border-dashed rounded-lg h-[300px]">
                    <p className="text-muted-foreground">Nenhuma imagem selecionada</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {extractedData.documentType && (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Tipo de documento:</h3>
                      <Badge variant={extractedData.documentType === 'unknown' ? 'destructive' : 'default'}>
                        {extractedData.documentType === 'rg' && 'Documento de Identidade (RG)'}
                        {extractedData.documentType === 'insurance-card' && 'Carteirinha de Plano de Saúde'}
                        {extractedData.documentType === 'unknown' && 'Não identificado'}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    {extractedData.documentType === 'rg' && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium">Dados pessoais</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label htmlFor="name" className="text-xs">Nome completo</Label>
                              <Input id="name" value={extractedData.fullName || ""} readOnly className="bg-muted" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="rg" className="text-xs">RG</Label>
                                <Input id="rg" value={extractedData.rg || ""} readOnly className="bg-muted" />
                              </div>
                              <div>
                                <Label htmlFor="cpf" className="text-xs">CPF</Label>
                                <Input id="cpf" value={extractedData.cpf || ""} readOnly className="bg-muted" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="birthdate" className="text-xs">Data de nascimento</Label>
                                <Input id="birthdate" value={extractedData.birthDate || ""} readOnly className="bg-muted" />
                              </div>
                              <div>
                                <Label htmlFor="gender" className="text-xs">Gênero</Label>
                                <Input 
                                  id="gender" 
                                  value={extractedData.gender === 'M' ? 'Masculino' : extractedData.gender === 'F' ? 'Feminino' : ''} 
                                  readOnly 
                                  className="bg-muted" 
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {extractedData.documentType === 'insurance-card' && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium">Dados do plano</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label htmlFor="holder-name" className="text-xs">Nome do beneficiário</Label>
                              <Input id="holder-name" value={extractedData.fullName || ""} readOnly className="bg-muted" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="card-number" className="text-xs">Número da carteirinha</Label>
                                <Input id="card-number" value={extractedData.cardNumber || ""} readOnly className="bg-muted" />
                              </div>
                              <div>
                                <Label htmlFor="plan-type" className="text-xs">Tipo de plano</Label>
                                <Input id="plan-type" value={extractedData.planType || ""} readOnly className="bg-muted" />
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="expiration" className="text-xs">Validade</Label>
                              <Input id="expiration" value={extractedData.expirationDate || ""} readOnly className="bg-muted" />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
                
                {!extractedData.documentType && rawText && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Nenhum dado extraído ainda</p>
                  </div>
                )}
                
                {!rawText && !processing && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <ScanLine className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-center">
                      Selecione um documento e clique em "Processar documento" para iniciar a análise OCR
                    </p>
                  </div>
                )}
                
                {processing && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
                    <p className="text-muted-foreground text-center">
                      Processando documento...
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {rawText && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Texto extraído</h3>
                  <Badge variant="outline">
                    Confiança: {confidenceScore.toFixed(2)}%
                  </Badge>
                </div>
                <Textarea
                  value={rawText}
                  readOnly
                  className="font-mono text-xs h-[150px]"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}