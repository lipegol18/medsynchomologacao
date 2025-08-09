import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Loader2, CheckCircle2, HelpCircle, Clock, TrendingDown, TrendingUp, Shield, Monitor, Stethoscope, Eye, FileText, BarChart3, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import MedSyncLogo from '@assets/PNG Logomarca - sem fundo.png';
import blueSectionImage from '@assets/image_1753726436254.png';

// Form schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
  remember: z.boolean().optional()
});

const registerSchema = z.object({
  firstName: z.string().min(1, 'Nome é obrigatório'),
  lastName: z.string().min(1, 'Sobrenome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  username: z.string().min(3, 'Username deve ter pelo menos 3 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  roleId: z.number().min(1, 'Função é obrigatória'),
  crm: z.number().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido')
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória')
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for reset password token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset');
    if (resetToken) {
      setShowResetForm(true);
      setShowModal(true);
      toast({ 
        title: 'Token de recuperação detectado',
        description: 'Digite sua nova senha abaixo'
      });
    }
  }, [toast]);

  // Form hooks
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', remember: false }
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '', username: '',
      password: '', confirmPassword: '', roleId: 2, crm: undefined
    }
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' }
  });

  const resetPasswordForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Fetch roles for registration
  const rolesQuery = useQuery({
    queryKey: ['/api/roles'],
    enabled: showModal && modalType === 'register'
  });

  // Mutations
  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => apiRequest('/api/auth/login', 'POST', data),
    onSuccess: async () => {
      // Invalidar queries de autenticação para forçar refresh
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Aguardar um pouco para garantir que a query foi atualizada
      await new Promise(resolve => setTimeout(resolve, 100));
      
      toast({ title: 'Login realizado com sucesso!' });
      setShowModal(false);
      setLocation('/');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro no login',
        description: error.message || 'Credenciais inválidas',
        variant: 'destructive'
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      // Preparar dados para o backend (que espera 'name' em vez de firstName + lastName)
      const backendData = {
        ...data,
        name: `${data.firstName} ${data.lastName}`
      };
      
      // Enviar para a API interna primeiro
      const result = await apiRequest('/api/register', 'POST', backendData);
      
      // Enviar dados para o webhook do n8n em background (não bloqueia o registro)
      fetch("https://lipegol18.app.n8n.cloud/webhook/validar-crm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then(response => {
        console.log('Webhook n8n executado:', response.status);
      }).catch(error => {
        console.warn('Webhook n8n falhou:', error);
      });
      
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Registro realizado com sucesso!' });
      setModalType('login');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro no registro',
        description: error.message || 'Erro ao criar conta',
        variant: 'destructive'
      });
    }
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      // Fazer a chamada para a API interna
      const result = await apiRequest('/api/forgot-password', 'POST', data);
      
      // Enviar dados para o webhook do n8n em background (não bloqueia a recuperação)
      const webhookData = {
        email: data.email,
        timestamp: new Date().toISOString(),
        action: 'forgot_password_request',
        origin: window.location.origin,
        token: result.token || null,
        reset_link: result.token ? `${window.location.origin}/auth?reset=${result.token}` : null
      };
      
      fetch("https://lipegol18.app.n8n.cloud/webhook/EsqueciASenha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      }).then(response => {
        console.log('Webhook n8n executado para recuperação de senha:', response.status);
        console.log('Dados enviados para webhook:', webhookData);
      }).catch(error => {
        console.warn('Webhook n8n falhou para recuperação de senha:', error);
      });
      
      return result;
    },
    onSuccess: (response: any) => {
      setResetEmailSent(true);
      
      if (response.token) {
        // Modo desenvolvimento - exibir token diretamente
        toast({ 
          title: 'Email falhou - Modo Desenvolvimento',
          description: `Acesse: ${window.location.origin}/auth?reset=${response.token}`,
          variant: 'destructive'
        });
        
        // Opcionalmente, copiar URL para clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(`${window.location.origin}/auth?reset=${response.token}`);
        }
        
        console.log('🔗 URL de reset de senha:', `${window.location.origin}/auth?reset=${response.token}`);
      } else {
        toast({ title: 'Email de recuperação enviado com sucesso!' });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar email',
        description: error.message || 'Erro ao processar solicitação',
        variant: 'destructive'
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordForm) => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('reset');
      return apiRequest('/api/reset-password', 'POST', { ...data, token });
    },
    onSuccess: () => {
      toast({ title: 'Senha atualizada com sucesso!' });
      setShowResetForm(false);
      setModalType('login');
      // Limpar URL
      window.history.replaceState({}, '', '/auth');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar senha',
        description: error.message || 'Token inválido ou expirado',
        variant: 'destructive'
      });
    }
  });

  // Form handlers
  const onLoginSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  const onForgotPasswordSubmit = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data);
  };

  const onResetPasswordSubmit = (data: ResetPasswordForm) => {
    resetPasswordMutation.mutate(data);
  };

  const handleLoginClick = () => {
    setModalType('login');
    setShowModal(true);
  };

  const handleRegisterClick = () => {
    setModalType('register');
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-3xl font-bold">
                <span className="text-gray-700">med</span><span className="text-primary italic font-bold">sync</span>
              </span>
            </div>
            
            {/* Login/Register buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={handleLoginClick}
                variant="default"
                className="btn-sky px-8 py-2 rounded-xl font-medium"
              >
                Login
              </Button>
              <Button
                onClick={handleRegisterClick}
                variant="outline"
                className="border-2 border-sky text-sky hover:bg-sky/10 bg-transparent px-8 py-2 rounded-xl font-medium"
              >
                Registrar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-start">
            {/* Left side - Text content aligned left */}
            <div className="text-white z-10 max-w-2xl">
              <h1 className="text-5xl font-bold mb-6 leading-tight text-left">
                <span className="text-primary">Medsync</span><br />
                <span className="text-white">Inteligência</span><br />
                <span className="text-white">Médica Integrada</span>
              </h1>
              <p className="text-lg mb-4 text-primary/80 italic leading-relaxed text-left">
                "A Revolução nas Autorizações Cirúrgicas.<br />
                Menos espera. Mais cuidado."
              </p>
              <p className="text-gray-300 text-base leading-relaxed text-left">
                O MedSync utiliza algoritmos treinados com base em milhares de protocolos 
                ortopédicos e cirúrgicos para sugerir os procedimentos mais adequados - tudo 
                de forma segura e editável.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-12">
            O <span className="text-cyan-500">sistema inteligente</span><br />
            que automatiza<br />
            pedidos cirúrgicos
          </h2>
          
          {/* Three feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center space-x-4">
              <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-gray-900">
                  Organiza toda a<br />documentação
                </h3>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center space-x-4">
              <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-gray-900">
                  Integra convênios<br />e hospitais
                </h3>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center space-x-4">
              <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-gray-900">
                  Acelera aprovação<br />de cirurgias
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blue Section with Background Image */}
      <section 
        className="mx-4 mb-16 relative overflow-hidden rounded-lg"
        style={{
          backgroundImage: `url(${blueSectionImage})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          height: '300px',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto 4rem auto'
        }}
      >
        {/* Invisible text overlays to match the image content - for screen readers */}
        <div className="sr-only">
          <p>Indicado para cirurgiões e clínicas que buscam eficiência e rastreabilidade nos processos cirúrgicos.</p>
          <p>Ideal para médicos cirurgiões que desejam ganhar tempo, evitar glosas e aumentar sua produtividade.</p>
        </div>
      </section>

      {/* Organization Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            <span className="text-cyan-500">Organização</span><br />
            <span className="text-gray-900">Centralizada</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Exames, laudos, documentos e pedidos em um só lugar.
          </p>
          
          {/* Four benefit cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Economia<br />de tempo
                </h3>
                <p className="text-sm text-gray-600">
                  Fluxos guiados e preenchimento automático.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingDown className="w-8 h-8 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Redução<br />de glosas
                </h3>
                <p className="text-sm text-gray-600">
                  Preenchimento técnico, testado previamente e baseado em normas da tabela <span className="text-cyan-600 font-medium">CBHPM</span>.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Produção<br />otimizada
                </h3>
                <p className="text-sm text-gray-600">
                  Mais cirurgias realizadas, mais receita para você e sua equipe.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Segurança<br />e Rastreio
                </h3>
                <p className="text-sm text-gray-600">
                  Cada pedido com histórico completo e backup.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>



      {/* Login/Register Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-900">
              {modalType === 'login' && 'Entrar no MedSync'}
              {modalType === 'register' && 'Criar conta no MedSync'}
              {modalType === 'forgot-password' && 'Recuperar senha'}
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              {modalType === 'login' && 'Faça login para acessar sua conta'}
              {modalType === 'register' && 'Crie sua conta para começar a usar o sistema'}
              {modalType === 'forgot-password' && 'Digite seu email para receber instruções de recuperação'}
            </DialogDescription>
          </DialogHeader>
          
          {showResetForm ? (
            /* Reset Password Form */
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Redefinir senha</h2>
                <p className="text-gray-600">Digite sua nova senha abaixo</p>
              </div>
              
              <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-password" className="text-gray-600">Nova senha</Label>
                  <Input
                    {...resetPasswordForm.register('password')}
                    id="reset-password"
                    type="password"
                    placeholder="Digite sua nova senha"
                    className="w-full"
                  />
                  {resetPasswordForm.formState.errors.password && (
                    <p className="text-red-500 text-sm">{resetPasswordForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-confirmPassword" className="text-gray-600">Confirmar nova senha</Label>
                  <Input
                    {...resetPasswordForm.register('confirmPassword')}
                    id="reset-confirmPassword"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    className="w-full"
                  />
                  {resetPasswordForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-sm">{resetPasswordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-cyan-500 hover:bg-cyan-600"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {resetPasswordMutation.isPending ? "Atualizando..." : "Atualizar senha"}
                </Button>
              </form>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(false);
                    setModalType('login');
                    // Limpar URL
                    window.history.replaceState({}, '', '/auth');
                  }}
                  className="text-sm text-primary hover:text-primary/80 underline"
                >
                  Voltar ao login
                </button>
              </div>
            </div>
          ) : modalType === 'forgot-password' ? (
            // Formulário de recuperação de senha
            <div className="space-y-4">
              {!resetEmailSent ? (
                <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-gray-600">Email</Label>
                    <Input
                      {...forgotPasswordForm.register('email')}
                      id="forgot-email"
                      type="email"
                      placeholder="Digite seu email cadastrado"
                      className="w-full"
                    />
                    {forgotPasswordForm.formState.errors.email && (
                      <p className="text-red-500 text-sm">{forgotPasswordForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-sky"
                    disabled={forgotPasswordMutation.isPending}
                  >
                    {forgotPasswordMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {forgotPasswordMutation.isPending ? "Enviando..." : "Enviar instruções"}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setModalType('login')}
                      className="text-sm text-primary hover:text-primary/80 underline"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Email enviado!</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                    </p>
                    <button
                      onClick={() => {
                        setModalType('login');
                        setResetEmailSent(false);
                        forgotPasswordForm.reset();
                      }}
                      className="text-sm text-primary hover:text-primary/80 underline"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Tabs value={modalType} onValueChange={(value) => setModalType(value as 'login' | 'register')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Registrar</TabsTrigger>
              </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-600">Usuário</Label>
                  <Input
                    {...loginForm.register('username')}
                    id="username"
                    placeholder="Digite seu usuário"
                    className="w-full"
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-red-500 text-sm">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-600">Senha</Label>
                  <Input
                    {...loginForm.register('password')}
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    className="w-full"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-red-500 text-sm">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      {...loginForm.register('remember')}
                      id="remember"
                    />
                    <Label htmlFor="remember" className="text-sm">
                      Lembrar de mim
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalType('forgot-password')}
                    className="text-sm text-primary hover:text-primary/80 underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-sky"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="space-y-2">
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="reg-firstName" className="text-sm text-gray-600">Nome</Label>
                    <Input
                      {...registerForm.register('firstName')}
                      id="reg-firstName"
                      placeholder="Nome"
                      className="h-9"
                    />
                    {registerForm.formState.errors.firstName && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reg-lastName" className="text-sm text-gray-600">Sobrenome</Label>
                    <Input
                      {...registerForm.register('lastName')}
                      id="reg-lastName"
                      placeholder="Sobrenome"
                      className="h-9"
                    />
                    {registerForm.formState.errors.lastName && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reg-email" className="text-sm text-gray-600">Email</Label>
                  <Input
                    {...registerForm.register('email')}
                    id="reg-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-9"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-red-500 text-xs">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reg-phone" className="text-sm text-gray-600">Telefone</Label>
                  <Input
                    {...registerForm.register('phone')}
                    id="reg-phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="h-9"
                  />
                  {registerForm.formState.errors.phone && (
                    <p className="text-red-500 text-xs">{registerForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reg-username" className="text-sm text-gray-600">Usuário</Label>
                  <Input
                    {...registerForm.register('username')}
                    id="reg-username"
                    placeholder="usuario"
                    className="h-9"
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-red-500 text-xs">{registerForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="reg-password" className="text-sm text-gray-600">Senha</Label>
                    <Input
                      {...registerForm.register('password')}
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-9"
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reg-confirm-password" className="text-sm text-gray-600">Confirmar</Label>
                    <Input
                      {...registerForm.register('confirmPassword')}
                      id="reg-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-9"
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="reg-role" className="text-sm text-gray-600">Função</Label>
                    <Select 
                      value={registerForm.watch('roleId')?.toString() || ""} 
                      onValueChange={(value) => registerForm.setValue('roleId', parseInt(value))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione sua função" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(rolesQuery.data) && rolesQuery.data.map((role: any) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {registerForm.formState.errors.roleId && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.roleId.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reg-crm" className="text-sm text-gray-600">CRM (opcional)</Label>
                    <Input
                      {...registerForm.register('crm', { valueAsNumber: true })}
                      id="reg-crm"
                      type="number"
                      placeholder="123456"
                      className="h-9"
                    />
                    {registerForm.formState.errors.crm && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.crm.message}</p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-sky h-9 mt-3"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Registrando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}