import { useState, useEffect } from "react";
import { FileText, TrendingUp, Building2, BarChart4, Calendar, Download, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Bar, 
  BarChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  Legend,
  Line,
  LineChart
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Cores para os gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

type TimeDataItem = { 
  name: string; 
  solicitadas: number; 
  realizadas: number; 
  canceladas: number;
};

type ReportDataItem = {
  name: string;
  value: number;
};

type TimeDataType = {
  weekly: TimeDataItem[];
  monthly: TimeDataItem[];
  annual: TimeDataItem[];
};

export default function Reports() {
  const [timeRange, setTimeRange] = useState<"weekly" | "monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.roleId === 1;
  const userRole = user?.roleId === 1 ? 'Administrador' : 'Médico';
  
  // Estados para armazenar os dados de relatórios
  const [doctorStats, setDoctorStats] = useState<ReportDataItem[]>([]);
  const [hospitalStats, setHospitalStats] = useState<ReportDataItem[]>([]);
  const [hospitalDistribution, setHospitalDistribution] = useState<ReportDataItem[]>([]);
  const [supplierStats, setSupplierStats] = useState<ReportDataItem[]>([]);
  const [timeData, setTimeData] = useState<TimeDataType>({
    weekly: [],
    monthly: [],
    annual: []
  });

  // Função para buscar dados dos relatórios
  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      console.log("=== INICIANDO BUSCA DE DADOS DE RELATÓRIO ===");
      
      // Buscar estatísticas de médicos (apenas para admins)
      if (isAdmin) {
        console.log("Admin detectado - buscando stats de médicos");
        const doctorsResponse = await apiRequest("/api/reports/doctor-stats");
        console.log("Resposta médicos:", doctorsResponse);
        setDoctorStats(doctorsResponse || []);
      }

      // Buscar estatísticas de hospitais
      console.log("Buscando stats de hospitais");
      const hospitalsResponse = await apiRequest("/api/reports/hospital-stats");
      console.log("Resposta hospitais:", hospitalsResponse);
      setHospitalStats(hospitalsResponse || []);

      // Buscar nova distribuição por hospital
      console.log("Buscando distribuição por hospital");
      const distributionResponse = await apiRequest("/api/reports/hospital-distribution");
      console.log("Resposta distribuição:", distributionResponse);
      setHospitalDistribution(distributionResponse || []);

      // Buscar estatísticas de fornecedores
      console.log("Buscando stats de fornecedores");
      const suppliersResponse = await apiRequest("/api/reports/supplier-stats");
      console.log("Resposta fornecedores:", suppliersResponse);
      setSupplierStats(suppliersResponse || []);

      // Gerar dados de tempo mockados (manteremos estes por enquanto)
      const newTimeData: TimeDataType = {
        weekly: [
          { name: "Sem 47", solicitadas: 12, realizadas: 8, canceladas: 2 },
          { name: "Sem 48", solicitadas: 19, realizadas: 15, canceladas: 1 },
          { name: "Sem 49", solicitadas: 15, realizadas: 12, canceladas: 3 },
          { name: "Sem 50", solicitadas: 22, realizadas: 18, canceladas: 2 }
        ],
        monthly: [
          { name: "Jan", solicitadas: 65, realizadas: 45, canceladas: 8 },
          { name: "Fev", solicitadas: 78, realizadas: 62, canceladas: 6 },
          { name: "Mar", solicitadas: 82, realizadas: 69, canceladas: 9 },
          { name: "Abr", solicitadas: 91, realizadas: 75, canceladas: 7 },
          { name: "Mai", solicitadas: 88, realizadas: 71, canceladas: 11 },
          { name: "Jun", solicitadas: 95, realizadas: 79, canceladas: 5 }
        ],
        annual: [
          { name: "2021", solicitadas: 756, realizadas: 634, canceladas: 89 },
          { name: "2022", solicitadas: 892, realizadas: 756, canceladas: 76 },
          { name: "2023", solicitadas: 1024, realizadas: 891, canceladas: 67 },
          { name: "2024", solicitadas: 1156, realizadas: 982, canceladas: 84 }
        ]
      };

      setTimeData(newTimeData);
      
      console.log("=== DADOS DE RELATÓRIO CARREGADOS COM SUCESSO ===");
    } catch (error) {
      console.error("Erro ao buscar dados do relatório:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [isAdmin]);

  // Dados para o gráfico de pizza de status
  const statusData = [
    { name: "Aprovados", value: 156, color: COLORS[1] },
    { name: "Pendentes", value: 89, color: COLORS[2] },
    { name: "Rejeitados", value: 23, color: COLORS[3] }
  ];

  // Função para renderizar a legenda customizada
  const renderCustomLabel = ({ name, value }: any) => `${name}: ${value}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Relatórios e Análises</h1>
            <p className="text-blue-200">
              Acompanhe o desempenho e estatísticas do sistema - Perfil: {userRole}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={timeRange} onValueChange={(value: "weekly" | "monthly" | "annual") => setTimeRange(value)}>
              <SelectTrigger className="w-[180px] bg-blue-900/50 border-blue-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-600">
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-blue-600 text-blue-100 hover:bg-blue-800">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Cards de estatísticas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-600/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total de Pedidos</CardTitle>
              <FileText className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {timeData[timeRange]?.reduce((sum, item) => sum + item.solicitadas, 0) || 0}
              </div>
              <p className="text-xs text-blue-300">
                +12% em relação ao período anterior
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/80 to-green-800/80 border-green-600/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Pedidos Realizados</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {timeData[timeRange]?.reduce((sum, item) => sum + item.realizadas, 0) || 0}
              </div>
              <p className="text-xs text-green-300">
                +8% em relação ao período anterior
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/80 to-purple-800/80 border-purple-600/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Hospitais Ativos</CardTitle>
              <Building2 className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{hospitalStats.length}</div>
              <p className="text-xs text-purple-300">
                {hospitalStats.length > 0 ? "Em atividade" : "Nenhum hospital"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/80 to-orange-800/80 border-orange-600/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Taxa de Sucesso</CardTitle>
              <Activity className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {timeData[timeRange]?.length > 0 
                  ? Math.round((timeData[timeRange].reduce((sum, item) => sum + item.realizadas, 0) / 
                      timeData[timeRange].reduce((sum, item) => sum + item.solicitadas, 0)) * 100) 
                  : 0}%
              </div>
              <p className="text-xs text-orange-300">
                Pedidos realizados com sucesso
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para diferentes tipos de relatórios */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 bg-slate-800/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">Visão Geral</TabsTrigger>
            <TabsTrigger value="hospitals" className="data-[state=active]:bg-blue-600">Hospitais</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="doctors" className="data-[state=active]:bg-blue-600">Médicos</TabsTrigger>
            )}
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-blue-600">Fornecedores</TabsTrigger>
          </TabsList>

          {/* Tab de Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico temporal */}
              <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-100">
                    <BarChart4 className="w-5 h-5" />
                    Evolução dos Pedidos ({timeRange === "weekly" ? "Semanal" : timeRange === "monthly" ? "Mensal" : "Anual"})
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Volume de pedidos cirúrgicos nos últimos 6 meses
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80 bg-[#1a2332]/50 rounded-b-lg">
                  <ResponsiveContainer width="100%" height="100%">
                    {timeData[timeRange].length > 0 ? (
                      <BarChart 
                        data={timeData[timeRange].slice(-6)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#93c5fd"
                          tick={{ fontSize: 12, fill: "#93c5fd" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#93c5fd"
                          tick={{ fontSize: 12, fill: "#93c5fd" }}
                          axisLine={false}
                          tickLine={false}
                          domain={[0, 'dataMax + 2']}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#1e3a8a", 
                            border: "1px solid #3b82f6",
                            color: "#fff",
                            borderRadius: "8px"
                          }}
                          formatter={(value) => [`${value} pedidos`, "Solicitadas"]}
                        />
                        <Bar 
                          dataKey="solicitadas" 
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                          name="Pedidos"
                        />
                      </BarChart>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-blue-300">
                        <BarChart4 className="w-16 h-16 mb-4 text-blue-500/50" />
                        <p className="text-center">
                          Não há dados suficientes para exibir este gráfico.<br />
                          <span className="text-sm text-slate-400">Faça alguns pedidos para ver as estatísticas aqui.</span>
                        </p>
                      </div>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de pizza - Status dos pedidos */}
              <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-100">
                    <Activity className="w-5 h-5" />
                    Status dos Pedidos
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Distribuição por status no período selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80 bg-[#1a2332]/50 rounded-b-lg">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#1e3a8a", 
                          border: "1px solid #3b82f6",
                          color: "#fff",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ color: "#93c5fd" }}
                        formatter={(value) => <span style={{ color: "#93c5fd" }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Nova seção: Cirurgias por Hospital */}
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-100">
                  <Building2 className="w-5 h-5" />
                  Cirurgias por Hospital
                  {!isAdmin && <span className="text-sm text-blue-300 ml-2">(Apenas seus pedidos)</span>}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Distribuição de procedimentos cirúrgicos por hospital - 
                  {isAdmin ? " Todos os médicos" : " Seus pedidos apenas"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80 bg-[#1a2332]/50 rounded-b-lg">
                <ResponsiveContainer width="100%" height="100%">
                  {hospitalDistribution.length > 0 ? (
                    <BarChart 
                      data={hospitalDistribution}
                      margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#93c5fd"
                        tick={{ fontSize: 12, fill: "#93c5fd" }}
                        axisLine={false}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#93c5fd"
                        tick={{ fontSize: 12, fill: "#93c5fd" }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 'dataMax + 1']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#1e3a8a", 
                          border: "1px solid #3b82f6",
                          color: "#fff",
                          borderRadius: "8px"
                        }}
                        formatter={(value) => [`${value} procedimentos`, "Total"]}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                        name="Procedimentos"
                      />
                    </BarChart>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-blue-300">
                      <Building2 className="w-16 h-16 mb-4 text-blue-500/50" />
                      <p className="text-center">
                        {isAdmin 
                          ? "Nenhum procedimento encontrado nos hospitais."
                          : "Você ainda não possui procedimentos registrados."
                        }<br />
                        <span className="text-sm text-slate-400">
                          {isAdmin 
                            ? "Aguarde os médicos registrarem procedimentos."
                            : "Registre um procedimento para ver suas estatísticas aqui."
                          }
                        </span>
                      </p>
                    </div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Hospitais */}
          <TabsContent value="hospitals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50">
                <CardHeader>
                  <CardTitle className="text-blue-100">Top Hospitais por Volume</CardTitle>
                  <CardDescription className="text-slate-300">
                    Hospitais com maior número de procedimentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {hospitalStats.length > 0 ? (
                      <BarChart data={hospitalStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
                        <XAxis dataKey="name" stroke="#93c5fd" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#93c5fd" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#1e3a8a", 
                            border: "1px solid #3b82f6",
                            color: "#fff"
                          }}
                        />
                        <Bar dataKey="value" fill="#8B5CF6" />
                      </BarChart>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">
                        <div className="text-center">
                          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum dado de hospital disponível</p>
                        </div>
                      </div>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50">
                <CardHeader>
                  <CardTitle className="text-blue-100">Estatísticas Detalhadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {hospitalStats.slice(0, 5).map((hospital, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full bg-blue-${500 + (index * 100)}`} />
                          <span className="text-blue-100 font-medium">{hospital.name}</span>
                        </div>
                        <span className="text-blue-300 font-bold">{hospital.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab de Médicos (apenas para admins) */}
          {isAdmin && (
            <TabsContent value="doctors" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50">
                  <CardHeader>
                    <CardTitle className="text-blue-100">Top Médicos por Atividade</CardTitle>
                    <CardDescription className="text-slate-300">
                      Médicos com maior número de pedidos submetidos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {doctorStats.length > 0 ? (
                        <BarChart data={doctorStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
                          <XAxis dataKey="name" stroke="#93c5fd" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#93c5fd" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "#1e3a8a", 
                              border: "1px solid #3b82f6",
                              color: "#fff"
                            }}
                          />
                          <Bar dataKey="value" fill="#F59E0B" />
                        </BarChart>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                          <div className="text-center">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum dado de médico disponível</p>
                          </div>
                        </div>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50">
                  <CardHeader>
                    <CardTitle className="text-blue-100">Ranking de Médicos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {doctorStats.slice(0, 5).map((doctor, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 font-bold text-sm">
                              {index + 1}
                            </div>
                            <span className="text-blue-100 font-medium">{doctor.name}</span>
                          </div>
                          <span className="text-yellow-300 font-bold">{doctor.value} pedidos</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Tab de Fornecedores */}
          <TabsContent value="suppliers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50">
                <CardHeader>
                  <CardTitle className="text-blue-100">Fornecedores por Demanda</CardTitle>
                  <CardDescription className="text-slate-300">
                    Fornecedores mais requisitados nos pedidos
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {supplierStats.length > 0 ? (
                      <BarChart data={supplierStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
                        <XAxis dataKey="name" stroke="#93c5fd" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#93c5fd" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#1e3a8a", 
                            border: "1px solid #3b82f6",
                            color: "#fff"
                          }}
                        />
                        <Bar dataKey="value" fill="#10B981" />
                      </BarChart>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">
                        <div className="text-center">
                          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum dado de fornecedor disponível</p>
                        </div>
                      </div>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50">
                <CardHeader>
                  <CardTitle className="text-blue-100">Lista de Fornecedores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {supplierStats.slice(0, 5).map((supplier, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-blue-100 font-medium">{supplier.name}</span>
                        </div>
                        <span className="text-green-300 font-bold">{supplier.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 border-slate-600/50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-slate-300">
                <p className="text-sm">
                  Relatório gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Dados atualizados automaticamente • Sistema MedSync
                </p>
              </div>
              <Button 
                onClick={fetchReportData} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Atualizando..." : "Atualizar Dados"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}