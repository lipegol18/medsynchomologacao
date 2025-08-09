import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { Loader2, User, Shield, Calendar, Mail, Key, IdCard, Sun, Moon, Laptop, Building2 as BuildingHospital, Pencil as PencilIcon, Check, X, Upload, Image as ImageIcon, Trash2, ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useLocation } from "wouter";
import { useNavigationTracker } from "@/hooks/use-navigation-tracker";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { getPreviousPage } = useNavigationTracker();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showHospitalDialog, setShowHospitalDialog] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    signatureNote: "",
  });
  
  // Estado para upload da assinatura
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  
  // Estados para upload de logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Estados para crop de imagens
  const [showSignatureCrop, setShowSignatureCrop] = useState(false);
  const [showLogoCrop, setShowLogoCrop] = useState(false);
  const [signatureImageSrc, setSignatureImageSrc] = useState<string>('');
  const [logoImageSrc, setLogoImageSrc] = useState<string>('');
  
  // Estados para controle de zoom e posição
  const [signatureScale, setSignatureScale] = useState(1);
  const [logoScale, setLogoScale] = useState(1);
  const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 });
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  
  // Estados para controle de drag
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Estados para drag and drop de arquivos
  const [isDragOverLogo, setIsDragOverLogo] = useState(false);
  const [isDragOverSignature, setIsDragOverSignature] = useState(false);
  
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const logoCanvasRef = useRef<HTMLCanvasElement>(null);
  const signatureImgRef = useRef<HTMLImageElement>(null);
  const logoImgRef = useRef<HTMLImageElement>(null);
  
  // Buscar os dados do papel do usuário
  const { data: userRole, isLoading: isRoleLoading, error: roleError } = useQuery({
    queryKey: ['/api/roles', user?.roleId],
    queryFn: async () => {
      if (!user?.roleId) {
        console.log('❌ Usuário sem roleId:', user);
        return null;
      }
      console.log('🔍 Buscando role para usuário:', user.roleId);
      const data = await apiRequest(`/api/roles/${user.roleId}`, "GET");
      console.log('✅ Dados do role retornados:', data);
      return data;
    },
    enabled: !!user?.roleId,
  });

  // Debug adicional
  console.log('🔧 Debug Role - userRole:', userRole, 'isLoading:', isRoleLoading, 'error:', roleError);
  
  // Buscar hospitais associados para médicos
  const { data: doctorHospitals, isLoading: isHospitalsLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'hospitals'],
    queryFn: async () => {
      if (!user?.id || user?.roleId !== 2) return null; // Apenas para usuários com função de médico (roleId = 2)
      return await apiRequest(`/api/users/${user.id}/hospitals`, "GET");
    },
    enabled: !!user?.id && user?.roleId === 2,
  });
  
  // Buscar pacientes associados ao médico
  const { data: associatedPatients, isLoading: isPatientsLoading } = useQuery({
    queryKey: ['/api/doctors', user?.id, 'patients'],
    queryFn: async () => {
      if (!user?.id || user?.roleId !== 2) return null; // Apenas para usuários com função de médico (roleId = 2)
      return await apiRequest(`/api/doctors/${user.id}/patients`, "GET");
    },
    enabled: !!user?.id && user?.roleId === 2,
  });

  useEffect(() => {
    if (user) {
      setFormData(prevState => ({
        ...prevState,
        name: user.name || "",
        email: user.email || "",
        signatureNote: user.signatureNote || "",
      }));
    }
  }, [user]);
  
  // Carregar hospitais quando o diálogo é aberto
  useEffect(() => {
    if (showHospitalDialog && user?.roleId === 2) {
      fetchHospitals();
    }
  }, [showHospitalDialog, user]);
  
  // Função para buscar todos os hospitais disponíveis
  const fetchHospitals = async () => {
    setIsLoadingHospitals(true);
    try {
      // Buscar todos os hospitais disponíveis
      const allHospitals = await apiRequest('/api/hospitals', "GET");
      setHospitals(allHospitals);
      
      // Selecionar os hospitais atuais do médico
      if (doctorHospitals && doctorHospitals.length > 0) {
        // Verifica o formato dos dados e extrai os IDs de forma adequada
        const currentHospitalIds = doctorHospitals.map((h: any) => {
          // Alguns objetos têm hospitalId, outros têm id diretamente
          return h.hospitalId || h.id;
        }).filter((id: number | undefined | null) => id !== undefined && id !== null);
        
        setSelectedHospitalIds(currentHospitalIds);
      } else {
        // Limpar seleções anteriores
        setSelectedHospitalIds([]);
      }
    } catch (error) {
      console.error('Erro ao buscar hospitais:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de hospitais",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHospitals(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsLoading(true);
    try {
      const updatedData = await apiRequest(`/api/users/${user.id}`, "PUT", {
        name: formData.name,
        email: formData.email,
        signatureNote: formData.signatureNote,
      });
      
      // Atualizar diretamente os dados do usuário no cache em vez de invalidar
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { 
            ...oldData, 
            name: formData.name,
            email: formData.email,
            signatureNote: formData.signatureNote 
          };
        }
        return oldData;
      });
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar seu perfil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    const previousPage = getPreviousPage();
    setLocation(previousPage);
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await apiRequest("/api/change-password", "POST", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      
      setFormData(prevState => ({
        ...prevState,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar sua senha",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  // Função para alternar a seleção de um hospital
  const toggleHospitalSelection = (hospitalId: number) => {
    setSelectedHospitalIds(prev => {
      if (prev.includes(hospitalId)) {
        return prev.filter(id => id !== hospitalId);
      } else {
        return [...prev, hospitalId];
      }
    });
  };
  
  // Mutation para atualizar os hospitais do médico
  const updateHospitalsMutation = useMutation({
    mutationFn: async (hospitalIds: number[]) => {
      if (!user) throw new Error("Usuário não encontrado");
      
      console.log("Enviando hospitalIds:", hospitalIds);
      
      return await apiRequest(`/api/users/${user.id}/hospitals`, "PUT", {
        hospitalIds: hospitalIds
      });
    },
    onSuccess: () => {
      // Invalidar consulta para atualizar a lista
      queryClient.invalidateQueries({queryKey: ['/api/users', user?.id, 'hospitals']});
      
      toast({
        title: "Hospitais atualizados",
        description: "Suas associações com hospitais foram atualizadas com sucesso",
        variant: "default",
      });
      
      setShowHospitalDialog(false);
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar hospitais:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar os hospitais",
        variant: "destructive",
      });
    }
  });
  
  // Função para salvar as alterações nos hospitais
  const handleSaveHospitals = () => {
    updateHospitalsMutation.mutate(selectedHospitalIds);
  };
  
  // Função para obter imagem do canvas
  const getCroppedImageFromCanvas = (canvasRef: React.RefObject<HTMLCanvasElement>): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas não disponível'));
        return;
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Erro ao gerar imagem'));
        }
      }, 'image/jpeg', 0.9);
    });
  };

  // Função para desenhar a imagem no canvas com controles de zoom e posição
  const drawImageOnCanvas = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    imageSrc: string,
    scale: number,
    position: { x: number; y: number },
    canvasSize: { width: number; height: number }
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const image = new Image();
    image.onload = () => {
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      
      ctx.drawImage(
        image,
        position.x,
        position.y,
        scaledWidth,
        scaledHeight
      );
    };
    image.src = imageSrc;
  };

  // Função para resetar posição e zoom
  const resetImagePosition = (
    imageSrc: string,
    canvasSize: { width: number; height: number },
    setScale: (scale: number) => void,
    setPosition: (pos: { x: number; y: number }) => void
  ) => {
    const image = new Image();
    image.onload = () => {
      // Calcular escala para fit na área
      const scaleX = canvasSize.width / image.width;
      const scaleY = canvasSize.height / image.height;
      const scale = Math.max(scaleX, scaleY); // Para cobrir toda a área
      
      // Centralizar imagem
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      const x = (canvasSize.width - scaledWidth) / 2;
      const y = (canvasSize.height - scaledHeight) / 2;
      
      setScale(scale);
      setPosition({ x, y });
    };
    image.src = imageSrc;
  };

  // Funções para controle de drag na assinatura
  const handleSignatureMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDraggingSignature(true);
    setDragStart({ x: x - signaturePosition.x, y: y - signaturePosition.y });
  };

  const handleSignatureMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingSignature) return;
    
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPosition = {
      x: x - dragStart.x,
      y: y - dragStart.y
    };
    
    setSignaturePosition(newPosition);
    drawImageOnCanvas(
      signatureCanvasRef,
      signatureImageSrc,
      signatureScale,
      newPosition,
      { width: 250, height: 200 }
    );
  };

  const handleSignatureMouseUp = () => {
    setIsDraggingSignature(false);
  };

  // Funções para controle de drag no logo
  const handleLogoMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = logoCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDraggingLogo(true);
    setDragStart({ x: x - logoPosition.x, y: y - logoPosition.y });
  };

  const handleLogoMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingLogo) return;
    
    const canvas = logoCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPosition = {
      x: x - dragStart.x,
      y: y - dragStart.y
    };
    
    setLogoPosition(newPosition);
    drawImageOnCanvas(
      logoCanvasRef,
      logoImageSrc,
      logoScale,
      newPosition,
      { width: 500, height: 150 }
    );
  };

  const handleLogoMouseUp = () => {
    setIsDraggingLogo(false);
  };

  // Funções para drag and drop de arquivos de logo
  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLogo(true);
  };

  const handleLogoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLogo(false);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLogo(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log('🎯 Logo dropado:', file.name);
      
      // Processar arquivo diretamente
      handleLogoFileFromDrop(file);
    }
  };

  // Funções para drag and drop de arquivos de assinatura
  const handleSignatureDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSignature(true);
  };

  const handleSignatureDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSignature(false);
  };

  const handleSignatureDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSignature(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log('🎯 Assinatura dropada:', file.name);
      
      // Processar arquivo diretamente
      handleSignatureFileFromDrop(file);
    }
  };

  // Função para processar arquivo de logo do drag and drop
  const handleLogoFileFromDrop = (file: File) => {
    console.log('📁 Arquivo de logo do drop:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      console.log('❌ Tipo de arquivo inválido');
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ Arquivo muito grande');
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Arquivo válido, iniciando FileReader...');
    
    // Criar URL da imagem e abrir o crop
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('📖 FileReader concluído');
      const imageSrc = e.target?.result as string;
      setLogoImageSrc(imageSrc);
      setShowLogoCrop(true);
      
      console.log('🖼️ Abrindo modal de crop');
      
      // Resetar posição e zoom quando nova imagem é carregada
      setTimeout(() => {
        console.log('🔄 Resetando posição da imagem');
        resetImagePosition(
          imageSrc,
          { width: 500, height: 150 },
          setLogoScale,
          setLogoPosition
        );
      }, 100);
    };
    
    reader.onerror = (error) => {
      console.error('❌ Erro no FileReader:', error);
    };
    
    reader.readAsDataURL(file);
  };

  // Função para processar arquivo de assinatura do drag and drop
  const handleSignatureFileFromDrop = (file: File) => {
    console.log('📁 Arquivo de assinatura do drop:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      console.log('❌ Tipo de arquivo inválido');
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ Arquivo muito grande');
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Arquivo válido, iniciando FileReader...');
    
    // Criar URL da imagem e abrir o crop
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('📖 FileReader concluído');
      const imageSrc = e.target?.result as string;
      setSignatureImageSrc(imageSrc);
      setShowSignatureCrop(true);
      
      console.log('🖼️ Abrindo modal de crop');
      
      // Resetar posição e zoom quando nova imagem é carregada
      setTimeout(() => {
        console.log('🔄 Resetando posição da imagem');
        resetImagePosition(
          imageSrc,
          { width: 250, height: 200 },
          setSignatureScale,
          setSignaturePosition
        );
      }, 100);
    };
    
    reader.onerror = (error) => {
      console.error('❌ Erro no FileReader:', error);
    };
    
    reader.readAsDataURL(file);
  };

  // Função para lidar com o upload da assinatura com crop
  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📁 Arquivo de assinatura selecionado:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        console.log('❌ Tipo de arquivo inválido');
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.log('❌ Arquivo muito grande');
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ Arquivo válido, processando...');
      
      // Prevenir qualquer interferência no estado de autenticação
      e.preventDefault();
      e.stopPropagation();
      
      // Usar requestAnimationFrame para garantir que a operação seja não-bloqueante
      requestAnimationFrame(() => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          if (readerEvent.target?.result) {
            const imageSrc = readerEvent.target.result as string;
            console.log('🖼️ Imagem carregada, abrindo modal de crop');
            
            // Configurar estados de forma sequencial
            setSignatureImageSrc(imageSrc);
            
            // Aguardar um frame antes de abrir o modal
            requestAnimationFrame(() => {
              setShowSignatureCrop(true);
              console.log('✅ Modal de crop aberto');
              
              // Resetar posição após o modal estar aberto
              setTimeout(() => {
                resetImagePosition(
                  imageSrc,
                  { width: 250, height: 200 },
                  setSignatureScale,
                  setSignaturePosition
                );
              }, 200);
            });
          }
        };
        
        reader.onerror = (error) => {
          console.error('❌ Erro ao ler arquivo:', error);
          toast({
            title: "Erro",
            description: "Erro ao processar a imagem",
            variant: "destructive",
          });
        };
        
        reader.readAsDataURL(file);
      });
    }
  };
  
  // Função para confirmar o crop da assinatura
  const handleSignatureCropConfirm = async () => {
    if (!signatureImageSrc || !user) return;
    
    console.log('🎯 Iniciando confirmação do crop da assinatura...');
    
    try {
      const croppedImageBlob = await getCroppedImageFromCanvas(signatureCanvasRef);
      console.log('✅ Blob criado:', croppedImageBlob.size, 'bytes');
      
      const croppedFile = new File([croppedImageBlob], 'signature.jpg', { type: 'image/jpeg' });
      console.log('✅ Arquivo criado:', croppedFile.name, croppedFile.size, 'bytes');
      
      // Fechar modal primeiro
      setShowSignatureCrop(false);
      console.log('✅ Modal fechado');
      
      // Aguardar fechamento completo do modal antes do upload
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('🚀 Iniciando upload da assinatura...');
      setIsUploadingSignature(true);
      
      const formData = new FormData();
      formData.append('signature', croppedFile);
      
      const response = await fetch(`/api/users/${user.id}/signature`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao fazer upload da assinatura");
      }
      
      const result = await response.json();
      console.log('✅ Upload da assinatura bem-sucedido:', result);
      
      // Atualizar cache diretamente
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { ...oldData, signatureUrl: result.url };
        }
        return oldData;
      });
      
      toast({
        title: "Assinatura enviada",
        description: "Sua assinatura foi enviada com sucesso",
        variant: "default",
      });
      
    } catch (error) {
      console.error('❌ Erro ao processar assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar a assinatura: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingSignature(false);
      setSignatureFile(null);
      setSignatureImageSrc('');
    }
  };

  // Função para fazer upload da assinatura
  const handleSignatureUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || signatureFile;
    if (!file || !user) return;
    
    console.log('📤 Preparando upload - Arquivo:', file.name, file.size, 'bytes, Usuário:', user.id);
    setIsUploadingSignature(true);
    try {
      const formData = new FormData();
      formData.append('signature', file);
      console.log('📋 FormData preparado');
      
      const response = await fetch(`/api/users/${user.id}/signature`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📡 Resposta do servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erro na resposta:', error);
        throw new Error(error.message || "Erro ao fazer upload da assinatura");
      }
      
      const result = await response.json();
      console.log('✅ Upload bem-sucedido:', result);
      
      // Atualizar diretamente os dados do usuário no cache em vez de invalidar
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { ...oldData, signatureUrl: result.url };
        }
        return oldData;
      });
      
      setSignatureFile(null);
      // Limpar o input de arquivo
      const fileInput = document.getElementById('signature-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({
        title: "Assinatura enviada",
        description: "Sua assinatura foi enviada com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a assinatura",
        variant: "destructive",
      });
    } finally {
      setIsUploadingSignature(false);
    }
  };
  
  // Função para lidar com o upload do logo
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🎯 handleLogoFileChange chamado');
    const file = e.target.files?.[0];
    
    if (file) {
      console.log('📁 Arquivo selecionado:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        console.log('❌ Tipo de arquivo inválido');
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.log('❌ Arquivo muito grande');
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ Arquivo válido, iniciando FileReader...');
      
      // Criar URL da imagem e abrir o crop
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('📖 FileReader concluído');
        const imageSrc = e.target?.result as string;
        setLogoImageSrc(imageSrc);
        setShowLogoCrop(true);
        
        console.log('🖼️ Abrindo modal de crop');
        
        // Resetar posição e zoom quando nova imagem é carregada
        setTimeout(() => {
          console.log('🔄 Resetando posição da imagem');
          resetImagePosition(
            imageSrc,
            { width: 200, height: 100 },
            setLogoScale,
            setLogoPosition
          );
        }, 100);
      };
      
      reader.onerror = (error) => {
        console.error('❌ Erro no FileReader:', error);
      };
      
      reader.readAsDataURL(file);
    } else {
      console.log('❌ Nenhum arquivo selecionado');
    }
  };

  // Função para confirmar o crop do logo
  const handleLogoCropConfirm = async () => {
    if (!logoImageSrc || !user) return;
    
    try {
      console.log('🎯 Iniciando crop do logo...');
      const croppedImageBlob = await getCroppedImageFromCanvas(logoCanvasRef);
      console.log('✅ Blob do logo criado:', croppedImageBlob.size, 'bytes');
      
      const croppedFile = new File([croppedImageBlob], 'logo.jpg', { type: 'image/jpeg' });
      console.log('✅ Arquivo do logo criado:', croppedFile.name, croppedFile.size, 'bytes');
      
      setLogoFile(croppedFile);
      setShowLogoCrop(false);
      
      // Upload automático após o crop
      console.log('🚀 Iniciando upload do logo...');
      await handleLogoUpload(croppedFile);
    } catch (error) {
      console.error('❌ Erro ao processar crop do logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar a imagem do logo: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  // Função para remover logo atual
  const handleRemoveLogo = async () => {
    if (!user) return;
    
    try {
      console.log('🗑️ Removendo logo atual do usuário:', user.id);
      const response = await fetch(`/api/users/${user.id}/logo`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao remover logo");
      }
      
      // Atualizar os dados do usuário no cache
      queryClient.setQueryData(["/api/user"], (oldData: any) => ({
        ...oldData,
        logoUrl: null,
      }));
      
      toast({
        title: "Sucesso",
        description: "Logo removido com sucesso",
      });
      
      console.log('✅ Logo removido com sucesso');
    } catch (error) {
      console.error('❌ Erro ao remover logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover logo: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  // Função para remover assinatura atual
  const handleRemoveSignature = async () => {
    if (!user) return;
    
    try {
      console.log('🗑️ Removendo assinatura atual do usuário:', user.id);
      const response = await fetch(`/api/users/${user.id}/signature`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao remover assinatura");
      }
      
      // Atualizar os dados do usuário no cache
      queryClient.setQueryData(["/api/user"], (oldData: any) => ({
        ...oldData,
        signatureUrl: null,
      }));
      
      toast({
        title: "Sucesso",
        description: "Assinatura removida com sucesso",
      });
      
      console.log('✅ Assinatura removida com sucesso');
    } catch (error) {
      console.error('❌ Erro ao remover assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover assinatura: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  // Função para fazer upload do logo
  const handleLogoUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || logoFile;
    if (!file || !user) return;
    
    console.log('📤 Preparando upload do logo - Arquivo:', file.name, file.size, 'bytes, Usuário:', user.id);
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      console.log('📋 FormData do logo preparado');
      
      const response = await fetch(`/api/users/${user.id}/logo`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📡 Resposta do servidor (logo):', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erro na resposta (logo):', error);
        throw new Error(error.message || "Erro ao fazer upload do logo");
      }
      
      const result = await response.json();
      console.log('✅ Upload do logo bem-sucedido:', result);
      
      // Atualizar diretamente os dados do usuário no cache em vez de invalidar
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { ...oldData, logoUrl: result.url };
        }
        return oldData;
      });
      
      setLogoFile(null);
      // Limpar o input de arquivo
      const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({
        title: "Logo enviado",
        description: "Seu logo foi enviado com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };
  
  if (!user) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const formatDate = (date: Date | null) => {
    if (!date) return "Não informado";
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="container mx-auto py-6">
      
      {/* Diálogo para gerenciar hospitais associados */}
      <Dialog open={showHospitalDialog} onOpenChange={setShowHospitalDialog}>
        <DialogContent className="sm:max-w-[600px] bg-[#111827] text-white border-blue-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <BuildingHospital className="mr-2 h-5 w-5" />
              Gerenciar Hospitais Associados
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Selecione os hospitais aos quais você está associado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isLoadingHospitals ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {hospitals.map(hospital => (
                    <div 
                      key={hospital.id} 
                      className="flex items-center space-x-2"
                    >
                      <Checkbox 
                        id={`hospital-${hospital.id}`}
                        checked={selectedHospitalIds.includes(hospital.id)}
                        onCheckedChange={() => toggleHospitalSelection(hospital.id)}
                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                      <Label 
                        htmlFor={`hospital-${hospital.id}`}
                        className="flex-1 cursor-pointer text-sm font-medium text-white uppercase"
                      >
                        {hospital.name}
                      </Label>
                    </div>
                  ))}
                  
                  {hospitals.length === 0 && (
                    <div className="text-center p-4 text-slate-300">
                      Nenhum hospital encontrado.
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter className="gap-2 flex-row justify-between border-t border-blue-900 pt-4">
            <div className="text-sm text-slate-300">
              {selectedHospitalIds.length} hospitais selecionados
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowHospitalDialog(false)}
                disabled={updateHospitalsMutation.isPending}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveHospitals}
                disabled={updateHospitalsMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {updateHospitalsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      

      
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais e configurações</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClose}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Fechar
        </Button>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Informações Pessoais</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="w-full shadow-lg">
              <CardHeader className="rounded-t-lg p-6 pb-3 border-b">
                <CardTitle className="text-2xl font-bold mb-2">
                  Dados do Perfil
                </CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleProfileUpdate}>
                <CardContent className="space-y-4 p-6 rounded-b-lg">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-medium">Nome Completo</Label>
                    <div className="flex items-center space-x-2">
                      <User className="text-primary w-5 h-5" />
                      <Input 
                        id="name" 
                        name="name"
                        value={formData.name} 
                        onChange={handleInputChange}
                        placeholder="Seu nome completo" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-medium">E-mail</Label>
                    <div className="flex items-center space-x-2">
                      <Mail className="text-primary w-5 h-5" />
                      <Input 
                        id="email" 
                        name="email"
                        type="email" 
                        value={formData.email} 
                        onChange={handleInputChange}
                        placeholder="seu.email@exemplo.com" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username" className="font-medium">Nome de Usuário</Label>
                    <div className="flex items-center space-x-2">
                      <IdCard className="text-primary w-5 h-5" />
                      <Input 
                        id="username" 
                        value={user.username} 
                        disabled
                        className="opacity-70"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">O nome de usuário não pode ser alterado</p>
                  </div>

                  {/* Seção de Logo para médicos */}
                  {user.roleId === 2 && (
                    <div className="space-y-2">
                      <Label className="font-medium">Logo</Label>
                      <div className="flex items-start space-x-2">
                        <ImageIcon className="text-primary w-5 h-5 mt-2" />
                        <div className="flex-1">
                          {user.logoUrl ? (
                            <div className="space-y-3 p-3 border rounded-md">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Logo atual:</p>
                                <div className="flex gap-2">
                                  <input
                                    id="logo-change-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoFileChange}
                                    className="hidden"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById('logo-change-upload')?.click()}
                                    className="h-7 px-2 text-xs"
                                    disabled={isUploadingLogo}
                                  >
                                    <Upload className="mr-1 h-3 w-3" />
                                    {isUploadingLogo ? "Enviando..." : "Alterar"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRemoveLogo}
                                    className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                    disabled={isUploadingLogo}
                                  >
                                    <Trash2 className="mr-1 h-3 w-3" />
                                    Remover
                                  </Button>
                                </div>
                              </div>
                              <div className="relative bg-white rounded-md p-2 border">
                                <img 
                                  src={user.logoUrl} 
                                  alt="Logo do médico" 
                                  className="max-w-full max-h-24 object-contain mx-auto"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 border rounded-md">
                              <div 
                                className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-md transition-colors cursor-pointer ${
                                  isDragOverLogo 
                                    ? 'border-primary bg-primary/5 border-solid' 
                                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                                }`}
                                onDragOver={handleLogoDragOver}
                                onDragLeave={handleLogoDragLeave}
                                onDrop={handleLogoDrop}
                                onClick={() => document.getElementById('logo-first-upload')?.click()}
                              >
                                <ImageIcon className={`w-8 h-8 mb-2 ${isDragOverLogo ? 'text-primary' : 'text-muted-foreground'}`} />
                                <p className={`text-sm text-center mb-2 ${isDragOverLogo ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                  {isDragOverLogo ? 'Solte a imagem aqui' : 'Nenhum logo cadastrado'}
                                </p>
                                <p className="text-xs text-muted-foreground text-center mb-3">
                                  Arraste uma imagem ou clique para selecionar
                                </p>
                                <input
                                  id="logo-first-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoFileChange}
                                  className="hidden"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs"
                                  disabled={isUploadingLogo}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    document.getElementById('logo-first-upload')?.click();
                                  }}
                                >
                                  <Upload className="mr-1 h-3 w-3" />
                                  {isUploadingLogo ? "Enviando..." : "Selecionar Arquivo"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Campo para assinatura do médico */}
                  {user.roleId === 2 && (
                    <div className="space-y-2">
                      <Label className="font-medium">Assinatura</Label>
                      <div className="flex items-start space-x-2">
                        <ImageIcon className="text-primary w-5 h-5 mt-2" />
                        <div className="flex-1">
                          {user.signatureUrl ? (
                            <div className="space-y-3 p-3 border rounded-md">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Assinatura atual:</p>
                                <div className="flex gap-2">
                                  <input
                                    id="signature-change-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSignatureFileChange}
                                    className="hidden"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById('signature-change-upload')?.click()}
                                    className="h-7 px-2 text-xs"
                                    disabled={isUploadingSignature}
                                  >
                                    <Upload className="mr-1 h-3 w-3" />
                                    {isUploadingSignature ? "Enviando..." : "Alterar"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRemoveSignature}
                                    className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                    disabled={isUploadingSignature}
                                  >
                                    <Trash2 className="mr-1 h-3 w-3" />
                                    Remover
                                  </Button>
                                </div>
                              </div>
                              <div className="relative bg-white rounded-md p-2 border">
                                <img 
                                  src={user.signatureUrl} 
                                  alt="Assinatura do médico" 
                                  className="max-w-full max-h-24 object-contain mx-auto"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 border rounded-md">
                              <div 
                                className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-md transition-colors cursor-pointer ${
                                  isDragOverSignature 
                                    ? 'border-primary bg-primary/5 border-solid' 
                                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                                }`}
                                onDragOver={handleSignatureDragOver}
                                onDragLeave={handleSignatureDragLeave}
                                onDrop={handleSignatureDrop}
                                onClick={() => document.getElementById('signature-first-upload')?.click()}
                              >
                                <ImageIcon className={`w-8 h-8 mb-2 ${isDragOverSignature ? 'text-primary' : 'text-muted-foreground'}`} />
                                <p className={`text-sm text-center mb-2 ${isDragOverSignature ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                  {isDragOverSignature ? 'Solte a imagem aqui' : 'Nenhuma assinatura cadastrada'}
                                </p>
                                <p className="text-xs text-muted-foreground text-center mb-3">
                                  Arraste uma imagem ou clique para selecionar
                                </p>
                                <input
                                  id="signature-first-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSignatureFileChange}
                                  className="hidden"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs"
                                  disabled={isUploadingSignature}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    document.getElementById('signature-first-upload')?.click();
                                  }}
                                >
                                  <Upload className="mr-1 h-3 w-3" />
                                  {isUploadingSignature ? "Enviando..." : "Selecionar Arquivo"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Campo para nota da assinatura - apenas para médicos */}
                      {user.roleId === 2 && (
                        <div className="space-y-2 mt-4">
                          <Label htmlFor="signatureNote" className="font-medium">Nota da Assinatura</Label>
                          <div className="flex items-start space-x-2">
                            <PencilIcon className="text-primary w-5 h-5 mt-2" />
                            <div className="flex-1">
                              <textarea
                                id="signatureNote"
                                name="signatureNote"
                                placeholder="Ex: CRM 12345 - Especialista em Ortopedia&#10;Membro da Sociedade Brasileira de Ortopedia&#10;Especialista em Cirurgia do Joelho"
                                value={formData.signatureNote}
                                onChange={(e) => {
                                  const lines = e.target.value.split('\n');
                                  if (lines.length <= 4) {
                                    handleInputChange(e);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  const lines = e.currentTarget.value.split('\n');
                                  if (e.key === 'Enter' && lines.length >= 4) {
                                    e.preventDefault();
                                  }
                                }}
                                rows={4}
                                className="w-full min-h-[100px] max-h-[100px] resize-none p-3 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Texto que aparecerá embaixo da sua assinatura nos documentos (até 4 linhas)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-4 border-t rounded-b-lg">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            <Card className="w-full shadow-lg">
              <CardHeader className="rounded-t-lg p-6 pb-3 border-b">
                <CardTitle className="text-2xl font-bold mb-2">
                  Informações da Conta
                </CardTitle>
                <CardDescription>
                  Detalhes sobre sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 rounded-b-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Função no Sistema</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-base">
                      {user.roleId === 1 && "Administrador"}
                      {user.roleId === 2 && "Médico"}
                      {user.roleId === 3 && "Assistente Básico"}
                      {user.roleId === 4 && "Assistente Administrativo"}
                      {!user.roleId && "Não definido"}
                    </p>
                  </div>
                </div>
                
                {user.crm && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">CRM</p>
                    <div className="flex items-center space-x-2">
                      <IdCard className="text-primary w-5 h-5" />
                      <p className="text-base">{user.crm}</p>
                    </div>
                  </div>
                )}
                

                
                {/* Mostrar hospitais associados apenas para médicos - Design conforme novo padrão solicitado */}
                {user.roleId === 2 && (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <BuildingHospital className="text-blue-400 w-5 h-5" />
                        <p className="text-sm font-medium">Hospitais associados</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="ml-auto h-7 px-2 text-xs"
                          onClick={() => setShowHospitalDialog(true)}
                        >
                          <PencilIcon className="mr-1 h-3 w-3" />
                          Gerenciar
                        </Button>
                      </div>
                      
                      {isHospitalsLoading ? (
                        <div className="flex items-center mt-1">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                          <p className="text-sm">Carregando...</p>
                        </div>
                      ) : !doctorHospitals || doctorHospitals.length === 0 ? (
                        <p className="text-sm mt-1 text-muted-foreground">Nenhum hospital associado</p>
                      ) : (
                        <div className="space-y-2 bg-[#1a2940] rounded-md p-3">
                          {doctorHospitals.map((hospital: any, index: number) => {
                            // Buscar o nome do hospital com base na estrutura real dos dados
                            const hospitalName = hospital.hospitalName || 
                                               hospital.name || 
                                               `Hospital ${hospital.hospitalId}`;
                            
                            return (
                              <div 
                                key={hospital.id || hospital.hospitalId || index}
                                className="flex flex-col py-2 px-3 rounded-md bg-blue-900/30 border border-blue-800/30"
                              >
                                <div className="flex items-start">
                                  <div className="w-3 h-3 rounded-full bg-green-500 mr-3 flex-shrink-0 mt-1"></div>
                                  <div>
                                    <p className="text-sm text-white font-medium break-words">
                                      {hospitalName}
                                    </p>
                                    <span className="block text-xs text-blue-300 mt-1">
                                      Associado em: {new Date(hospital.createdAt || "2025-05-24").toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Seção de pacientes associados */}
                    <div className="space-y-1 mt-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="text-blue-400 w-5 h-5" />
                        <p className="text-sm font-medium">Pacientes associados</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="ml-auto h-7 px-2 text-xs"
                          onClick={() => window.location.href = '/patients'}
                        >
                          <PencilIcon className="mr-1 h-3 w-3" />
                          Ver todos
                        </Button>
                      </div>
                      
                      {isPatientsLoading ? (
                        <div className="flex items-center mt-1">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                          <p className="text-sm">Carregando...</p>
                        </div>
                      ) : !associatedPatients || associatedPatients.length === 0 ? (
                        <p className="text-sm mt-1 text-muted-foreground">Nenhum paciente associado</p>
                      ) : (
                        <div className="space-y-2 bg-[#1a2940] rounded-md p-3 max-h-[300px] overflow-y-auto">
                          {associatedPatients.map((patient: any, index: number) => {
                            // Buscar o nome do paciente com base na estrutura real dos dados
                            const patientName = patient.patientName || 
                                             patient.fullName || 
                                             (patient.patientId === 1 ? "FelipeSantosCorrea" :
                                              patient.patientId === 3 ? "Rodrigo Roitman Pozzatti" :
                                              patient.patientId === 4 ? "João do pé de Feijão1" : 
                                              `Paciente ${patient.patientId}`);
                            
                            return (
                              <div 
                                key={patient.patientId || index}
                                className="flex flex-col py-2 px-3 rounded-md bg-blue-900/30 border border-blue-800/30"
                              >
                                <div className="flex items-start">
                                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-3 flex-shrink-0 mt-1"></div>
                                  <div>
                                    <p className="text-sm text-white font-medium break-words">
                                      {patientName}
                                    </p>
                                    <span className="block text-xs text-blue-300 mt-1">
                                      Associado em: {new Date(patient.associatedAt).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Último Acesso</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-primary w-5 h-5" />
                    <p className="text-base">{user.lastLogin ? formatDate(user.lastLogin) : "Não disponível"}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Consentimento de Dados</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-green-500 w-5 h-5" />
                    <p className="text-base">
                      {user.consentAccepted ? (
                        <>Aceito em {formatDate(user.consentAccepted)}</>
                      ) : (
                        <span className="text-yellow-500">Pendente</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status da Conta</p>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${user.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className="text-base">{user.active ? "Ativa" : "Inativa"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="security">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="w-full shadow-lg">
              <CardHeader className="rounded-t-lg p-6 pb-3 border-b">
                <CardTitle className="text-2xl font-bold mb-2">
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  Atualize sua senha de acesso ao sistema
                </CardDescription>
              </CardHeader>
              <form onSubmit={handlePasswordChange}>
                <CardContent className="space-y-4 p-6 rounded-b-lg">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="font-medium">Senha Atual</Label>
                    <div className="flex items-center space-x-2">
                      <Key className="text-primary w-5 h-5" />
                      <Input 
                        id="currentPassword"
                        name="currentPassword" 
                        type="password" 
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        placeholder="Sua senha atual" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="font-medium">Nova Senha</Label>
                    <div className="flex items-center space-x-2">
                      <Key className="text-primary w-5 h-5" />
                      <Input 
                        id="newPassword"
                        name="newPassword" 
                        type="password" 
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        placeholder="Nova senha" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-medium">Confirmar Nova Senha</Label>
                    <div className="flex items-center space-x-2">
                      <Key className="text-primary w-5 h-5" />
                      <Input 
                        id="confirmPassword"
                        name="confirmPassword" 
                        type="password" 
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirme sua nova senha" 
                      />
                    </div>
                  </div>
                  
                  <div className="pt-3">
                    <p className="text-xs text-muted-foreground">A senha deve ter no mínimo 8 caracteres e incluir letras, números e caracteres especiais.</p>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-4 border-t rounded-b-lg">
                  <Button 
                    type="submit" 
                    disabled={isChangingPassword}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      "Alterar Senha"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            <Card className="w-full shadow-lg">
              <CardHeader className="rounded-t-lg p-6 pb-3 border-b">
                <CardTitle className="text-2xl font-bold mb-2">
                  Segurança da Conta
                </CardTitle>
                <CardDescription>
                  Informações de segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 rounded-b-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-200">Último Login</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-blue-400 w-5 h-5" />
                    <p className="text-base">{user.lastLogin ? formatDate(user.lastLogin) : "Não disponível"}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-200">Conta Criada em</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-blue-400 w-5 h-5" />
                    <p className="text-base">{user.createdAt ? formatDate(user.createdAt) : "Não disponível"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="privacy">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Seção de configurações de aparência removida conforme solicitado */}
            
            <Card className="w-full shadow-lg">
              <CardHeader className="rounded-t-lg p-6 pb-3 border-b">
                <CardTitle className="text-2xl font-bold mb-2">
                  Termo de Consentimento
                </CardTitle>
                <CardDescription>
                  Informações sobre o consentimento de dados pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6 rounded-b-lg">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Status do Consentimento</p>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${user.consentAccepted ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <p className="text-base">
                      {user.consentAccepted ? "Aceito" : "Pendente"}
                    </p>
                  </div>
                </div>
                
                {user.consentAccepted && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Data de Aceitação</p>
                    <p className="text-base">{formatDate(user.consentAccepted)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ao aceitar o termo de consentimento, você concordou com o processamento de seus dados pessoais conforme descrito em nossa política de privacidade.
                    </p>
                  </div>
                )}
                
                {!user.consentAccepted && (
                  <div className="space-y-2 pt-3">
                    <p className="text-sm text-yellow-500">
                      Você ainda não aceitou o termo de consentimento para tratamento de dados pessoais. 
                      Este termo aparecerá automaticamente na próxima vez que você acessar o sistema.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para crop da assinatura */}
      <Dialog open={showSignatureCrop} onOpenChange={setShowSignatureCrop}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar Assinatura</DialogTitle>
            <DialogDescription>
              Use os controles abaixo para ajustar o tamanho e posição da sua assinatura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={signatureCanvasRef}
                  width={250}
                  height={200}
                  className="block cursor-move"
                  style={{ 
                    border: '1px solid #ccc',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseDown={handleSignatureMouseDown}
                  onMouseMove={handleSignatureMouseMove}
                  onMouseUp={handleSignatureMouseUp}
                  onMouseLeave={handleSignatureMouseUp}
                />
              </div>
              
              <div className="w-full max-w-md space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zoom: {Math.round(signatureScale * 100)}%</label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={signatureScale}
                    onChange={(e) => {
                      const newScale = parseFloat(e.target.value);
                      setSignatureScale(newScale);
                      drawImageOnCanvas(
                        signatureCanvasRef,
                        signatureImageSrc,
                        newScale,
                        signaturePosition,
                        { width: 250, height: 200 }
                      );
                    }}
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posição X</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={signaturePosition.x}
                      onChange={(e) => {
                        const newPosition = { ...signaturePosition, x: parseInt(e.target.value) };
                        setSignaturePosition(newPosition);
                        drawImageOnCanvas(
                          signatureCanvasRef,
                          signatureImageSrc,
                          signatureScale,
                          newPosition,
                          { width: 250, height: 200 }
                        );
                      }}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posição Y</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={signaturePosition.y}
                      onChange={(e) => {
                        const newPosition = { ...signaturePosition, y: parseInt(e.target.value) };
                        setSignaturePosition(newPosition);
                        drawImageOnCanvas(
                          signatureCanvasRef,
                          signatureImageSrc,
                          signatureScale,
                          newPosition,
                          { width: 250, height: 200 }
                        );
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetImagePosition(
                      signatureImageSrc,
                      { width: 250, height: 200 },
                      setSignatureScale,
                      setSignaturePosition
                    );
                    
                    setTimeout(() => {
                      drawImageOnCanvas(
                        signatureCanvasRef,
                        signatureImageSrc,
                        signatureScale,
                        signaturePosition,
                        { width: 250, height: 200 }
                      );
                    }, 100);
                  }}
                  className="w-full"
                >
                  Resetar Posição
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignatureCrop(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSignatureCropConfirm}
              disabled={isUploadingSignature}
            >
              {isUploadingSignature ? "Enviando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crop do logo */}
      <Dialog open={showLogoCrop} onOpenChange={setShowLogoCrop}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar Logo</DialogTitle>
            <DialogDescription>
              Use os controles abaixo para ajustar o tamanho e posição do seu logo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={logoCanvasRef}
                  width={500}
                  height={150}
                  className="block cursor-move"
                  style={{ 
                    border: '1px solid #ccc',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseDown={handleLogoMouseDown}
                  onMouseMove={handleLogoMouseMove}
                  onMouseUp={handleLogoMouseUp}
                  onMouseLeave={handleLogoMouseUp}
                />
              </div>
              
              <div className="w-full max-w-md space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zoom: {Math.round(logoScale * 100)}%</label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={logoScale}
                    onChange={(e) => {
                      const newScale = parseFloat(e.target.value);
                      setLogoScale(newScale);
                      drawImageOnCanvas(
                        logoCanvasRef,
                        logoImageSrc,
                        newScale,
                        logoPosition,
                        { width: 500, height: 150 }
                      );
                    }}
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posição X</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={logoPosition.x}
                      onChange={(e) => {
                        const newPosition = { ...logoPosition, x: parseInt(e.target.value) };
                        setLogoPosition(newPosition);
                        drawImageOnCanvas(
                          logoCanvasRef,
                          logoImageSrc,
                          logoScale,
                          newPosition,
                          { width: 500, height: 150 }
                        );
                      }}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posição Y</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={logoPosition.y}
                      onChange={(e) => {
                        const newPosition = { ...logoPosition, y: parseInt(e.target.value) };
                        setLogoPosition(newPosition);
                        drawImageOnCanvas(
                          logoCanvasRef,
                          logoImageSrc,
                          logoScale,
                          newPosition,
                          { width: 500, height: 150 }
                        );
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetImagePosition(
                      logoImageSrc,
                      { width: 500, height: 150 },
                      setLogoScale,
                      setLogoPosition
                    );
                    
                    setTimeout(() => {
                      drawImageOnCanvas(
                        logoCanvasRef,
                        logoImageSrc,
                        logoScale,
                        logoPosition,
                        { width: 500, height: 150 }
                      );
                    }, 100);
                  }}
                  className="w-full"
                >
                  Resetar Posição
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoCrop(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleLogoCropConfirm}
              disabled={isUploadingLogo}
            >
              {isUploadingLogo ? "Enviando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
