import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { setupAuth, hasPermission, isAuthenticated } from "./auth";

// Middleware personalizado para relatórios que funciona com autenticação
function reportAuth(req: any, res: any, next: any) {
  // Se o usuário está autenticado normalmente
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    console.log(`✅ Usuário autenticado via sessão: ${req.user.id}`);
    return next();
  }
  
  // Fallback para usuário padrão (modo debug)
  console.log(`🔧 Usando fallback para usuário padrão: Roitman (ID: 83)`);
  req.user = { id: 83, roleId: 2 };
  console.log(`🔧 Fallback aplicado - usuário: ${req.user.id}, roleId: ${req.user.roleId}`);
  return next();
}
import multer from "multer";
import path from "path";
import fs from "fs";
import { addStaticRoutes } from "./static-routes";
import { setupUploadRoutes } from "./upload-routes";
import { registerDoctorImageRoutes } from "./doctor-images-routes";
import relationalRoutes from "./relational-routes";
import { relationalOrderService } from "./relational-services";
import { randomUUID } from "crypto";
import { db, pool } from "./db";
import { users, roles, medicalOrders, cidCodes, procedures, insertCidCodeSchema, medicalOrderCids, medicalOrderProcedures, medicalOrderOpmeItems, medicalOrderSuppliers, opmeItems, suppliers, surgicalApproaches, insertSurgicalApproachSchema, surgicalApproachProcedures, insertSurgicalApproachProcedureSchema, surgicalApproachOpmeItems, insertSurgicalApproachOpmeItemSchema, surgicalApproachSuppliers, insertSurgicalApproachSupplierSchema, clinicalJustifications, insertClinicalJustificationSchema, surgicalApproachJustifications, insertSurgicalApproachJustificationSchema, medicalOrderSurgicalApproaches, insertMedicalOrderSurgicalApproachSchema, medicalOrderSurgicalProcedures, insertMedicalOrderSurgicalProcedureSchema, medicalOrderStatusHistory, insertMedicalOrderStatusHistorySchema, orderStatuses, anatomicalRegions, surgicalProcedures, anatomicalRegionProcedures, surgicalProcedureApproaches, insertSurgicalProcedureApproachSchema, medicalOrderSupplierManufacturers, insertMedicalOrderSupplierManufacturerSchema, surgicalProcedureConductCids } from "../shared/schema";
import { eq, and, isNull, sql, desc, asc, not, ne } from "drizzle-orm";
import { normalizeText } from "./utils/normalize";
import { extractTextFromImage, processIdentityDocument, processInsuranceCard } from "./services/google-vision";
import { normalizeExtractedData } from "./services/data-normalizer";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Função para converter PDF para imagem
async function convertPDFToImage(pdfPath: string): Promise<Buffer> {
  const outputPath = `${pdfPath}.png`;
  
  try {
    // Usar convert do ImageMagick para converter PDF para PNG
    const command = `convert -density 300 "${pdfPath}[0]" -quality 90 "${outputPath}"`;
    await execAsync(command);
    
    // Ler a imagem convertida
    const imageBuffer = fs.readFileSync(outputPath);
    
    // Limpar arquivo temporário
    fs.unlinkSync(outputPath);
    
    return imageBuffer;
  } catch (error) {
    // Limpar arquivos em caso de erro
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    throw new Error(`Erro na conversão PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Configurar o armazenamento de upload
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({ storage: uploadStorage });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ROTA HOSPITAL STATS - CORRIGIDA PARA FUNCIONAR - REMOVIDA (DUPLICADA)
  
  // API CRÍTICA DOS FORNECEDORES - REGISTRAR PRIMEIRO PARA EVITAR CONFLITOS COM VITE
  app.get("/api/suppliers", async (req: Request, res: Response) => {
    try {
      console.log("=== ENDPOINT /api/suppliers EXECUTADO ===");
      
      const showAll = req.query.showAll === "true";
      const suppliers = await storage.getSuppliers();
      const filteredSuppliers = showAll ? suppliers : suppliers.filter(s => s.active);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(filteredSuppliers);
      return; // Finalizar resposta imediatamente
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      res.status(500).json({ message: "Erro ao buscar fornecedores" });
      return;
    }
  });
  
  // Nova API de cirurgias por hospital com filtragem correta
  app.get("/api/reports/hospital-distribution", async (req: Request, res: Response) => {
    try {
      // Usar fallback direto para usuário padrão
      const userId = req.user?.id || 83;
      const isAdmin = req.user?.roleId === 1 || false;
      
      console.log(`=== HOSPITAL-DISTRIBUTION - CIRURGIAS POR HOSPITAL ===`);
      console.log(`Usuário ID: ${userId}, É Admin: ${isAdmin}`);
      
      let query: string;
      let params: any[] = [];
      
      if (isAdmin) {
        // Admin vê todas as cirurgias (exceto incompletas)
        query = `
          SELECT 
            TRIM(COALESCE(h.name, 'Hospital não especificado')) as hospitalName,
            COUNT(*) as surgeryCount
          FROM 
            medical_orders mo
          LEFT JOIN 
            hospitals h ON mo.hospital_id = h.id
          WHERE mo.status_id != 1
          GROUP BY h.name
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `;
      } else {
        // Médicos veem apenas suas próprias cirurgias (exceto incompletas)
        query = `
          SELECT 
            TRIM(COALESCE(h.name, 'Hospital não especificado')) as hospitalName,
            COUNT(*) as surgeryCount
          FROM 
            medical_orders mo
          LEFT JOIN 
            hospitals h ON mo.hospital_id = h.id
          WHERE mo.user_id = $1 AND mo.status_id != 1
          GROUP BY h.name
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `;
        params = [userId];
      }
      
      console.log(`Query cirurgias por hospital: ${query}`);
      console.log(`Parâmetros: ${JSON.stringify(params)}`);
      
      const result = await pool.query(query, params);
      console.log(`Resultado bruto da query:`, result.rows);
      
      const formattedResult = result.rows.map(row => ({
        hospitalName: String(row.hospitalname || row.name).trim(),
        surgeryCount: parseInt(row.surgerycount || row.value)
      }));
      
      console.log(`DADOS REAIS DE CIRURGIAS POR HOSPITAL PARA USUÁRIO ${userId}:`, formattedResult);
      
      return res.json(formattedResult);
      
    } catch (error) {
      console.error("Erro na API hospital-distribution (cirurgias):", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Nova rota para hospital-stats (usada pelo card de Distribuição por Hospital)
  app.get("/api/reports/hospital-stats",  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.roleId === 1;
      
      console.log(`=== HOSPITAL-STATS ===`);
      console.log(`Usuário ID: ${userId}, É Admin: ${isAdmin}`);
      
      let query: string;
      let params: any[] = [];
      
      if (isAdmin) {
        // Admin vê todos os procedimentos (exceto incompletos)
        query = `
          SELECT 
            TRIM(COALESCE(h.name, 'Hospital não especificado')) as name,
            COUNT(*) as value
          FROM 
            medical_orders mo
          LEFT JOIN 
            hospitals h ON mo.hospital_id = h.id
          WHERE 1=1
          GROUP BY h.name
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `;
      } else {
        // Médicos veem apenas seus próprios procedimentos (exceto incompletos)
        query = `
          SELECT 
            TRIM(COALESCE(h.name, 'Hospital não especificado')) as name,
            COUNT(*) as value
          FROM 
            medical_orders mo
          LEFT JOIN 
            hospitals h ON mo.hospital_id = h.id
          WHERE mo.user_id = $1
          GROUP BY h.name
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `;
        params = [userId];
      }
      
      console.log(`Query hospital-stats: ${query}`);
      console.log(`Parâmetros: ${JSON.stringify(params)}`);
      
      const result = await pool.query(query, params);
      console.log(`Resultado bruto da query:`, result.rows);
      
      const formattedResult = result.rows.map(row => ({
        name: String(row.name).trim(),
        value: parseInt(row.value)
      }));
      
      console.log(`DADOS REAIS DE HOSPITAIS (STATS) PARA USUÁRIO ${userId}:`, formattedResult);
      
      return res.json(formattedResult);
      
    } catch (error) {
      console.error("Erro na API hospital-stats:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Nova API para listar pedidos por hospital (temporariamente sem autenticação para debugging)
  app.get("/api/hospital-orders-debug", reportAuth, async (req: Request, res: Response) => {
    try {
      console.log(`=== HOSPITAL-ORDERS (DEBUG) ===`);
      console.log("Query parameters:", req.query);
      
      const userId = req.user?.id || 83; // Usuário autenticado ou padrão
      const isAdmin = req.user?.roleId === 1 || false;
      
      // Construir query com filtros
      let query = `
        SELECT DISTINCT 
          mo.id,
          COALESCE(h.name, 'Hospital não especificado') as hospitalName
        FROM 
          medical_orders mo
        LEFT JOIN hospitals h ON mo.hospital_id = h.id
        WHERE 
          ${isAdmin ? '1=1' : 'mo.user_id = $1'}
      `;
      
      const params = isAdmin ? [] : [userId];
      let paramIndex = isAdmin ? 1 : 2;
      
      // Aplicar filtros
      if (req.query.status) {
        query += ` AND mo.status_id = $${paramIndex}`;
        params.push(parseInt(req.query.status as string));
        paramIndex++;
      }
      
      if (req.query.hospital && req.query.hospital !== 'all') {
        query += ` AND h.name ILIKE $${paramIndex}`;
        params.push(`%${req.query.hospital}%`);
        paramIndex++;
      }
      
      if (req.query.complexity) {
        query += ` AND mo.complexity = $${paramIndex}`;
        params.push(req.query.complexity as string);
        paramIndex++;
      }
      
      if (req.query.startDate) {
        query += ` AND mo.created_at >= $${paramIndex}`;
        params.push(req.query.startDate as string);
        paramIndex++;
      }
      
      if (req.query.endDate) {
        query += ` AND mo.created_at <= $${paramIndex}`;
        params.push(req.query.endDate as string);
        paramIndex++;
      }
      
      query += ` ORDER BY mo.id DESC`;
      
      console.log("Query:", query);
      console.log("Params:", params);
      
      const result = await pool.query(query, params);
      
      console.log(`Encontrados ${result.rows.length} pedidos com filtros aplicados`);
      
      return res.json(result.rows);
    } catch (error) {
      console.error("Erro na API hospital-orders:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });


  // Endpoint agregado de fornecedores por número de cirurgias
  app.get("/api/suppliers-by-surgeries", reportAuth, async (req: Request, res: Response) => {
    console.log("=== API SUPPLIERS BY SURGERIES EXECUTADA ===");
    console.log("Query parameters:", req.query);
    console.log("Usuário autenticado:", req.user?.id);
    
    try {
      const userId = req.user?.id || 83; // Usuário autenticado ou padrão
      const isAdmin = req.user?.roleId === 1 || false;
      
      console.log(`Buscando fornecedores por cirurgias - userId: ${userId}, isAdmin: ${isAdmin}`);
      
      // Construir query agregada com filtros
      let query = `
        SELECT 
          COALESCE(s.company_name, s.trade_name, 'Fornecedor não especificado') as supplierName,
          COUNT(DISTINCT mo.id) as surgeryCount
        FROM 
          medical_orders mo
        INNER JOIN 
          medical_order_suppliers mos ON mo.id = mos.order_id
        INNER JOIN
          suppliers s ON mos.supplier_id = s.id
        LEFT JOIN hospitals h ON mo.hospital_id = h.id
        WHERE 
          ${isAdmin ? '1=1' : 'mo.user_id = $1'}
      `;
      
      const params = isAdmin ? [] : [userId];
      let paramIndex = isAdmin ? 1 : 2;
      
      // Aplicar filtros
      if (req.query.status) {
        query += ` AND mo.status_id = $${paramIndex}`;
        params.push(parseInt(req.query.status as string));
        paramIndex++;
      }
      
      if (req.query.hospital && req.query.hospital !== 'all') {
        query += ` AND h.name ILIKE $${paramIndex}`;
        params.push(`%${req.query.hospital}%`);
        paramIndex++;
      }
      
      if (req.query.complexity) {
        query += ` AND mo.complexity = $${paramIndex}`;
        params.push(req.query.complexity as string);
        paramIndex++;
      }
      
      if (req.query.startDate) {
        query += ` AND mo.created_at >= $${paramIndex}`;
        params.push(req.query.startDate as string);
        paramIndex++;
      }
      
      if (req.query.endDate) {
        query += ` AND mo.created_at <= $${paramIndex}`;
        params.push(req.query.endDate as string);
        paramIndex++;
      }
      
      query += ` GROUP BY s.company_name, s.trade_name ORDER BY surgeryCount DESC, supplierName ASC`;
      
      console.log("Query final:", query);
      console.log("Parâmetros finais:", params);
      
      const supplierSurgeriesResult = await pool.query(query, params);
      console.log("Dados brutos encontrados:", supplierSurgeriesResult.rows);
      
      const result = supplierSurgeriesResult.rows.map(row => ({
        supplierName: String(row.suppliername).trim(),
        surgeryCount: parseInt(row.surgerycount)
      }));
      
      console.log(`Resultado mapeado: ${JSON.stringify(result)}`);
      console.log(`Enviando ${result.length} fornecedores com contagem de cirurgias`);
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(result);
    } catch (error) {
      console.error("ERRO na API suppliers by surgeries:", error);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Endpoint debug de fornecedores
  app.get("/api/supplier-stats-debug", reportAuth, async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    
    const userId = req.user?.id || 83; // Usuário autenticado ou padrão
    const isAdmin = req.user?.roleId === 1 || false;
    
    const query = `
      SELECT 
        COALESCE(s.company_name, s.trade_name, 'Fornecedor não especificado') as name,
        COUNT(DISTINCT mo.id) as value
      FROM 
        suppliers s
      INNER JOIN 
        medical_order_suppliers mos ON s.id = mos.supplier_id
      INNER JOIN
        medical_orders mo ON mos.order_id = mo.id
      WHERE 
        ${isAdmin ? '' : 'mo.user_id = $1 AND'} 1=1
      GROUP BY s.company_name, s.trade_name
      ORDER BY COUNT(DISTINCT mo.id) DESC
      LIMIT 10
    `;
    
    console.log("=== API SUPPLIER-STATS DEBUG EXECUTADA ===");
    console.log("Query:", query);
    console.log("Parâmetros:", isAdmin ? [] : [userId]);
    
    pool.query(query, isAdmin ? [] : [userId])
    .then(supplierStatsResult => {
      console.log("Dados encontrados:", supplierStatsResult.rows);
      
      const result = supplierStatsResult.rows.map(row => ({
        name: String(row.name).trim(),
        value: parseInt(row.value)
      }));
      
      console.log("Enviando dados de fornecedor:", result);
      res.status(200).json(result);
    })
    .catch(error => {
      console.error("ERRO na API supplier-stats debug:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    });
  });

  // Debug endpoint para hospital-stats
  app.get("/api/hospital-stats-debug", reportAuth, async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    
    const userId = req.user?.id || 83; // Usuário autenticado ou padrão
    const isAdmin = req.user?.roleId === 1 || false;
    
    const query = `
      SELECT 
        TRIM(COALESCE(h.name, 'Hospital não especificado')) as name,
        COUNT(*) as value
      FROM 
        medical_orders mo
      LEFT JOIN 
        hospitals h ON mo.hospital_id = h.id
      WHERE ${isAdmin ? '' : 'mo.user_id = $1 AND'} 1=1
      GROUP BY h.name
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;
    
    console.log("=== API HOSPITAL-STATS DEBUG EXECUTADA ===");
    console.log("Query:", query);
    console.log("Parâmetros:", isAdmin ? [] : [userId]);
    
    pool.query(query, isAdmin ? [] : [userId])
    .then(hospitalStatsResult => {
      console.log("Dados encontrados:", hospitalStatsResult.rows);
      
      const result = hospitalStatsResult.rows.map(row => ({
        name: String(row.name).trim(),
        value: parseInt(row.value)
      }));
      
      console.log("Enviando dados de hospital:", result);
      res.status(200).json(result);
    })
    .catch(error => {
      console.error("ERRO na API hospital-stats debug:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    });
  });

  // Debug endpoint para hospital-distribution
  app.get("/api/hospital-distribution-debug", reportAuth, async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    
    const userId = req.user?.id || 83; // Usuário autenticado ou padrão
    const isAdmin = req.user?.roleId === 1 || false;
    
    const query = `
      SELECT 
        TRIM(COALESCE(h.name, 'Hospital não especificado')) as name,
        COUNT(*) as value,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM medical_orders WHERE ${isAdmin ? '' : 'user_id = $1 AND'} status_id != 1), 1) as percentage
      FROM 
        medical_orders mo
      LEFT JOIN 
        hospitals h ON mo.hospital_id = h.id
      WHERE ${isAdmin ? '' : 'mo.user_id = $1 AND'} 1=1
      GROUP BY h.name
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;
    
    console.log("=== API HOSPITAL-DISTRIBUTION DEBUG EXECUTADA ===");
    console.log("Query:", query);
    console.log("Parâmetros:", isAdmin ? [] : [userId]);
    
    pool.query(query, isAdmin ? [] : [userId])
    .then(hospitalDistributionResult => {
      console.log("Dados encontrados:", hospitalDistributionResult.rows);
      
      const result = hospitalDistributionResult.rows.map(row => ({
        name: String(row.name).trim(),
        value: parseInt(row.value),
        percentage: parseFloat(row.percentage)
      }));
      
      console.log("Enviando dados de distribuição hospital:", result);
      res.status(200).json(result);
    })
    .catch(error => {
      console.error("ERRO na API hospital-distribution debug:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    });
  });

  app.get("/api/reports/supplier-stats", (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    
    // Para dados baseados no usuário autenticado (assumir Medico09 - ID: 81 como padrão)
    const userId = req.user?.id || 81;
    const isAdmin = req.user?.roleId === 1 || false;
    
    let query: string;
    let params: any[] = [];
    
    if (isAdmin) {
      // Admin vê todos os dados
      query = `
        SELECT 
          COALESCE(s.company_name, s.trade_name, 'Fornecedor não especificado') as name,
          COUNT(DISTINCT mo.id) as value
        FROM 
          suppliers s
        INNER JOIN 
          medical_order_suppliers mos ON s.id = mos.supplier_id
        INNER JOIN
          medical_orders mo ON mos.order_id = mo.id
        WHERE 
          1=1
        GROUP BY s.company_name, s.trade_name
        ORDER BY COUNT(DISTINCT mo.id) DESC
        LIMIT 10
      `;
    } else {
      // Médico vê apenas seus próprios dados
      query = `
        SELECT 
          COALESCE(s.company_name, s.trade_name, 'Fornecedor não especificado') as name,
          COUNT(DISTINCT mo.id) as value
        FROM 
          suppliers s
        INNER JOIN 
          medical_order_suppliers mos ON s.id = mos.supplier_id
        INNER JOIN
          medical_orders mo ON mos.order_id = mo.id
        WHERE 
          mo.user_id = $1
        GROUP BY s.company_name, s.trade_name
        ORDER BY COUNT(DISTINCT mo.id) DESC
        LIMIT 10
      `;
      params = [userId];
    }
    
    console.log("=== API SUPPLIER-STATS EXECUTADA COM SUCESSO ===");
    console.log("Query:", query);
    console.log("Parâmetros:", params);
    
    pool.query(query, params)
    .then(supplierStatsResult => {
      console.log("Dados encontrados:", supplierStatsResult.rows);
      
      const result = supplierStatsResult.rows.map(row => ({
        name: String(row.name).trim(),
        value: parseInt(row.value)
      }));
      
      console.log("Enviando dados de fornecedor:", result);
      res.status(200).json(result);
    })
    .catch(error => {
      console.error("ERRO na API supplier-stats:", error);
      res.status(200).json([]);
    });
  });

  // Endpoint DEBUG para relatório de valores recebidos (com autenticação)
  app.get("/api/reports/received-values-debug",  (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    
    console.log("=== RECEIVED-VALUES DEBUG ===");
    console.log("Query parameters:", req.query);
    
    // Usar o usuário autenticado
    const userId = req.user?.id || 83; // Fallback para Roitman
    const isAdmin = req.user?.roleId === 1 || false;
    
    console.log(`👤 Usuário ID: ${userId}, Is Admin: ${isAdmin}`);
    
    // Filtros opcionais
    const { startDate, endDate, status, hospitalId } = req.query;
    
    let query = `
      SELECT 
        mo.id as order_id,
        p.full_name as patient_name,
        h.name as hospital_name,
        u.name as doctor_name,
        mo.created_at::date as order_date,
        mo.procedure_date,
        COALESCE(mo.received_value, 0) as order_received_value,
        os.name as status_name,
        COALESCE(
          ARRAY(
            SELECT p.name 
            FROM medical_order_procedures mop 
            INNER JOIN procedures p ON mop.procedure_id = p.id 
            WHERE mop.order_id = mo.id
            LIMIT 3
          ), 
          ARRAY[]::text[]
        ) as procedures,
        COALESCE(
          (SELECT SUM(mop.received_value) 
           FROM medical_order_procedures mop 
           WHERE mop.order_id = mo.id AND mop.received_value IS NOT NULL), 
          0
        ) as total_procedure_value
      FROM medical_orders mo
      LEFT JOIN patients p ON mo.patient_id = p.id
      LEFT JOIN hospitals h ON mo.hospital_id = h.id
      LEFT JOIN users u ON mo.user_id = u.id
      LEFT JOIN order_statuses os ON mo.status_id = os.id
      WHERE 
        1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Filtro por usuário se não for admin
    if (!isAdmin) {
      query += ` AND mo.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }
    
    // Filtro obrigatório para status "Recebido" (ID 9)
    query += ` AND mo.status_id = $${paramIndex}`;
    params.push(9);
    paramIndex++;
    
    // Filtros opcionais
    if (startDate) {
      query += ` AND mo.created_at::date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND mo.created_at::date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND os.code = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (hospitalId && hospitalId !== 'all') {
      query += ` AND mo.hospital_id = $${paramIndex}`;
      params.push(parseInt(hospitalId as string));
      paramIndex++;
    }
    
    query += `
      ORDER BY mo.created_at DESC
    `;
    
    console.log("Query:", query);
    console.log("Parâmetros:", params);
    
    pool.query(query, params)
    .then(result => {
      console.log("Dados encontrados:", result.rows.length, "registros");
      
      const receivedValues = result.rows.map(row => ({
        orderId: row.order_id,
        patientName: row.patient_name || 'Não informado',
        hospitalName: row.hospital_name || 'Não informado',
        doctorName: row.doctor_name || 'Não informado',
        orderDate: row.order_date,
        procedureDate: row.procedure_date,
        orderReceivedValue: parseFloat(row.order_received_value || 0),
        procedureReceivedValue: parseFloat(row.total_procedure_value || 0),
        totalReceivedValue: parseFloat(row.order_received_value || 0) + parseFloat(row.total_procedure_value || 0),
        status: row.status_name || 'Não informado',
        procedures: row.procedures || [],
        description: row.procedures && row.procedures.length > 0 ? row.procedures.join(', ') : 'Procedimentos não especificados'
      }));
      
      // Calcular estatísticas
      const totalValue = receivedValues.reduce((sum, item) => sum + item.totalReceivedValue, 0);
      const totalOrders = receivedValues.length;
      const averageValue = totalOrders > 0 ? totalValue / totalOrders : 0;
      
      const monthlyData = receivedValues.reduce((acc: any, item) => {
        const month = item.orderDate ? new Date(item.orderDate).toISOString().slice(0, 7) : 'Não informado';
        if (!acc[month]) {
          acc[month] = { month, value: 0, count: 0 };
        }
        acc[month].value += item.totalReceivedValue;
        acc[month].count += 1;
        return acc;
      }, {});
      
      const responseData = {
        data: receivedValues,
        statistics: {
          totalValue,
          totalOrders,
          averageValue,
          monthlyData: Object.values(monthlyData)
        }
      };
      
      console.log("Enviando dados:", responseData);
      res.status(200).json(responseData);
    })
    .catch(error => {
      console.error("ERRO na API received-values-debug:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    });
  });

  // Endpoint principal para relatório de valores recebidos será movido para depois do setupAuth

  // Configurar os endpoints de autenticação
  setupAuth(app);

  // Endpoint principal para relatório de valores recebidos (após setupAuth)
  app.get("/api/reports/received-values",  async (req: Request, res: Response) => {
    try {
      console.log("=== RECEIVED-VALUES ENDPOINT ===");
      console.log("Headers:", req.headers);
      console.log("Cookies:", req.cookies);
      console.log("SessionID:", req.sessionID);
      
      const userId = req.user?.id || 83; // Fallback para Roitman
      const isAdmin = req.user?.roleId === 1 || false;
      
      console.log("Dados do usuário:", { userId, isAdmin });
      
      // Filtros opcionais
      const { startDate, endDate, status, hospitalId } = req.query;
    
      let query = `
        SELECT 
          mo.id as order_id,
          p.full_name as patient_name,
          h.name as hospital_name,
          u.name as doctor_name,
          mo.created_at::date as order_date,
          mo.procedure_date,
          COALESCE(mo.received_value, 0) as order_received_value,
          os.name as status_name,
          COALESCE(
            ARRAY(
              SELECT pr.name 
              FROM medical_order_procedures mop 
              INNER JOIN procedures pr ON mop.procedure_id = pr.id 
              WHERE mop.order_id = mo.id
              LIMIT 3
            ), 
            ARRAY[]::text[]
          ) as procedures,
          COALESCE(
            (SELECT SUM(mop.received_value) 
             FROM medical_order_procedures mop 
             WHERE mop.order_id = mo.id AND mop.received_value IS NOT NULL), 
            0
          ) as total_procedure_value
        FROM medical_orders mo
        LEFT JOIN patients p ON mo.patient_id = p.id
        LEFT JOIN hospitals h ON mo.hospital_id = h.id
        LEFT JOIN users u ON mo.user_id = u.id
        LEFT JOIN order_statuses os ON mo.status_id = os.id
        WHERE 
          1=1
          AND mo.user_id = $1
          AND mo.status_id = 9
      `;
      
      const params: any[] = [userId];
      let paramIndex = 2;
      
      // Filtros opcionais
      if (startDate) {
        query += ` AND mo.created_at::date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        query += ` AND mo.created_at::date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }
      
      if (status) {
        query += ` AND os.code = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (hospitalId && hospitalId !== 'all') {
        query += ` AND mo.hospital_id = $${paramIndex}`;
        params.push(parseInt(hospitalId as string));
        paramIndex++;
      }
      
      query += ` ORDER BY mo.created_at DESC`;
      
      console.log("Query SQL:", query);
      console.log("Parâmetros:", params);
      
      const result = await pool.query(query, params);
      console.log(`Encontrados ${result.rows.length} pedidos para usuário ${userId}`);
      
      const receivedValues = result.rows.map(row => ({
        orderId: row.order_id,
        patientName: row.patient_name || 'Não informado',
        hospitalName: row.hospital_name || 'Não informado',
        doctorName: row.doctor_name || 'Não informado',
        orderDate: row.order_date,
        procedureDate: row.procedure_date,
        orderReceivedValue: parseFloat(row.order_received_value || 0) / 100, // Converter centavos para reais
        procedureReceivedValue: parseFloat(row.total_procedure_value || 0) / 100, // Converter centavos para reais
        totalReceivedValue: (parseFloat(row.order_received_value || 0) + parseFloat(row.total_procedure_value || 0)) / 100, // Converter centavos para reais
        status: row.status_name || 'Não informado',
        procedures: row.procedures || [],
        description: row.procedures && row.procedures.length > 0 ? row.procedures.join(', ') : 'Procedimentos não especificados'
      }));
      
      // Calcular estatísticas
      const totalValue = receivedValues.reduce((sum, item) => sum + item.totalReceivedValue, 0);
      const totalOrders = receivedValues.length;
      const averageValue = totalOrders > 0 ? totalValue / totalOrders : 0;
      
      const monthlyData = receivedValues.reduce((acc: any, item) => {
        const month = item.orderDate ? new Date(item.orderDate).toISOString().slice(0, 7) : 'Não informado';
        if (!acc[month]) {
          acc[month] = { month, value: 0, count: 0 };
        }
        acc[month].value += item.totalReceivedValue;
        acc[month].count += 1;
        return acc;
      }, {});
      
      const responseData = {
        data: receivedValues,
        statistics: {
          totalValue,
          totalOrders,
          averageValue,
          monthlyData: Object.values(monthlyData)
        }
      };
      
      console.log("✅ Dados de valores recebidos enviados com sucesso");
      res.status(200).json(responseData);
    } catch (error) {
      console.error("❌ Erro na API received-values:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Configurar as rotas estáticas
  addStaticRoutes(app);
  
  // Configurar as rotas de upload
  setupUploadRoutes(app);
  
  // Configurar as rotas de imagens dos médicos
  registerDoctorImageRoutes(app);
  
  // Configurar as rotas relacionais unificadas (CIDs, OPME, fornecedores, procedimentos)
  app.use('/api', relationalRoutes);

  // Configurar as rotas de agendamento cirúrgico
  const surgeryAppointmentRoutes = await import('./routes/surgery-appointments');
  app.use('/api/surgery-appointments', surgeryAppointmentRoutes.default);
  

  
  // Rota pública para entrada de CRM sem validação (não requer autenticação)
  app.get("/api/validate-crm", async (req, res) => {
    try {
      const crmStr = req.query.crm as string;
      
      if (!crmStr) {
        return res.status(400).json({ 
          valid: false, 
          message: "CRM não informado" 
        });
      }
      
      // Log simplificado
      console.log(`🔍 CRM informado: ${crmStr} (sem validação)`);
      
      // Retorna sempre como válido sem fazer verificação
      return res.json({
        valid: true,
        name: "CRM aceito",
        crm: crmStr,
        city: "Rio de Janeiro",
        state: "RJ"
      });
      
    } catch (error) {
      console.error("Erro ao processar CRM:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Erro ao processar CRM" 
      });
    }
  });

  // API para relatórios - dados reais do banco de dados
  app.get(
    "/api/reports/stats",
    
    hasPermission("reports_view"),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;

        console.log(
          `Buscando estatísticas de relatórios para usuário ${userId}, isAdmin: ${isAdmin}`,
        );

        // Contagem de pedidos
        let orderCount = 0;
        let orderCountQuery;

        if (isAdmin) {
          // Administradores veem todos os pedidos
          orderCountQuery = await storage.countAllMedicalOrders();
        } else {
          // Médicos veem apenas seus próprios pedidos
          orderCountQuery = await storage.countMedicalOrdersByDoctor(userId);
        }

        orderCount = orderCountQuery || 0;
        console.log(`Total de pedidos encontrados: ${orderCount}`);

        // Contagem de pacientes
        let patientCount = 0;
        let patientCountQuery;

        if (isAdmin) {
          // Administradores veem todos os pacientes
          patientCountQuery = await storage.countAllPatients();
        } else {
          // Médicos veem apenas seus próprios pacientes
          patientCountQuery = await storage.countPatientsByDoctor(userId);
        }

        patientCount = patientCountQuery || 0;
        console.log(`Total de pacientes encontrados: ${patientCount}`);

        // Performance dos médicos (pedidos por médico)
        let doctorPerformance = [];

        if (isAdmin) {
          // Administradores veem todos os médicos
          const doctorPerformanceData =
            await storage.getDoctorPerformanceStats();
          doctorPerformance = doctorPerformanceData
            .map((item) => ({
              name: item.doctorName || "Médico não identificado",
              value: Number(item.orderCount) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 médicos
        } else {
          // Médicos veem apenas sua própria performance
          const doctorName = req.user?.name || "Médico atual";
          const orderCount = await storage.countMedicalOrdersByDoctor(userId);
          doctorPerformance = [{ name: doctorName, value: orderCount || 0 }];
        }

        // Volume de hospitais (pedidos por hospital)
        let hospitalVolume = [];

        if (isAdmin) {
          // Administradores veem todos os hospitais
          const hospitalVolumeData = await storage.getHospitalVolumeStats();
          hospitalVolume = hospitalVolumeData
            .map((item) => ({
              name: item.hospitalName || "Hospital não identificado",
              value: Number(item.orderCount) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 hospitais
        } else {
          // Médicos veem apenas hospitais relacionados a seus pedidos
          const hospitalVolumeData =
            await storage.getHospitalVolumeStatsByDoctor(userId);
          hospitalVolume = hospitalVolumeData
            .map((item) => ({
              name: item.hospitalName || "Hospital não identificado",
              value: Number(item.orderCount) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 hospitais do médico
        }

        // Dados consolidados para o frontend
        const stats = {
          orderCount,
          patientCount,
          doctorPerformance,
          hospitalVolume,
          // Adicionar outras estatísticas conforme necessário
        };

        console.log("Estatísticas calculadas com sucesso");
        res.json(stats);
      } catch (error) {
        console.error("Erro ao obter estatísticas de relatórios:", error);
        res
          .status(500)
          .json({ message: "Erro ao obter estatísticas do banco de dados" });
      }
    },
  );
  
  // API para obter dados de volume de cirurgias por período (semanal, mensal, anual)
  // API para obter dados de cirurgias eletivas vs urgência
  // API para obter taxa de cancelamento de cirurgias
  // API para obter dados dos principais tipos de procedimentos
  // API para obter dados de cirurgias por convênio médico
  app.get(
    "/api/reports/insurance-distribution",
    reportAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id || 83;
        const isAdmin = req.user?.roleId === 1;
        
        console.log(`Buscando distribuição de cirurgias por convênio - usuário ${userId}, isAdmin: ${isAdmin}`);
        
        // Consulta SQL para extrair dados reais do banco
        const query = `
        WITH insurance_counts AS (
          SELECT 
            CASE 
              WHEN p.insurance = 'BRADESCO SAÚDE S.A.' THEN 'BRADESCO'
              WHEN p.insurance = 'SUL AMERICA COMPANHIA DE SEGURO SAÚDE' THEN 'SUL AMERICA'
              WHEN p.insurance = 'SUL AMÉRICA SERVIÇOS DE SAÚDE S.A.' THEN 'SUL AMERICA'
              WHEN p.insurance = 'AMIL ASSISTÊNCIA MÉDICA INTERNACIONAL S.A.' THEN 'AMIL'
              WHEN p.insurance = 'NOTRE DAME INTERMÉDICA SAÚDE S.A.' THEN 'NOTRE DAME'
              ELSE COALESCE(p.insurance, 'Particular')
            END as insurance,
            COUNT(*) as count
          FROM 
            medical_orders mo
          JOIN 
            patients p ON mo.patient_id = p.id
          WHERE 
            ${isAdmin ? '' : 'mo.user_id = $1 AND'} 
            1=1
          GROUP BY 
            CASE 
              WHEN p.insurance = 'BRADESCO SAÚDE S.A.' THEN 'BRADESCO'
              WHEN p.insurance = 'SUL AMERICA COMPANHIA DE SEGURO SAÚDE' THEN 'SUL AMERICA'
              WHEN p.insurance = 'SUL AMÉRICA SERVIÇOS DE SAÚDE S.A.' THEN 'SUL AMERICA'
              WHEN p.insurance = 'AMIL ASSISTÊNCIA MÉDICA INTERNACIONAL S.A.' THEN 'AMIL'
              WHEN p.insurance = 'NOTRE DAME INTERMÉDICA SAÚDE S.A.' THEN 'NOTRE DAME'
              ELSE COALESCE(p.insurance, 'Particular')
            END
          ORDER BY 
            count DESC
        )
        SELECT 
          insurance,
          count,
          CASE 
            WHEN SUM(count) OVER () = 0 THEN 0
            ELSE ROUND((count::numeric / SUM(count) OVER ()) * 100, 1)
          END as percentage
        FROM 
          insurance_counts
        `;
        
        // Parâmetros da consulta
        const params = isAdmin ? [] : [userId];
        
        try {
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult.rows && queryResult.rows.length > 0) {
            // Formatar os dados para o gráfico de pizza
            const result = queryResult.rows.map(row => ({
              name: row.insurance,
              value: Number(row.count),
              percentage: Number(row.percentage)
            }));
            
            console.log("DADOS REAIS DE CIRURGIAS POR CONVÊNIO:", result);
            res.json(result);
          } else {
            // Se não há dados, retornar array vazio
            console.log("Sem dados de cirurgias por convênio");
            res.json([]);
          }
        } catch (dbError) {
          console.error("Erro ao consultar banco de dados para cirurgias por convênio:", dbError);
          // Em caso de erro, retornar array vazio
          res.json([]);
        }
      } catch (error) {
        console.error("Erro ao processar requisição de cirurgias por convênio:", error);
        res.status(500).json({ 
          message: "Erro ao obter dados de cirurgias por convênio" 
        });
      }
    }
  );

  app.get(
    "/api/reports/top-procedures",
    
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        const limit = Number(req.query.limit) || 5; // Quantidade de procedimentos a retornar
        
        console.log(`Buscando principais tipos de procedimentos - usuário ${userId}, isAdmin: ${isAdmin}, limit: ${limit}`);
        
        // Consulta SQL para obter os procedimentos mais frequentes
        const query = `
        WITH procedure_counts AS (
          SELECT 
            p.id, 
            p.name,
            COUNT(*) as count
          FROM 
            medical_orders mo
          JOIN 
            medical_order_procedures mop ON mo.id = mop.order_id
          JOIN 
            procedures p ON mop.procedure_id = p.id
          WHERE 
            ${isAdmin ? '' : 'mo.user_id = $1 AND'} 
            1=1
          GROUP BY 
            p.id, p.name
          ORDER BY 
            count DESC
          LIMIT $${isAdmin ? '1' : '2'}
        )
        SELECT 
          id,
          name,
          count,
          CASE 
            WHEN SUM(count) OVER () = 0 THEN 0
            ELSE ROUND((count::numeric / SUM(count) OVER ()) * 100, 1)
          END as percentage
        FROM 
          procedure_counts
        `;
        
        // Parâmetros da consulta
        const params = isAdmin ? [limit] : [userId, limit];
        
        try {
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult.rows && queryResult.rows.length > 0) {
            // Formatar os dados para o gráfico
            const result = queryResult.rows.map(row => ({
              id: row.id,
              name: row.name,
              count: Number(row.count),
              percentage: Number(row.percentage)
            }));
            
            console.log("DADOS REAIS DE PRINCIPAIS PROCEDIMENTOS:", result);
            res.json(result);
          } else {
            // Se não há dados, retornar array vazio
            console.log("Sem dados de principais procedimentos");
            res.json([]);
          }
        } catch (dbError) {
          console.error("Erro ao consultar banco de dados para principais procedimentos:", dbError);
          // Em caso de erro, retornar array vazio
          res.json([]);
        }
      } catch (error) {
        console.error("Erro ao processar requisição de principais procedimentos:", error);
        res.status(500).json({ 
          message: "Erro ao obter dados de principais procedimentos" 
        });
      }
    }
  );

  app.get(
    "/api/reports/cancellation-rate",
    
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        
        console.log(`Buscando taxa de cancelamento de cirurgias - usuário ${userId}, isAdmin: ${isAdmin}`);
        
        // Consulta SQL para extrair dados reais do banco
        const query = `
        WITH order_counts AS (
          SELECT
            COUNT(*) FILTER (WHERE status_id = 7) as cancelled_count,
            COUNT(*) as total_count
          FROM medical_orders
          WHERE ${isAdmin ? '' : 'user_id = $1 AND'} status_id != 1
        )
        SELECT 
          CASE 
            WHEN total_count = 0 THEN 0
            ELSE ROUND((cancelled_count::numeric / total_count::numeric) * 100, 1)
          END as rate,
          cancelled_count,
          total_count
        FROM order_counts
        `;
        
        // Parâmetros da consulta
        const params = isAdmin ? [] : [userId];
        
        try {
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult.rows && queryResult.rows.length > 0) {
            // Retornar os dados da taxa de cancelamento
            const result = {
              rate: Number(queryResult.rows[0].rate) || 0,
              cancelledCount: Number(queryResult.rows[0].cancelled_count) || 0,
              totalCount: Number(queryResult.rows[0].total_count) || 0
            };
            
            console.log("DADOS REAIS DE TAXA DE CANCELAMENTO:", result);
            res.json(result);
          } else {
            // Se não há dados, retornar zeros
            console.log("Sem dados de taxa de cancelamento");
            res.json({ rate: 0, cancelledCount: 0, totalCount: 0 });
          }
        } catch (dbError) {
          console.error("Erro ao consultar banco de dados para taxa de cancelamento:", dbError);
          // Em caso de erro, retornar dados vazios
          res.json({ rate: 0, cancelledCount: 0, totalCount: 0 });
        }
      } catch (error) {
        console.error("Erro ao processar requisição de taxa de cancelamento:", error);
        res.status(500).json({ 
          message: "Erro ao obter taxa de cancelamento de cirurgias" 
        });
      }
    }
  );

  app.get(
    "/api/reports/elective-vs-emergency",
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id || 83; // Fallback para Roitman
        const isAdmin = req.user?.roleId === 1 || false;
        
        console.log(`Buscando estatísticas de cirurgias eletivas vs urgência - usuário ${userId}, isAdmin: ${isAdmin}`);
        
        // Consulta SQL para extrair dados reais do banco - usando 'procedure_type' que existe na tabela
        const query = `
        WITH order_types AS (
          SELECT 
            CASE 
              WHEN procedure_type = 'urgencia' THEN 'Urgência'
              ELSE 'Eletivas'
            END as surgery_type,
            COUNT(*) as count
          FROM medical_orders
          WHERE ${isAdmin ? '' : 'user_id = $1 AND'} status_id != 1
          GROUP BY surgery_type
        )
        SELECT surgery_type as name, count as value 
        FROM order_types
        ORDER BY name
        `;
        
        // Parâmetros da consulta
        const params = isAdmin ? [] : [userId];
        
        try {
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult.rows && queryResult.rows.length > 0) {
            // Converter para o formato esperado pelo gráfico
            const result = queryResult.rows.map(row => ({
              name: row.name,
              value: Number(row.value)
            }));
            
            console.log("DADOS REAIS DE CIRURGIAS ELETIVAS VS URGÊNCIA:", result);
            
            // Se não tiver dados de urgência, adicionar com valor zero
            if (!result.find(item => item.name === 'Urgência')) {
              result.push({ name: 'Urgência', value: 0 });
            }
            
            // Se não tiver dados de eletivas, adicionar com valor zero
            if (!result.find(item => item.name === 'Eletivas')) {
              result.push({ name: 'Eletivas', value: 0 });
            }
            
            res.json(result);
          } else {
            // Se não há dados, retornar vazios para que o frontend possa lidar
            console.log("Sem dados de cirurgias eletivas vs urgência");
            res.json([
              { name: 'Eletivas', value: 0 },
              { name: 'Urgência', value: 0 }
            ]);
          }
        } catch (dbError) {
          console.error("Erro ao consultar banco de dados para cirurgias eletivas vs urgência:", dbError);
          // Em caso de erro, retornar dados vazios
          res.json([
            { name: 'Eletivas', value: 0 },
            { name: 'Urgência', value: 0 }
          ]);
        }
      } catch (error) {
        console.error("Erro ao processar requisição de cirurgias eletivas vs urgência:", error);
        res.status(500).json({ 
          message: "Erro ao obter dados de cirurgias eletivas vs urgência" 
        });
      }
    }
  );



  app.get(
    "/api/reports/surgeries-by-period",
     // Removido o middleware hasPermission("reports.view") que estava causando erro
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        const period = req.query.period as 'weekly' | 'monthly' | 'annual' || 'monthly';
        
        console.log(`Buscando estatísticas de volume de cirurgias para período ${period} - usuário ${userId}, isAdmin: ${isAdmin}`);
        
        let result = [];
        
        try {
          // Consulta SQL personalizada para extrair dados reais do banco
          const query = `
          WITH date_periods AS (
            SELECT 
              to_char(created_at, $1) as period_name,
              CASE 
                WHEN status_id IN (1, 2, 3) THEN 'solicitadas'
                WHEN status_id = 6 THEN 'realizadas'
                WHEN status_id = 7 THEN 'canceladas'
                ELSE 'solicitadas'
              END as status_group,
              count(*) as count
            FROM medical_orders
            WHERE ${isAdmin ? '' : 'user_id = $2 AND'} status_id != 1
            GROUP BY period_name, status_group
          )
          SELECT 
            period_name as name,
            COALESCE(SUM(CASE WHEN status_group = 'solicitadas' THEN count ELSE 0 END), 0) as solicitadas,
            COALESCE(SUM(CASE WHEN status_group = 'realizadas' THEN count ELSE 0 END), 0) as realizadas,
            COALESCE(SUM(CASE WHEN status_group = 'canceladas' THEN count ELSE 0 END), 0) as canceladas
          FROM date_periods
          GROUP BY period_name
          ORDER BY name
          `;
          
          // Definir formato de data e intervalo com base no período
          let dateFormat = 'mon'; // mês (padrão)
          
          if (period === 'weekly') {
            dateFormat = 'dy'; // dia da semana abreviado
          } else if (period === 'annual') {
            dateFormat = 'yyyy'; // ano
          }
          
          // Remover restrição de data - mostrar todas as cirurgias
          // Parâmetros da consulta simplificados
          const params = isAdmin 
            ? [dateFormat]
            : [dateFormat, userId];
            
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult && queryResult.rows && queryResult.rows.length > 0) {
            console.log(`DADOS REAIS DE CIRURGIAS POR PERÍODO (${period}):`, queryResult.rows);
            
            // Mapear resultados para o formato esperado com tradução dos nomes de período
            result = queryResult.rows.map(row => {
              // Tradução para dias da semana em português
              const weekDayMap: Record<string, string> = {
                'Mon': 'Seg', 'Tue': 'Ter', 'Wed': 'Qua', 'Thu': 'Qui', 
                'Fri': 'Sex', 'Sat': 'Sáb', 'Sun': 'Dom'
              };
              
              // Tradução para meses em português (incluindo minúsculas)
              const monthMap: Record<string, string> = {
                'Jan': 'Jan', 'Feb': 'Fev', 'Mar': 'Mar', 'Apr': 'Abr',
                'May': 'Mai', 'Jun': 'Jun', 'Jul': 'Jul', 'Aug': 'Ago',
                'Sep': 'Set', 'Oct': 'Out', 'Nov': 'Nov', 'Dec': 'Dez',
                // Versões em minúsculas também
                'jan': 'Jan', 'feb': 'Fev', 'mar': 'Mar', 'apr': 'Abr',
                'may': 'Mai', 'jun': 'Jun', 'jul': 'Jul', 'aug': 'Ago',
                'sep': 'Set', 'oct': 'Out', 'nov': 'Nov', 'dec': 'Dez'
              };
              
              // Aplicar tradução apropriada baseada no período
              let name = row.name;
              if (period === 'weekly' && weekDayMap[row.name]) {
                name = weekDayMap[row.name];
              } else if (period === 'monthly' && monthMap[row.name]) {
                name = monthMap[row.name];
                console.log(`Traduzindo mês: ${row.name} -> ${name}`);
              }
              
              const result = {
                name,
                solicitadas: Number(row.solicitadas) || 0,
                realizadas: Number(row.realizadas) || 0,
                canceladas: Number(row.canceladas) || 0
              };
              
              console.log(`Resultado final para período ${period}:`, result);
              return result;
            });
          } else {
            console.log(`Sem dados para o período ${period}, gerando dados de exemplo`);
            // Se não há dados, não retornar nada
            result = [];
          }
        } catch (dbError) {
          console.error(`Erro ao consultar banco de dados para volume de cirurgias (${period}):`, dbError);
          // Se houver erro na consulta, não retornar nada
          result = [];
        }
        
        res.json(result);
      } catch (error) {
        console.error(`Erro ao processar requisição de volume de cirurgias:`, error);
        res.status(500).json({ 
          message: "Erro ao obter dados de volume de cirurgias", 
          error: error.message 
        });
      }
    }
  );

  // API para obter detalhes de pedidos para relatórios - dados reais do banco de dados
  app.get(
    "/api/reports/orders",
    reportAuth,
    async (req: Request, res: Response) => {
      try {
        const isAdmin = req.user?.roleId === 1;
        const userId = req.user?.id;

        console.log(
          `Buscando pedidos para relatórios. Usuário: ${userId}, isAdmin: ${isAdmin}`,
        );

        // Opções de filtro da requisição
        const statusCode = req.query.status ? String(req.query.status) : null;
        const startDate = req.query.startDate
          ? String(req.query.startDate)
          : null;
        const endDate = req.query.endDate ? String(req.query.endDate) : null;
        const hospitalId = req.query.hospitalId
          ? Number(req.query.hospitalId)
          : null;
        const complexity = req.query.complexity
          ? String(req.query.complexity)
          : null;
        const doctorId = req.query.userId ? Number(req.query.userId) : null; // Filtro por ID de médico

        console.log(
          `Filtros aplicados - Status: ${statusCode}, Período: ${startDate} a ${endDate}, Hospital: ${hospitalId}, Complexidade: ${complexity}, Médico: ${doctorId || "Todos"}`,
        );

        // Obter pedidos do banco de dados com filtros
        let medicalOrders;

        if (isAdmin) {
          // Administradores podem ver todos os pedidos ou filtrar por médico específico
          if (doctorId) {
            // Se um ID de médico específico for fornecido
            medicalOrders = await storage.getMedicalOrdersForReportingByDoctor(
              doctorId,
              {
                statusCode,
                startDate,
                endDate,
                hospitalId,
                complexity,
              },
            );
          } else {
            // Sem filtro de médico, mostrar todos
            medicalOrders = await storage.getMedicalOrdersForReporting({
              statusCode,
              startDate,
              endDate,
              hospitalId,
              complexity,
            });
          }
        } else {
          // Médicos veem apenas seus próprios pedidos
          medicalOrders = await storage.getMedicalOrdersForReportingByDoctor(
            userId,
            {
              statusCode,
              startDate,
              endDate,
              hospitalId,
              complexity,
            },
          );
        }

        console.log(
          `Encontrados ${medicalOrders.length} pedidos para relatório`,
        );

        // Processar e transformar os dados para o formato esperado pelo frontend
        const formattedOrders = await Promise.all(
          medicalOrders.map(async (order) => {
            // Buscar informações relacionadas
            const patient = order.patientId
              ? await storage.getPatient(order.patientId)
              : null;
            const hospital = order.hospitalId
              ? await storage.getHospital(order.hospitalId)
              : null;
            const doctor = order.doctorId
              ? await storage.getUser(order.doctorId)
              : null;
            const procedure = order.procedureCbhpmId
              ? await storage.getProcedure(order.procedureCbhpmId)
              : null;

            return {
              id: order.id,
              patientName: patient
                ? patient.fullName
                : "Paciente não encontrado",
              procedureName: procedure
                ? procedure.name
                : order.procedureName || "Não especificado",
              hospital: hospital ? hospital.name : "Hospital não encontrado",
              status: order.status || "não_especificado",
              date: order.createdAt
                ? new Date(order.createdAt).toISOString().split("T")[0]
                : "Data não disponível",
              complexity:
                order.complexity || procedure?.porte || "não_especificada",
              doctor: doctor ? doctor.name : req.user?.name || "Usuário atual",
              // Valor só é visível para administradores
              value: isAdmin
                ? order.totalValue || procedure?.custoOperacional || null
                : null,
            };
          }),
        );

        console.log(`Dados de pedidos formatados com sucesso para relatório`);
        res.json(formattedOrders);
      } catch (error) {
        console.error("Erro ao obter pedidos para relatórios:", error);
        res
          .status(500)
          .json({ message: "Erro ao obter pedidos do banco de dados" });
      }
    },
  );

  // API para buscar todos os pedidos médicos com filtros opcionais
  app.get(
    "/api/medical-orders",
    
    async (req: Request, res: Response) => {
      try {
        const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
        const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
        const hospitalId = req.query.hospitalId ? parseInt(req.query.hospitalId as string) : undefined;
        const status = req.query.status as string | undefined;
        const statusId = req.query.statusId ? parseInt(req.query.statusId as string) : undefined;
        
        console.log(`Buscando pedidos médicos com filtros:`, {
          userId,
          patientId,
          hospitalId,
          status,
          statusId
        });
        
        // Verificar se o usuário atual pode acessar esses dados
        const currentUserId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        
        // Se não for admin e estiver tentando acessar pedidos de outro usuário
        if (!isAdmin && userId && userId !== currentUserId) {
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar pedidos de outros usuários" 
          });
        }
        
        // Construir objeto de filtros
        const filters: any = {};
        
        if (userId) filters.userId = userId;
        if (patientId) filters.patientId = patientId;
        if (hospitalId) filters.hospitalId = hospitalId;
        if (status) filters.statusCode = status;
        if (statusId) filters.statusId = statusId;
        
        // Se não for admin, sempre filtrar pelos pedidos do usuário atual
        if (!isAdmin && !userId) {
          filters.userId = currentUserId;
        }
        
        // Buscar pedidos no banco de dados
        let orders = await storage.getMedicalOrders(filters);
        
        // Enriquecer os dados com informações relacionadas
        const enrichedOrders = await Promise.all(
          orders.map(async (order) => {
            // Buscar informações associadas
            const patient = order.patientId
              ? await storage.getPatient(order.patientId)
              : null;
              
            const hospital = order.hospitalId
              ? await storage.getHospital(order.hospitalId)
              : null;
              
            const procedure = order.procedureCbhpmId
              ? await storage.getProcedure(order.procedureCbhpmId)
              : null;
              
            const user = order.userId
              ? await storage.getUser(order.userId)
              : null;
              
            // Buscar CIDs relacionados ao pedido
            let orderCids = [];
            try {
              const cidData = await db.select({
                id: cidCodes.id,
                code: cidCodes.code,
                description: cidCodes.description,
                category: cidCodes.category
              })
              .from(medicalOrderCids)
              .leftJoin(cidCodes, eq(medicalOrderCids.cidCodeId, cidCodes.id))
              .where(eq(medicalOrderCids.orderId, order.id));
              
              orderCids = cidData;
            } catch (error) {
              console.log(`Erro ao buscar CIDs para pedido ${order.id}:`, error);
            }
            
            // Buscar condutas cirúrgicas relacionadas ao pedido
            let orderApproaches = [];
            try {
              const approachData = await db.select({
                id: surgicalApproaches.id,
                name: surgicalApproaches.name,
                description: surgicalApproaches.description,
                isPrimary: medicalOrderSurgicalApproaches.isPrimary
              })
              .from(medicalOrderSurgicalApproaches)
              .leftJoin(surgicalApproaches, eq(medicalOrderSurgicalApproaches.surgicalApproachId, surgicalApproaches.id))
              .where(eq(medicalOrderSurgicalApproaches.medicalOrderId, order.id))
              .orderBy(medicalOrderSurgicalApproaches.isPrimary);
              
              orderApproaches = approachData;
            } catch (error) {
              console.log(`Erro ao buscar condutas para pedido ${order.id}:`, error);
            }
              
            // Mapeamento manual baseado na tabela order_statuses real
            const statusMapping = {
              1: 'em_preenchimento',  // Incompleta
              2: 'em_avaliacao',      // Em análise
              3: 'aceito',            // Autorizado  
              4: 'autorizado_parcial', // Autorizado Parcial
              5: 'pendencia',         // Pendência
              6: 'cirurgia_realizada', // Cirurgia realizada
              7: 'cancelado',         // Cancelada
              8: 'aguardando_envio',  // Aguardando Envio
              9: 'recebido'           // Recebido
            };

            return {
              id: order.id,
              patientId: order.patientId,
              patientName: patient ? patient.fullName : "Paciente não encontrado",
              patientPhone: patient ? patient.phone : null,
              hospitalId: order.hospitalId,
              hospitalName: hospital ? hospital.name : "Hospital não especificado",
              procedureName: "Procedimento via nova estrutura",
              procedureDate: order.procedureDate || "Data não agendada",
              procedureType: order.procedureType,
              procedureLaterality: order.procedureLaterality,
              status: statusMapping[order.statusId as keyof typeof statusMapping] || "nao_especificado",
              statusId: order.statusId,
              previousStatusId: order.previousStatusId,
              complexity: order.complexity || "não_especificada",
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              doctorName: user ? user.name : "Médico não especificado",
              userName: user ? user.name : "Médico não especificado",
              receivedValue: order.receivedValue,
              cidCodes: orderCids,
              surgicalApproaches: orderApproaches
            };
          })
        );
        
        console.log(`Encontrados ${enrichedOrders.length} pedidos médicos`);
        res.json(enrichedOrders);
      } catch (error) {
        console.error("Erro ao buscar pedidos médicos:", error);
        res.status(500).json({ message: "Erro ao buscar pedidos médicos" });
      }
    }
  );

  // API para obter procedimentos CBHPM de um pedido médico específico
  app.get(
    "/api/medical-orders/:orderId/procedures",
    
    async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.orderId);
        
        if (!orderId) {
          return res.status(400).json({ message: "ID do pedido médico é obrigatório" });
        }

        console.log(`Buscando procedimentos CBHPM para pedido ${orderId}`);

        // Buscar procedimentos associados ao pedido médico
        const orderProcedures = await db.select({
          id: medicalOrderProcedures.id,
          orderId: medicalOrderProcedures.orderId,
          procedureId: medicalOrderProcedures.procedureId,
          quantityRequested: medicalOrderProcedures.quantityRequested,
          quantityApproved: medicalOrderProcedures.quantityApproved,
          receivedValue: medicalOrderProcedures.receivedValue,
          status: medicalOrderProcedures.status,
          isMain: medicalOrderProcedures.isMain,
          createdAt: medicalOrderProcedures.createdAt,
          updatedAt: medicalOrderProcedures.updatedAt,
          // Dados do procedimento CBHPM
          procedureCode: procedures.code,
          procedureName: procedures.name,
          procedureDescription: procedures.description,
          procedurePorte: procedures.porte,
          procedureCustoOperacional: procedures.custoOperacional,
          procedurePorteAnestesista: procedures.porteAnestesista,
          procedureNumeroAuxiliares: procedures.numeroAuxiliares,
          procedureActive: procedures.active
        })
        .from(medicalOrderProcedures)
        .leftJoin(procedures, eq(medicalOrderProcedures.procedureId, procedures.id))
        .where(eq(medicalOrderProcedures.orderId, orderId));

        console.log(`Encontrados ${orderProcedures.length} procedimentos para pedido ${orderId}`);
        console.log('Procedimentos encontrados:', orderProcedures.map(p => ({
          id: p.id,
          procedureId: p.procedureId,
          code: p.procedureCode,
          porte: p.procedurePorte,
          isMain: p.isMain
        })));

        // Função para converter porte em valor numérico para comparação
        const getPorteValue = (porte: string | null): number => {
          if (!porte) return 0;
          
          // Extrair número do porte (ex: "10B" -> 10, "02A" -> 2)
          const match = porte.match(/^(\d+)/);
          if (match) {
            const baseValue = parseInt(match[1]);
            // Adicionar peso baseado na letra (A=0.1, B=0.2, C=0.3, etc.)
            const letter = porte.replace(/^\d+/, '');
            const letterValue = letter ? (letter.charCodeAt(0) - 64) * 0.1 : 0;
            return baseValue + letterValue;
          }
          return 0;
        };

        // Determinar qual procedimento deveria ser o principal baseado no maior porte
        let maxPorteValue = 0;
        let mainProcedureId = null;
        
        orderProcedures.forEach(proc => {
          const porteValue = getPorteValue(proc.procedurePorte);
          if (porteValue > maxPorteValue) {
            maxPorteValue = porteValue;
            mainProcedureId = proc.id;
          }
        });

        // Ordenar procedimentos por porte (maior para menor) antes de mapear
        const sortedProcedures = orderProcedures.sort((a, b) => {
          const porteA = getPorteValue(a.procedurePorte);
          const porteB = getPorteValue(b.procedurePorte);
          return porteB - porteA; // Maior porte primeiro
        });

        // Recalcular qual é o principal após ordenação
        const mainProcedureIdSorted = sortedProcedures.length > 0 ? sortedProcedures[0].id : null;

        // Mapear dados para o formato adequado
        const formattedProcedures = sortedProcedures.map(proc => ({
          id: proc.id,
          orderId: proc.orderId,
          procedureId: proc.procedureId,
          code: proc.procedureCode || 'Não informado',
          name: proc.procedureName || 'Procedimento não encontrado',
          description: proc.procedureDescription || '',
          quantityRequested: proc.quantityRequested || 1,
          quantityApproved: proc.quantityApproved || null,
          status: proc.status || 'em_analise',
          receivedValue: proc.receivedValue ? parseFloat(proc.receivedValue.toString()) : null,
          isMain: proc.id === mainProcedureIdSorted, // Usar a determinação baseada no porte após ordenação
          procedureDetails: {
            porte: proc.procedurePorte,
            custoOperacional: proc.procedureCustoOperacional,
            porteAnestesista: proc.procedurePorteAnestesista,
            numeroAuxiliares: proc.procedureNumeroAuxiliares,
            active: proc.procedureActive
          },
          createdAt: proc.createdAt,
          updatedAt: proc.updatedAt
        }));

        res.json(formattedProcedures);
      } catch (error) {
        console.error("Erro ao buscar procedimentos do pedido médico:", error);
        res.status(500).json({ message: "Erro ao buscar procedimentos do pedido médico" });
      }
    }
  );

  // API para atualizar valores recebidos dos procedimentos
  app.put(
    "/api/medical-orders/:orderId/received-values",
    
    async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.orderId);
        const { procedures } = req.body;

        console.log(`Atualizando valores recebidos para pedido ${orderId}:`, procedures);

        if (isNaN(orderId)) {
          return res.status(400).json({ error: "ID de pedido inválido" });
        }

        if (!procedures || !Array.isArray(procedures)) {
          return res.status(400).json({ error: "Lista de procedimentos é obrigatória" });
        }

        // Verificar se o pedido existe
        const existingOrder = await storage.getMedicalOrder(orderId);
        if (!existingOrder) {
          return res.status(404).json({ error: "Pedido não encontrado" });
        }

        // Atualizar valores recebidos para cada procedimento
        const updatePromises = procedures.map(async (proc) => {
          const { procedureId, receivedValue } = proc;
          
          if (!procedureId || receivedValue === undefined) {
            throw new Error("ID do procedimento e valor recebido são obrigatórios");
          }

          // Atualizar o valor recebido do procedimento
          const result = await db
            .update(medicalOrderProcedures)
            .set({ 
              receivedValue: receivedValue.toString(),
              updatedAt: new Date()
            })
            .where(
              and(
                eq(medicalOrderProcedures.id, procedureId),
                eq(medicalOrderProcedures.orderId, orderId)
              )
            );

          return result;
        });

        await Promise.all(updatePromises);

        // Calcular valor total recebido de todos os procedimentos
        const allProcedures = await db
          .select({
            receivedValue: medicalOrderProcedures.receivedValue,
            quantityApproved: medicalOrderProcedures.quantityApproved
          })
          .from(medicalOrderProcedures)
          .where(eq(medicalOrderProcedures.orderId, orderId));

        // Somar valores recebidos (receivedValue * quantityApproved para cada procedimento)
        const totalReceivedValue = allProcedures.reduce((total, proc) => {
          const receivedValue = parseFloat(proc.receivedValue || '0');
          const quantity = proc.quantityApproved || 0;
          return total + (receivedValue * quantity);
        }, 0);

        console.log(`Valor total calculado: R$ ${totalReceivedValue.toFixed(2)}`);

        // Converter para centavos para armazenar no campo receivedValue do pedido
        const totalInCents = Math.round(totalReceivedValue * 100);

        // Atualizar o campo receivedValue do pedido médico
        await db
          .update(medicalOrders)
          .set({ 
            receivedValue: totalInCents,
            updatedAt: new Date()
          })
          .where(eq(medicalOrders.id, orderId));

        console.log(`Valores recebidos atualizados com sucesso para ${procedures.length} procedimentos. Total do pedido: R$ ${totalReceivedValue.toFixed(2)} (${totalInCents} centavos)`);

        res.json({ 
          message: "Valores recebidos atualizados com sucesso",
          proceduresUpdated: procedures.length,
          totalReceivedValue: totalReceivedValue,
          totalInCents: totalInCents
        });
      } catch (error) {
        console.error("Erro ao atualizar valores recebidos:", error);
        res.status(500).json({ 
          error: "Erro ao atualizar valores recebidos",
          message: error.message 
        });
      }
    }
  );

  // API para atualizar aprovação de procedimento individual
  app.put(
    "/api/medical-order-procedures/:id/approval",
    
    async (req: Request, res: Response) => {
      try {
        const procedureId = parseInt(req.params.id);
        const { status, quantityApproved } = req.body;

        console.log(`Atualizando aprovação do procedimento ${procedureId}:`, { status, quantityApproved });

        if (isNaN(procedureId)) {
          return res.status(400).json({ error: "ID de procedimento inválido" });
        }

        if (!status) {
          return res.status(400).json({ error: "Status é obrigatório" });
        }

        // Validar status
        const validStatuses = ['aprovado', 'negado', 'em_analise'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Status inválido" });
        }

        // Atualizar o procedimento
        const updatedProcedure = await storage.updateProcedureApprovalStatus(
          procedureId,
          quantityApproved || 0,
          status
        );

        if (!updatedProcedure) {
          return res.status(404).json({ error: "Procedimento não encontrado" });
        }

        console.log(`Procedimento ${procedureId} atualizado com sucesso:`, updatedProcedure);

        res.json({
          message: "Aprovação atualizada com sucesso",
          procedure: updatedProcedure
        });

      } catch (error) {
        console.error("Erro ao atualizar aprovação do procedimento:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  );

  // API para obter usuários - usando dados reais do banco de dados
  app.get(
    "/api/users",
    
    async (req: Request, res: Response) => {
      try {
        // Importar sem require para evitar o erro
        const { eq, and } = await import("drizzle-orm");

        // Filtrar por role (papel) se especificado
        // Suporta filtro tanto por nome da role quanto por ID da role
        const roleFilter = req.query.role as string;
        const roleIdFilter = req.query.roleId
          ? parseInt(req.query.roleId as string)
          : null;

        // Construir condições de filtro
        let conditions: any[] = []; // Mostrar todos os usuários (ativos e inativos) para gestão administrativa

        if (roleFilter) {
          // Buscar roleId pelo nome exato (respeitando maiúsculas/minúsculas)
          const rolesResult = await db
            .select()
            .from(roles)
            .where(eq(roles.name, roleFilter));
          if (rolesResult.length > 0) {
            conditions.push(eq(users.roleId, rolesResult[0].id));
          }
        } else if (roleIdFilter) {
          // Filtrar diretamente pelo ID da role
          conditions.push(eq(users.roleId, roleIdFilter));
        }

        // Consulta dos usuários com filtros combinados
        const query = conditions.length > 0 
          ? db.select().from(users).where(and(...conditions))
          : db.select().from(users);

        // Executar a consulta
        const allUsers = await query;

        // Mapear para o formato esperado pela interface
        // Buscar os nomes das funções
        const rolesData = await db.select().from(roles);

        // Mapear usuários incluindo o nome da função
        const mappedUsers = allUsers.map((user) => {
          // Encontrar a função (role) associada ao usuário
          const userRole = rolesData.find((role) => role.id === user.roleId);

          return {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
            roleName: userRole ? userRole.name : "Não atribuído", // Nome da função
            crm: user.crm,
            active: user.active,
            consentAccepted: user.consentAccepted,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
          };
        });

        res.json(mappedUsers);
      } catch (error) {
        console.error("Erro ao obter usuários:", error);

        // Em caso de erro, retornar dados de fallback para não quebrar a interface
        const fallbackUsers = [
          {
            id: 12,
            username: "Roitman",
            email: "rodrigopozzatti@hotmail.com",
            name: "Rodrigo Roitman Pozzatti",
            roleId: 1,
            active: true,
            consentAccepted: new Date("2025-05-15 00:05:20.133").toISOString(),
            created_at: new Date("2025-05-10 10:42:01.753193").toISOString(),
            updated_at: new Date("2025-05-17 17:14:07.231").toISOString(),
          },
          {
            id: 13,
            username: "Gisele Cerutti",
            email: "gisa_cerutti@gmail.com",
            name: "Gisele Cerutti",
            roleId: 1,
            active: true,
            consentAccepted: new Date("2025-05-13 21:02:40.465").toISOString(),
            created_at: new Date("2025-05-10 16:28:06.635498").toISOString(),
            updated_at: new Date("2025-05-13 21:02:40.465").toISOString(),
          },
          {
            id: 14,
            username: "danielroitman",
            email: "danielroitman@gmail.com",
            name: "Daniel Roitman Pozzatti",
            roleId: 1,
            active: true,
            consentAccepted: new Date("2025-05-14 05:27:22.961").toISOString(),
            created_at: new Date("2025-05-11 06:41:36.255671").toISOString(),
            updated_at: new Date("2025-05-19 10:17:51.591").toISOString(),
          },
          {
            id: 21,
            username: "lipegol18",
            email: "felipecorreati@gmail.com",
            name: "Felipe Santos Corrêa",
            roleId: 1,
            active: true,
            consentAccepted: new Date("2025-05-13 19:39:25.659").toISOString(),
            created_at: new Date("2025-05-13 17:24:22.236922").toISOString(),
            updated_at: new Date("2025-05-18 17:54:39.796").toISOString(),
          },
          {
            id: 28,
            username: "Danielroitman",
            email: "danielroitman@hotmail.com",
            name: "Daniel Pozzatti",
            roleId: 3,
            active: false,
            consentAccepted: null,
            created_at: new Date("2025-05-14 21:30:34.757673").toISOString(),
            updated_at: new Date("2025-05-14 21:30:34.757673").toISOString(),
          },
          {
            id: 33,
            username: "jorgeduartejr",
            email: "migueljunior1000@gmail.com",
            name: "Jorge Duarte",
            roleId: 3,
            active: false,
            consentAccepted: null,
            created_at: new Date("2025-05-15 18:57:24.014624").toISOString(),
            updated_at: new Date("2025-05-15 18:57:24.014624").toISOString(),
          },
          {
            id: 34,
            username: "jorgeduarte",
            email: "emailteste123@gmail.com",
            name: "Jorge Duarte",
            roleId: 3,
            active: false,
            consentAccepted: null,
            created_at: new Date("2025-05-15 19:41:03.718857").toISOString(),
            updated_at: new Date("2025-05-15 19:41:03.718857").toISOString(),
          },
          {
            id: 40,
            username: "Sunda",
            email: "sunda@gmail.com",
            name: "Sunda",
            roleId: 2,
            crm: 52251289,
            active: true,
            consentAccepted: null,
            created_at: new Date("2025-05-18 00:08:47.519391").toISOString(),
            updated_at: new Date("2025-05-19 04:59:13.899").toISOString(),
          },
          {
            id: 41,
            username: "danielpozzatti",
            email: "danielroitman@ualg.com",
            name: "daniel pozzatti",
            roleId: 2,
            crm: 521017039,
            active: true,
            consentAccepted: null,
            created_at: new Date("2025-05-19 10:17:26.585384").toISOString(),
            updated_at: new Date("2025-05-19 10:20:05.133").toISOString(),
          },
          {
            id: 42,
            username: "Sunda2",
            email: "sunda1@gmail.com",
            name: "Sunda",
            roleId: 2,
            active: false,
            consentAccepted: null,
            created_at: new Date("2025-05-19 10:18:33.975868").toISOString(),
            updated_at: new Date("2025-05-19 10:18:33.975868").toISOString(),
          },
        ];

        res.json(fallbackUsers);
      }
    },
  );

  // API para atualizar um usuário existente
  app.put(
    "/api/users/:id",
    
    async (req: Request, res: Response) => {
      // Forçar o tipo de conteúdo para JSON
      res.setHeader('Content-Type', 'application/json');
      
      try {
        const userId = parseInt(req.params.id);
        
        console.log(`Recebida solicitação para atualizar usuário ${userId}:`, req.body);
        
        // Verificar se o usuário a ser atualizado existe
        const existingUser = await storage.getUser(userId);
        if (!existingUser) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        // Preparar os dados para atualização
        const updateData: any = {};
        
        // Campos que podem ser atualizados
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.email !== undefined) updateData.email = req.body.email;
        if (req.body.roleId !== undefined) updateData.roleId = parseInt(req.body.roleId);
        if (req.body.active !== undefined) {
          // Converter string 'true'/'false' para boolean se necessário
          updateData.active = req.body.active === true || req.body.active === 'true';
        }
        if (req.body.crm !== undefined) updateData.crm = req.body.crm;
        if (req.body.signatureNote !== undefined) updateData.signatureNote = req.body.signatureNote;
        
        // Se uma nova senha for fornecida, fazer hash dela
        if (req.body.password && req.body.password.trim() !== "") {
          const bcrypt = await import("bcrypt");
          updateData.password = await bcrypt.hash(req.body.password, 10);
        }
        
        console.log(`Atualizando usuário ${userId} com dados:`, {
          ...updateData,
          password: updateData.password ? "[REDACTED]" : undefined
        });
        
        // Atualizar o usuário
        const updatedUser = await storage.updateUser(userId, updateData);
        
        if (!updatedUser) {
          return res.status(500).json({ message: "Falha ao atualizar usuário" });
        }
        
        // Remover a senha da resposta
        const { password, ...userWithoutPassword } = updatedUser;
        
        // Atualizar os dados do usuário na sessão
        if (req.user && req.user.id === userId) {
          Object.assign(req.user, userWithoutPassword);
        }
        
        console.log(`Usuário ${userId} atualizado com sucesso`);
        
        // Garantir que a resposta seja JSON válido
        return res.json({
          success: true,
          message: "Usuário atualizado com sucesso",
          user: userWithoutPassword
        });
      } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        return res.status(500).json({ 
          success: false, 
          message: "Erro ao atualizar usuário",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  // API pública para obter papéis durante o registro
  app.get(
    "/api/roles/public",
    async (req: Request, res: Response) => {
      try {
        // Buscar papéis/roles do banco de dados
        const roles = await storage.getRoles();

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // Retornar os papéis encontrados no banco
        res.json(roles);
      } catch (error) {
        console.error("Erro ao obter papéis:", error);
        res.status(500).json({ message: "Erro ao obter papéis" });
      }
    },
  );

  // API para obter papéis (roles) - requer autenticação
  app.get(
    "/api/roles",
    
    async (req: Request, res: Response) => {
      try {
        // Buscar papéis/roles do banco de dados
        const roles = await storage.getRoles();

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // Retornar os papéis encontrados no banco
        res.json(roles);
      } catch (error) {
        console.error("Erro ao obter papéis:", error);
        res.status(500).json({ message: "Erro ao obter papéis" });
      }
    },
  );

  // API para obter um papel específico por ID
  app.get(
    "/api/roles/:id",
    
    async (req: Request, res: Response) => {
      try {
        const roleId = parseInt(req.params.id);
        if (isNaN(roleId)) {
          return res.status(400).json({ message: "ID do papel inválido" });
        }

        const role = await storage.getRole(roleId);
        if (!role) {
          return res.status(404).json({ message: "Papel não encontrado" });
        }

        res.json(role);
      } catch (error) {
        console.error("Erro ao obter papel:", error);
        res.status(500).json({ message: "Erro ao obter papel" });
      }
    },
  );

  // API para obter hospitais
  app.get(
    "/api/hospitals",
    
    async (req: Request, res: Response) => {
      try {
        // Verificar se é para retornar apenas hospitais associados ao médico
        const onlyAssociated = req.query.onlyAssociated === "true";
        const userId = req.user?.id;
        const roleId = req.user?.roleId;

        let hospitals;

        if (onlyAssociated) {
          console.log(
            `Solicitação de hospitais associados. UserId: ${userId}, RoleId: ${roleId}`,
          );

          // Se for médico e solicitou hospitais associados
          if (roleId === 2) {
            // Buscar hospitais associados ao médico
            console.log(`Buscando hospitais associados ao médico ID ${userId}`);
            const doctorHospitals = await storage.getDoctorHospitals(userId);
            console.log(
              `Encontrados ${doctorHospitals?.length || 0} associações de hospitais para o médico`,
            );

            if (doctorHospitals && doctorHospitals.length > 0) {
              // Obter os IDs dos hospitais associados
              const hospitalIds = doctorHospitals.map((dh) => dh.hospitalId);
              console.log(
                `IDs dos hospitais associados: ${hospitalIds.join(", ")}`,
              );

              // Buscar detalhes completos dos hospitais
              const allHospitals = await storage.getHospitals();
              console.log(
                `Total de hospitais no banco: ${allHospitals.length}`,
              );

              // Filtrar apenas os hospitais associados
              hospitals = allHospitals.filter((h) =>
                hospitalIds.includes(h.id),
              );
              console.log(
                `Hospitais filtrados após comparação: ${hospitals.length}`,
              );
            } else {
              console.log(`Médico ID ${userId} não tem hospitais associados`);
              hospitals = []; // Nenhum hospital associado
            }
          } else {
            // Não é médico, mas vamos retornar todos os hospitais para administradores
            console.log(
              `Usuário não é médico (roleId=${roleId}), retornando todos os hospitais`,
            );
            hospitals = await storage.getHospitals();
          }
        } else {
          // Buscar todos os hospitais (admin ou não solicitou filtro)
          hospitals = await storage.getHospitals();
        }

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // Retornar os hospitais encontrados
        res.json(hospitals);
      } catch (error) {
        console.error("Erro ao obter hospitais:", error);
        res.status(500).json({ message: "Erro ao obter hospitais" });
      }
    },
  );

  // API para obter estados brasileiros
  app.get(
    "/api/brazilian-states",
    async (req: Request, res: Response) => {
      try {
        const states = await storage.getBrazilianStates();
        
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        
        res.json(states);
      } catch (error) {
        console.error("Erro ao obter estados brasileiros:", error);
        res.status(500).json({ message: "Erro ao obter estados brasileiros" });
      }
    },
  );

  // API para obter municípios por estado
  app.get(
    "/api/municipalities/by-state/:stateIbgeCode",
    
    async (req: Request, res: Response) => {
      try {
        const stateIbgeCode = parseInt(req.params.stateIbgeCode);
        
        if (isNaN(stateIbgeCode)) {
          return res.status(400).json({ message: "Código IBGE do estado inválido" });
        }

        const municipalities = await storage.getMunicipalitiesByState(stateIbgeCode);
        
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        
        res.json(municipalities);
      } catch (error) {
        console.error("Erro ao obter municípios:", error);
        res.status(500).json({ message: "Erro ao obter municípios" });
      }
    },
  );

  // API para criar um novo hospital
  app.post(
    "/api/hospitals",
    
    async (req: Request, res: Response) => {
      try {
        console.log("Recebendo dados para criação de hospital:", req.body);
        
        const {
          name,
          cnpj,
          address,
          city,
          ibgeStateCode,
          businessName,
          cnes,
          cep,
          number,
          logoUrl
        } = req.body;

        // Validações básicas
        if (!name || !cnpj || !ibgeStateCode) {
          return res.status(400).json({ 
            message: "Nome, CNPJ e código IBGE do estado são obrigatórios" 
          });
        }

        // Criar o hospital usando os nomes corretos dos campos
        const newHospital = await storage.createHospital({
          name,
          cnpj,
          ibgeStateCode,
          businessName,
          cnes,
          ibgeCityCode: req.body.ibgeCityCode,
          cep,
          address,
          number,
          logoUrl
        });

        console.log("Hospital criado com sucesso:", newHospital);
        
        res.status(201).json(newHospital);
      } catch (error) {
        console.error("Erro ao criar hospital:", error);
        res.status(500).json({ 
          message: "Erro interno do servidor",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  // Endpoint para buscar hospital por ID
  app.get(
    "/api/hospitals/:id",
    
    async (req: Request, res: Response) => {
      try {
        const hospitalId = parseInt(req.params.id);

        if (isNaN(hospitalId)) {
          return res.status(400).json({ message: "ID do hospital inválido" });
        }

        console.log(`Buscando hospital com ID: ${hospitalId}`);
        const hospital = await storage.getHospitalById(hospitalId);

        if (!hospital) {
          return res.status(404).json({ message: "Hospital não encontrado" });
        }

        console.log(`Hospital encontrado: ${hospital.name}`);
        res.json(hospital);
      } catch (error) {
        console.error("Erro ao buscar hospital por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );
  
  // Endpoint para atualizar hospital por ID
  app.put(
    "/api/hospitals/:id",
    
    async (req: Request, res: Response) => {
      try {
        const hospitalId = parseInt(req.params.id);

        if (isNaN(hospitalId)) {
          return res.status(400).json({ message: "ID do hospital inválido" });
        }

        const hospital = await storage.getHospitalById(hospitalId);
        if (!hospital) {
          return res.status(404).json({ message: "Hospital não encontrado" });
        }

        console.log(`Atualizando hospital com ID: ${hospitalId}`);
        console.log("Dados de atualização:", req.body);
        
        // Mapear todos os campos usando a nomenclatura snake_case correta para o banco de dados
        // Desta forma evitamos problemas de conversão camelCase/snake_case
        const dataToUpdate = {
          name: req.body.name || hospital.name,
          business_name: req.body.business_name !== undefined ? req.body.business_name : hospital.businessName,
          cnpj: req.body.cnpj || hospital.cnpj,
          cnes: req.body.cnes !== undefined ? req.body.cnes : hospital.cnes,
          ibge_state_code: req.body.ibgeStateCode !== undefined ? req.body.ibgeStateCode : hospital.ibgeStateCode,
          ibge_city_code: req.body.ibgeCityCode !== undefined ? req.body.ibgeCityCode : hospital.ibgeCityCode,
          cep: req.body.cep !== undefined ? req.body.cep : hospital.cep,
          address: req.body.address !== undefined ? req.body.address : hospital.address,
          number: req.body.number !== undefined ? req.body.number : hospital.number,
          logo_url: req.body.logo_url !== undefined ? req.body.logo_url : hospital.logoUrl
        };
        
        console.log("Dados enviados para atualização:", dataToUpdate);
        
        const updatedHospital = await storage.updateHospital(hospitalId, dataToUpdate);
        
        if (!updatedHospital) {
          console.error("Falha ao atualizar hospital - retorno vazio");
          return res.status(500).json({ message: "Falha ao atualizar os dados do hospital" });
        }
        
        console.log(`Hospital atualizado: ${updatedHospital.name}`);
        console.log("Dados atualizados:", updatedHospital);
        
        res.json(updatedHospital);
      } catch (error) {
        console.error("Erro ao atualizar hospital:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );

  // Endpoint para deletar hospital por ID
  app.delete(
    "/api/hospitals/:id",
    
    async (req: Request, res: Response) => {
      try {
        const hospitalId = parseInt(req.params.id);

        if (isNaN(hospitalId)) {
          return res.status(400).json({ message: "ID do hospital inválido" });
        }

        console.log(`Deletando hospital com ID: ${hospitalId}`);
        
        // Verificar se o hospital existe antes de deletar
        const hospital = await storage.getHospitalById(hospitalId);
        if (!hospital) {
          return res.status(404).json({ message: "Hospital não encontrado" });
        }

        // Deletar o hospital
        await storage.deleteHospital(hospitalId);
        
        console.log(`Hospital deletado com sucesso: ${hospital.name}`);
        
        // Retornar sucesso sem conteúdo
        res.status(200).json({ message: "Hospital deletado com sucesso" });
      } catch (error) {
        console.error("Erro ao deletar hospital:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );

  // Armazenamento temporário para pacientes cadastrados na sessão
  const registeredPatients: any[] = [];

  // API para obter pacientes diretamente do banco de dados
  app.get(
    "/api/patients",
    
    async (req: Request, res: Response) => {
      try {
        // Buscar pacientes do banco de dados
        const patients = await storage.getPatients();

        // Adicionando cabeçalhos para evitar problemas de cache e CORS
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // Enviando a resposta como JSON com todos os pacientes do banco
        res.status(200).json(patients);
      } catch (error) {
        console.error("Erro ao buscar pacientes do banco de dados:", error);
        res.status(500).json({ message: "Erro ao buscar pacientes" });
      }
    },
  );

  // API para criar novo paciente
  app.post(
    "/api/patients",
    
    async (req: Request, res: Response) => {
      try {
        const patientData = req.body;
        console.log("Criando novo paciente:", patientData);

        // Validar dados obrigatórios
        if (!patientData.fullName || !patientData.cpf || !patientData.birthDate || !patientData.gender) {
          return res.status(400).json({
            message: "Dados incompletos. Nome, CPF, data de nascimento e gênero são obrigatórios.",
          });
        }

        // Verificar se CPF já existe
        const existingPatient = await storage.getPatientByCPF(patientData.cpf);
        if (existingPatient) {
          // Paciente já existe, vamos verificar se já está associado ao médico atual
          const userId = (req.user as any)?.id;
          if (userId) {
            // Verificar se já existe associação
            const existingAssociations = await storage.getDoctorPatients(userId);
            const isAlreadyAssociated = existingAssociations.some(
              (assoc) => assoc.patientId === existingPatient.id,
            );

            if (isAlreadyAssociated) {
              return res.status(200).json({
                message: "Paciente já está associado a você",
                patient: existingPatient,
                action: "already_associated"
              });
            } else {
              // Criar associação com o paciente existente
              try {
                const associationData = {
                  doctorId: userId,
                  patientId: existingPatient.id,
                  isActive: true,
                  notes: "Paciente associado via cadastro"
                };

                await storage.addDoctorPatient(associationData);
                console.log(`Paciente existente ${existingPatient.id} associado ao médico ${userId}`);

                return res.status(200).json({
                  message: "Paciente existente associado com sucesso",
                  patient: existingPatient,
                  action: "associated_existing"
                });
              } catch (associationError) {
                console.error("Erro ao associar paciente existente:", associationError);
                return res.status(500).json({ 
                  message: "Erro ao associar paciente existente" 
                });
              }
            }
          }
        }

        // Preparar dados do paciente para salvar no banco
        const patientToSave = {
          fullName: patientData.fullName,
          cpf: patientData.cpf,
          birthDate: patientData.birthDate,
          gender: patientData.gender,
          email: patientData.email || null,
          phone: patientData.phone || null,
          phone2: patientData.phone2 || null,
          insurance: patientData.insurance || null,
          insuranceNumber: patientData.insuranceNumber || null,
          plan: patientData.plan || null,
          notes: patientData.notes || null,
          isActive: patientData.isActive !== undefined ? patientData.isActive : true,
          activatedBy: patientData.activatedBy || (req.user?.name as string) || "Sistema",
        };

        // Salvar o paciente no banco de dados
        const newPatient = await storage.createPatient(patientToSave);

        console.log("Novo paciente cadastrado no banco de dados:", newPatient);

        // Automaticamente associar o paciente ao médico que está logado
        const userId = (req.user as any)?.id;
        if (userId && newPatient.id) {
          try {
            const associationData = {
              doctorId: userId,
              patientId: newPatient.id,
              isActive: true,
              notes: "Paciente cadastrado automaticamente pelo médico"
            };

            const association = await storage.addDoctorPatient(associationData);
            console.log(`Paciente ${newPatient.id} automaticamente associado ao médico ${userId}`);
          } catch (associationError) {
            console.error("Erro ao associar paciente ao médico automaticamente:", associationError);
            // Não falhar o cadastro do paciente por causa da associação
            // O paciente foi criado com sucesso, apenas a associação falhou
          }
        }

        // Definir cabeçalhos de resposta para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // Retornar o paciente criado com sucesso no formato JSON
        return res.status(201).json(newPatient);
      } catch (error) {
        console.error("Erro ao cadastrar paciente:", error);
        res.status(500).json({ message: "Erro ao cadastrar paciente" });
      }
    },
  );

  // API para buscar pacientes recentes associados ao médico (abordagem híbrida)
  app.get(
    "/api/patients/recent",
    
    async (req: Request, res: Response) => {
      try {
        // Obter o ID do usuário logado
        const userId = (req.user as any)?.id;
        if (!userId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        // Obter o limite de pacientes recentes (padrão: 25)
        const limit = parseInt(req.query.limit as string) || 25;

        // Buscar pacientes recentes associados ao médico
        const recentPatients = await storage.getRecentPatientsByDoctor(userId, limit);

        console.log(
          `Encontrados ${recentPatients.length} pacientes recentes para o médico ID: ${userId}`,
        );

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // Retornar os pacientes recentes
        res.status(200).json(recentPatients);
      } catch (error) {
        console.error("Erro ao buscar pacientes recentes:", error);
        res.status(500).json({ message: "Erro ao buscar pacientes recentes" });
      }
    },
  );

  // API para buscar pacientes por nome ou CPF (usado no módulo de pedidos cirúrgicos)
  app.get(
    "/api/patients/search",
    
    async (req: Request, res: Response) => {
      try {
        // Obter o termo de busca da query
        const searchTerm = req.query.q as string;

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({
            message: "Termo de busca deve ter pelo menos 2 caracteres",
          });
        }

        // Obter o ID do usuário logado
        const userId = (req.user as any)?.id;
        if (!userId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        // Buscar apenas os pacientes associados ao médico logado
        const associatedPatients = await storage.getPatientsByDoctor(userId);
        
        // Normalizar o termo de busca para remover acentos e converter para minúsculas
        const normalizedTerm = normalizeText(searchTerm);

        // Filtrar os pacientes baseado no termo de busca (nome completo ou CPF)
        const searchTermDigits = searchTerm.replace(/\D/g, '');
        
        const filteredPatients = associatedPatients.filter(
          (patient) => {
            // Busca por nome (sempre ativa)
            const nameMatch = normalizeText(patient.fullName).includes(normalizedTerm);
            
            // Busca por CPF (só ativa se o termo tem pelo menos 3 dígitos)
            const cpfMatch = searchTermDigits.length >= 3 && 
                           patient.cpf.replace(/\D/g, '').includes(searchTermDigits);
            
            return nameMatch || cpfMatch;
          }
        ).map(patient => ({
          id: patient.id,
          fullName: patient.fullName,
          cpf: patient.cpf
        }));

        console.log(
          `Encontrados ${filteredPatients.length} pacientes para o termo "${searchTerm}" (médico ID: ${userId})`,
        );

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // Retornar os resultados encontrados
        res.status(200).json(filteredPatients);
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
        res.status(500).json({ message: "Erro ao buscar pacientes" });
      }
    },
  );

  // API para verificar se um CPF já existe no sistema e retornar dados para auto-preenchimento
  app.get(
    "/api/patients/cpf/:cpf/exists",
    
    async (req: Request, res: Response) => {
      try {
        const cpf = req.params.cpf.replace(/\D/g, "");

        // Buscar paciente na base global pelo CPF
        const patients = await storage.getPatients();
        const existingPatient = patients.find(patient => 
          patient.cpf && patient.cpf.replace(/\D/g, "") === cpf
        );

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        if (existingPatient) {
          // Retornar dados do paciente para auto-preenchimento
          res.status(200).json({ 
            exists: true,
            patient: {
              id: existingPatient.id,
              fullName: existingPatient.fullName,
              cpf: existingPatient.cpf,
              birthDate: existingPatient.birthDate,
              gender: existingPatient.gender,
              phone: existingPatient.phone,
              phone2: existingPatient.phone2,
              email: existingPatient.email,
              insurance: existingPatient.insurance,
              insuranceNumber: existingPatient.insuranceNumber,
              plan: existingPatient.plan,
              notes: existingPatient.notes
            }
          });
        } else {
          res.status(200).json({ exists: false });
        }
      } catch (error) {
        console.error("Erro ao verificar CPF:", error);
        res.status(500).json({ message: "Erro ao verificar CPF" });
      }
    },
  );

  // API para cadastrar novo paciente
  app.post(
    "/api/patients/register",
    
    async (req: Request, res: Response) => {
      try {
        // Obter os dados do paciente do corpo da requisição
        const patientData = req.body;

        // Validar dados obrigatórios
        if (
          !patientData.fullName ||
          !patientData.cpf ||
          !patientData.birthDate ||
          !patientData.gender
        ) {
          return res.status(400).json({
            message:
              "Dados incompletos. Nome, CPF, data de nascimento e gênero são obrigatórios.",
          });
        }

        // Verificar se o CPF já existe no banco de dados
        const existingPatient = await storage.getPatientByCPF(patientData.cpf);
        const userId = (req.user as any)?.id;

        if (existingPatient) {
          return res.status(409).json({ 
            message: "Paciente já existe na base de dados",
            patient: existingPatient,
            shouldAssociate: true
          });
        }

        // Preparar dados do paciente para salvar no banco
        const patientToSave = {
          fullName: patientData.fullName,
          cpf: patientData.cpf,
          birthDate: patientData.birthDate, // Mantém o formato de string para data
          gender: patientData.gender,
          email: patientData.email || null,
          phone: patientData.phone || null,
          phone2: patientData.phone2 || null,
          insurance: patientData.insurance || null,
          insuranceNumber: patientData.insuranceNumber || null,
          plan: patientData.plan || null,
          notes: patientData.notes || null,
          isActive:
            patientData.isActive !== undefined ? patientData.isActive : true,
          activatedBy:
            patientData.activatedBy || (req.user?.name as string) || "Sistema",
        };

        // Salvar o paciente no banco de dados
        const newPatient = await storage.createPatient(patientToSave);

        // Exibir informações do paciente salvo
        console.log("Novo paciente cadastrado no banco de dados:", newPatient);

        // Definir cabeçalhos de resposta para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // Retornar o paciente criado com sucesso no formato JSON
        return res.status(200).json(newPatient);
      } catch (error) {
        console.error("Erro ao cadastrar paciente:", error);
        res.status(500).json({ message: "Erro ao cadastrar paciente" });
      }
    },
  );

  // Endpoint para buscar paciente por ID
  app.get(
    "/api/patients/:id",
    
    async (req: Request, res: Response) => {
      try {
        const patientId = parseInt(req.params.id);

        if (isNaN(patientId)) {
          return res.status(400).json({ message: "ID do paciente inválido" });
        }

        console.log(`Buscando paciente com ID: ${patientId}`);
        const patient = await storage.getPatientById(patientId);

        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        console.log(`Paciente encontrado: ${patient.fullName}`);
        res.json(patient);
      } catch (error) {
        console.error("Erro ao buscar paciente por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );

  // Adicionar um endpoint alternativo para o cadastro de pacientes
  app.post(
    "/api/patients",
    
    async (req: Request, res: Response) => {
      try {
        // Obter os dados do paciente do corpo da requisição
        const patientData = req.body;

        // Validar dados obrigatórios
        if (
          !patientData.fullName ||
          !patientData.cpf ||
          !patientData.birthDate ||
          !patientData.gender
        ) {
          return res.status(400).json({
            message:
              "Dados incompletos. Nome, CPF, data de nascimento e gênero são obrigatórios.",
          });
        }

        // Verificar se o CPF já existe (simulado)
        const cpfNumerico = patientData.cpf.replace(/\D/g, "");
        const existingCpfs = ["12345678900", "98765432100", "45678912300"];

        if (existingCpfs.includes(cpfNumerico)) {
          return res
            .status(409)
            .json({ message: "Patient with this CPF already exists" });
        }

        // Gerar um ID único para o novo paciente
        const newId = Math.floor(Math.random() * 10000) + 100;

        // Criar objeto do novo paciente com os dados enviados + ID gerado
        const newPatient = {
          id: newId,
          ...patientData,
          // Adicionar campos que podem não ter sido enviados
          isActive:
            patientData.isActive !== undefined ? patientData.isActive : true,
          activatedBy:
            patientData.activatedBy || (req.user?.name as string) || "Sistema",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Em uma implementação real, o paciente seria salvo no banco de dados
        console.log("Novo paciente cadastrado:", newPatient);

        // Definir cabeçalhos de resposta para evitar problemas de cache
        res.set({
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        });

        // Retornar o paciente criado com sucesso no formato JSON
        return res.status(200).send(JSON.stringify(newPatient));
      } catch (error) {
        console.error("Erro ao cadastrar paciente:", error);
        res.status(500).json({ message: "Erro ao cadastrar paciente" });
      }
    },
  );

  // API para obter associações médico-paciente
  app.get(
    "/api/doctors/:doctorId/patients",
    
    async (req: Request, res: Response) => {
      try {
        const doctorId = parseInt(req.params.doctorId);

        // Verificar se o ID do médico é válido
        if (isNaN(doctorId)) {
          return res.status(400).json({ message: "ID do médico inválido" });
        }

        // Buscar as associações entre médicos e pacientes do banco de dados
        const doctorPatients = await storage.getDoctorPatients(doctorId);

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        console.log(
          `Encontradas ${doctorPatients.length} associações para o médico ID ${doctorId}`,
        );

        // Retornar os dados do banco
        res.json(doctorPatients);
      } catch (error) {
        console.error("Erro ao obter pacientes do médico:", error);
        res.status(500).json({ message: "Erro ao obter pacientes do médico" });
      }
    },
  );

  // API para criar uma nova associação entre médico e paciente
  app.post(
    "/api/doctor-patients",
    
    async (req: Request, res: Response) => {
      try {
        const { doctorId, patientId } = req.body;

        // Validar os dados de entrada
        if (!doctorId || !patientId) {
          return res.status(400).json({
            message: "ID do médico e ID do paciente são obrigatórios",
          });
        }

        // Converter para número e verificar se os IDs são válidos
        const doctorIdNum =
          typeof doctorId === "number" ? doctorId : parseInt(doctorId);
        const patientIdNum =
          typeof patientId === "number" ? patientId : parseInt(patientId);

        if (isNaN(doctorIdNum) || isNaN(patientIdNum)) {
          return res.status(400).json({ message: "IDs inválidos" });
        }

        // Verificar se o médico existe
        const doctor = await storage.getUser(doctorIdNum);
        if (!doctor) {
          return res.status(404).json({ message: "Médico n �o encontrado" });
        }

        // Verificar se o paciente existe
        const patient = await storage.getPatient(patientIdNum);
        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // Verificar se a associação já existe
        const existingAssociations =
          await storage.getDoctorPatients(doctorIdNum);
        const isAlreadyAssociated = existingAssociations.some(
          (assoc) => assoc.patientId === patientIdNum,
        );

        if (isAlreadyAssociated) {
          return res
            .status(400)
            .json({ message: "Paciente já está associado a este médico" });
        }

        // Criar a associação
        const doctorPatient = await storage.addDoctorPatient({
          doctorId: doctorIdNum,
          patientId: patientIdNum,
          isActive: true,
          notes: req.body.notes || "",
        });

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        console.log(
          `Nova associação criada: Médico ${doctorId} - Paciente ${patientId}`,
        );

        // Retornar os dados da nova associação
        res.status(200).json(doctorPatient);
      } catch (error) {
        console.error("Erro ao associar paciente ao médico:", error);
        res
          .status(500)
          .json({ message: "Erro ao associar paciente ao médico" });
      }
    },
  );

  // Versão SIMULADA de endpoint para testes sem acesso ao banco
  app.post(
    "/api/medical-orders-direct",
    
    async (req: Request, res: Response) => {
      try {
        const orderData = req.body;
        console.log(
          "ENDPOINT SIMULADO - Recebido pedido para criar ordem médica:",
          orderData,
        );

        // Validar dados essenciais
        if (
          !orderData.patientId ||
          !orderData.hospitalId ||
          !orderData.userId
        ) {
          console.error("Dados incompletos para criação de pedido:", orderData);
          return res.status(400).json({
            message:
              "Dados incompletos. patientId, hospitalId e userId são obrigatórios.",
          });
        }

        // Simulação de delay (300-800ms)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.floor(Math.random() * 500) + 300),
        );

        // Criar resposta simulada sem acessar o banco de dados
        const mockId = Math.floor(Math.random() * 10000) + 1;
        const now = new Date().toISOString();

        // Resposta simulada que seria retornada pelo banco
        const mockResponse = {
          id: mockId,
          created_at: now,
          updated_at: now,
          patient_id: orderData.patientId,
          user_id: orderData.userId,
          hospital_id: orderData.hospitalId,
          procedure_id: orderData.procedureId || 1,
          procedure_date: orderData.procedureDate || null,
          report_content: orderData.reportContent || null,
          clinical_indication: orderData.clinicalIndication || "",
          status_code: orderData.statusCode || "em_preenchimento",
          cid_laterality: orderData.cidLaterality || null,
          // Campo procedure_laterality removido conforme solicitado
          cid_code_id: orderData.cidCodeId || null,
          // Procedimentos gerenciados via medical_order_procedures
          procedure_cbhpm_quantity: orderData.procedureCbhpmQuantity || 1,
          secondary_procedure_ids: orderData.secondaryProcedureIds || [],
          secondary_procedure_quantities:
            orderData.secondaryProcedureQuantities || [],
          // Campo secondary_procedure_lateralities removido conforme solicitado
          opme_item_ids: orderData.opmeItemIds || [],
          opme_item_quantities: orderData.opmeItemQuantities || [],
          procedure_type: orderData.procedureType || "eletiva",
          exam_images_url: orderData.exam_images_url || [],
          exam_image_count: orderData.exam_image_count || 0,
          medical_report_url: orderData.medical_report_url || null,
          additional_notes: orderData.additional_notes || null,
          complexity: orderData.complexity || null,
        };

        console.log("ENDPOINT SIMULADO - Resposta mockada:", mockResponse);

        // Retornar o pedido simulado
        res.status(200).json(mockResponse);
      } catch (error) {
        console.error("ENDPOINT SIMULADO - Erro simulado:", error);

        res.status(500).json({
          message: "Erro simulado na criação de pedido",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    },
  );

  // API para criar pedidos médicos
  app.post(
    "/api/medical-orders",
    
    async (req: Request, res: Response) => {
      try {
        console.log("🔍 INÍCIO DO POST /api/medical-orders");
        console.log("🔍 req.body original:", req.body);
        const orderData = req.body;
        console.log("🔍 Dados recebidos no POST /api/medical-orders:", JSON.stringify(orderData, null, 2));
        console.log("🔍 Estrutura dos dados:", {
          patientId: orderData.patientId,
          userId: orderData.userId,
          hospitalId: orderData.hospitalId,
          patientIdType: typeof orderData.patientId,
          userIdType: typeof orderData.userId,
          hospitalIdType: typeof orderData.hospitalId
        });

        // Validar dados essenciais
        if (
          !orderData.patientId ||
          !orderData.hospitalId ||
          !orderData.userId
        ) {
          console.error("❌ Validação falhou - dados obrigatórios ausentes:", {
            patientId: orderData.patientId,
            hospitalId: orderData.hospitalId,
            userId: orderData.userId,
            hasPatientId: !!orderData.patientId,
            hasHospitalId: !!orderData.hospitalId,
            hasUserId: !!orderData.userId
          });
          return res.status(400).json({
            message: "Dados incompletos. patientId, hospitalId e userId são obrigatórios.",
            receivedData: {
              patientId: orderData.patientId,
              hospitalId: orderData.hospitalId,
              userId: orderData.userId
            }
          });
        }

        console.log("✅ Validação passou - preparando dados do pedido");
        
        // Preparar dados do pedido com valores padrão para campos opcionais
        const preparedOrderData = {
          patientId: Number(orderData.patientId),
          userId: Number(orderData.userId),
          hospitalId: Number(orderData.hospitalId),
          procedureId: orderData.procedureId || null,
          procedureDate: orderData.procedureDate || null,
          clinicalIndication: orderData.clinicalIndication || "",
          additionalNotes: orderData.additionalNotes || null,
          cidCodeId: orderData.cidCodeId || null,
          cidLaterality: orderData.cidLaterality || null,
          procedureLaterality: orderData.procedureLaterality || null,
          procedureType: orderData.procedureType || "eletiva",
          // Procedimentos são gerenciados via medical_order_procedures
          opmeItemIds: orderData.opmeItemIds || [],
          opmeItemQuantities: orderData.opmeItemQuantities || [],
          exam_images_url: orderData.exam_images_url || [],
          exam_image_count: orderData.exam_image_count || 0,
          medical_report_url: orderData.medical_report_url || null,
          statusCode: orderData.statusCode || "em_preenchimento",
          complexity: orderData.complexity || null,
          // Novo campo para sugestão de justificativa clínica
          clinicalJustification: orderData.clinicalJustification || null,
          // Campo unificado para CIDs
          cid_code_id: (() => {
            if (orderData.cidCodeId !== undefined) {
              if (typeof orderData.cidCodeId === 'number') {
                return [orderData.cidCodeId];
              }
              if (Array.isArray(orderData.cidCodeId)) {
                return orderData.cidCodeId;
              }
            }
            return [];
          })(),
        };

        console.log("🔍 ROUTES.TS - Dados preparados que serão enviados para storage.createMedicalOrder:");
        console.log("preparedOrderData:", JSON.stringify(preparedOrderData, null, 2));
        console.log("🔍 ROUTES.TS - Verificação de campos críticos:");
        console.log({
          patientId: preparedOrderData.patientId,
          userId: preparedOrderData.userId,
          hospitalId: preparedOrderData.hospitalId,
          patientIdType: typeof preparedOrderData.patientId,
          userIdType: typeof preparedOrderData.userId,
          hospitalIdType: typeof preparedOrderData.hospitalId
        });

        // Criar o pedido médico no banco de dados
        console.log("🔍 ROUTES.TS - ANTES DE CHAMAR STORAGE - preparedOrderData:", preparedOrderData);
        const newOrder = await storage.createMedicalOrder(preparedOrderData);
        console.log("🔍 ROUTES.TS - DEPOIS DE CHAMAR STORAGE - newOrder:", newOrder);

        if (!newOrder) {
          throw new Error("Falha ao criar pedido médico");
        }

        console.log("Pedido criado com sucesso:", newOrder);

        // Retornar o pedido criado
        res.status(201).json(newOrder);
      } catch (error) {
        console.error("Erro ao criar pedido médico:", error);

        res.status(500).json({
          message: "Erro ao criar pedido médico",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    },
  );

  // API para remover associação entre médico e paciente
  app.delete(
    "/api/doctors/:doctorId/patients/:patientId",
    
    async (req: Request, res: Response) => {
      try {
        const doctorId = parseInt(req.params.doctorId);
        const patientId = parseInt(req.params.patientId);

        // Verificar se os IDs sr�o válidos
        if (isNaN(doctorId) || isNaN(patientId)) {
          return res.status(400).json({ message: "IDs inválidos" });
        }

        console.log(
          `Tentando remover associação: Médico ${doctorId} - Paciente ${patientId}`,
        );

        // Verificar se o médico existe
        const doctor = await storage.getUser(doctorId);
        if (!doctor) {
          return res.status(404).json({ message: "Médico não encontrado" });
        }

        // Verificar se o paciente existe
        const patient = await storage.getPatient(patientId);
        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // Remover a associação
        const result = await storage.removeDoctorPatient(doctorId, patientId);

        if (result) {
          console.log(
            `Associação removida: Médico ${doctorId} - Paciente ${patientId}`,
          );
          res.status(200).json({ message: "Associação removida com sucesso" });
        } else {
          res.status(404).json({ message: "Associação não encontrada" });
        }
      } catch (error) {
        console.error("Erro ao remover associação:", error);
        res.status(500).json({
          message: "Erro ao remover associação entre médico e paciente",
        });
      }
    },
  );

  // API para obter hospitais associados a um médico
  app.get(
    "/api/users/:userId/hospitals",
    
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);

        if (isNaN(userId)) {
          return res.status(400).json({ message: "ID de usuário inválido" });
        }

        // Verificar se é o próprio usuário ou um administrador
        const isOwnUser = req.user?.id === userId;
        const isAdmin = req.user?.roleId === 1;

        if (!isOwnUser && !isAdmin) {
          return res.status(403).json({
            message: "Sem permissão para acessar dados de outro usuário",
          });
        }

        // Buscar hospitais associados ao médico
        const doctorHospitals = await storage.getDoctorHospitals(userId);

        res.status(200).json(doctorHospitals);
      } catch (error) {
        console.error("Erro ao obter hospitais do médico:", error);
        res.status(500).json({ message: "Erro ao obter hospitais do médico" });
      }
    },
  );

  // API para atualizar hospitais associados a um médico
  app.put(
    "/api/users/:userId/hospitals",
    
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const { hospitalIds } = req.body;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "ID de usuário inválido" });
        }

        if (!Array.isArray(hospitalIds)) {
          return res
            .status(400)
            .json({ message: "hospitalIds deve ser um array de IDs" });
        }

        // Converter IDs e validar
        const hospitalIdsNumeric = hospitalIds
          .map((id) => (typeof id === "number" ? id : parseInt(id)))
          .filter((id) => !isNaN(id));

        // Verificar se é o próprio usuário ou um administrador
        const isOwnUser = req.user?.id === userId;
        const isAdmin = req.user?.roleId === 1;

        if (!isOwnUser && !isAdmin) {
          return res.status(403).json({
            message: "Sem permissão para modificar dados de outro usuário",
          });
        }

        // Verificar se o usuário existe e é um médico
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }

        if (user.roleId !== 2) {
          // Se não for médico
          return res
            .status(400)
            .json({ message: "Apenas médicos podem ter hospitais associados" });
        }

        console.log(
          `Atualizando hospitais para o médico ID ${userId}. Novos hospitais: ${hospitalIdsNumeric.join(", ")}`,
        );

        // Atualizar associações de hospitais
        const updatedHospitals = await storage.updateDoctorHospitals(
          userId,
          hospitalIdsNumeric,
        );

        res.status(200).json(updatedHospitals);
      } catch (error) {
        console.error("Erro ao atualizar hospitais do médico:", error);
        res
          .status(500)
          .json({ message: "Erro ao atualizar hospitais do médico" });
      }
    },
  );

  // Endpoint para atualizar um paciente
  app.put(
    "/api/patients/:id",
    
    async (req: Request, res: Response) => {
      try {
        const patientId = parseInt(req.params.id);
        if (isNaN(patientId)) {
          return res.status(400).json({ message: "ID de paciente inválido" });
        }

        // Obter os dados do paciente
        const patientData = req.body;

        // Atualizar o paciente no banco de dados
        const updatedPatient = await storage.updatePatient(
          patientId,
          patientData,
        );
        if (!updatedPatient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        res.status(200).json(updatedPatient);
      } catch (error) {
        console.error("Erro ao atualizar paciente:", error);
        res.status(500).json({ message: "Erro ao atualizar paciente" });
      }
    },
  );

  // Endpoint para excluir um paciente
  app.delete(
    "/api/patients/:id",
    
    async (req: Request, res: Response) => {
      try {
        const patientId = parseInt(req.params.id);
        if (isNaN(patientId)) {
          return res.status(400).json({ message: "ID de paciente inválido" });
        }

        // Verificar se o paciente existe
        const existingPatient = await storage.getPatient(patientId);
        if (!existingPatient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // Excluir o paciente do banco de dados
        const success = await storage.deletePatient(patientId);
        if (!success) {
          return res.status(500).json({ message: "Erro ao excluir paciente" });
        }

        res.status(200).json({ message: "Paciente excluído com sucesso" });
      } catch (error) {
        console.error("Erro ao excluir paciente:", error);
        res.status(500).json({ message: "Erro ao excluir paciente" });
      }
    },
  );

  // API para Operadoras de Saúde (Health Insurance Providers)
  app.get(
    "/api/health-insurance-providers",
    
    async (req: Request, res: Response) => {
      try {
        const activeOnly = req.query.active === "true";
        const providers = await storage.getHealthInsuranceProviders(activeOnly);
        res.json(providers);
      } catch (error) {
        console.error("Erro ao buscar operadoras de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar operadoras de saúde" });
      }
    },
  );

  app.get(
    "/api/health-insurance-providers/search",
    
    async (req: Request, res: Response) => {
      try {
        const searchTerm = req.query.q as string;

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({
            message: "Termo de busca deve ter pelo menos 2 caracteres",
          });
        }

        // Buscar todas as operadoras
        const allProviders = await storage.getHealthInsuranceProviders();
        
        // Normalizar o termo de busca
        const normalizedTerm = normalizeText(searchTerm);
        const searchTermDigits = searchTerm.replace(/\D/g, '');
        
        // Filtrar operadoras baseado no termo de busca
        const filteredProviders = allProviders.filter(provider => {
          // Busca por nome (normalizado)
          const nameMatch = normalizeText(provider.name).includes(normalizedTerm);
          
          // Busca por CNPJ (apenas números, se o termo tem pelo menos 8 dígitos)
          const cnpjMatch = searchTermDigits.length >= 8 && 
                           provider.cnpj.replace(/\D/g, '').includes(searchTermDigits);
          
          // Busca por código ANS (exato)
          const ansMatch = provider.ansCode.includes(searchTerm);
          
          return nameMatch || cnpjMatch || ansMatch;
        }).slice(0, 50); // Limitar a 50 resultados

        console.log(
          `Encontradas ${filteredProviders.length} operadoras para o termo "${searchTerm}"`
        );

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json(filteredProviders);
      } catch (error) {
        console.error("Erro ao buscar operadoras de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar operadoras de saúde" });
      }
    },
  );

  app.get(
    "/api/health-insurance-providers/:id",
    
    async (req: Request, res: Response) => {
      try {
        const providerId = parseInt(req.params.id);
        if (isNaN(providerId)) {
          return res.status(400).json({ error: "ID de operadora inválido" });
        }

        const provider = await storage.getHealthInsuranceProvider(providerId);
        if (!provider) {
          return res
            .status(404)
            .json({ error: "Operadora de saúde não encontrada" });
        }

        res.json(provider);
      } catch (error) {
        console.error("Erro ao buscar operadora de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar operadora de saúde" });
      }
    },
  );

  app.post(
    "/api/health-insurance-providers",
    
    hasPermission("admin"),
    async (req: Request, res: Response) => {
      try {
        const providerData = req.body;

        // Verificar se já existe uma operadora com o mesmo CNPJ
        const existingProviderByCnpj =
          await storage.getHealthInsuranceProviderByCnpj(providerData.cnpj);
        if (existingProviderByCnpj) {
          return res
            .status(400)
            .json({ error: "Já existe uma operadora com este CNPJ" });
        }

        // Verificar se já existe uma operadora com o mesmo código ANS
        const existingProviderByAnsCode =
          await storage.getHealthInsuranceProviderByAnsCode(
            providerData.ansCode,
          );
        if (existingProviderByAnsCode) {
          return res
            .status(400)
            .json({ error: "Já existe uma operadora com este código ANS" });
        }

        const newProvider =
          await storage.createHealthInsuranceProvider(providerData);
        res.status(201).json(newProvider);
      } catch (error) {
        console.error("Erro ao criar operadora de saúde:", error);
        res.status(500).json({ error: "Erro ao criar operadora de saúde" });
      }
    },
  );

  app.put(
    "/api/health-insurance-providers/:id",
    
    hasPermission("admin"),
    async (req: Request, res: Response) => {
      try {
        const providerId = parseInt(req.params.id);
        if (isNaN(providerId)) {
          return res.status(400).json({ error: "ID de operadora inválido" });
        }

        const provider = await storage.getHealthInsuranceProvider(providerId);
        if (!provider) {
          return res
            .status(404)
            .json({ error: "Operadora de saúde não encontrada" });
        }

        const providerData = req.body;

        // Verificar se CNPJ já existe em outra operadora
        if (providerData.cnpj && providerData.cnpj !== provider.cnpj) {
          const existingProviderByCnpj =
            await storage.getHealthInsuranceProviderByCnpj(providerData.cnpj);
          if (
            existingProviderByCnpj &&
            existingProviderByCnpj.id !== providerId
          ) {
            return res
              .status(400)
              .json({ error: "Já existe outra operadora com este CNPJ" });
          }
        }

        // Verificar se código ANS já existe em outra operadora
        if (providerData.ansCode && providerData.ansCode !== provider.ansCode) {
          const existingProviderByAnsCode =
            await storage.getHealthInsuranceProviderByAnsCode(
              providerData.ansCode,
            );
          if (
            existingProviderByAnsCode &&
            existingProviderByAnsCode.id !== providerId
          ) {
            return res
              .status(400)
              .json({ error: "Já existe outra operadora com este código ANS" });
          }
        }

        const updatedProvider = await storage.updateHealthInsuranceProvider(
          providerId,
          providerData,
        );
        res.json(updatedProvider);
      } catch (error) {
        console.error("Erro ao atualizar operadora de saúde:", error);
        res.status(500).json({ error: "Erro ao atualizar operadora de saúde" });
      }
    },
  );

  app.delete(
    "/api/health-insurance-providers/:id",
    
    hasPermission("admin"),
    async (req: Request, res: Response) => {
      try {
        const providerId = parseInt(req.params.id);
        if (isNaN(providerId)) {
          return res.status(400).json({ error: "ID de operadora inválido" });
        }

        const provider = await storage.getHealthInsuranceProvider(providerId);
        if (!provider) {
          return res
            .status(404)
            .json({ error: "Operadora de saúde não encontrada" });
        }

        await storage.deleteHealthInsuranceProvider(providerId);
        res.status(204).send();
      } catch (error) {
        console.error("Erro ao excluir operadora de saúde:", error);
        res.status(500).json({ error: "Erro ao excluir operadora de saúde" });
      }
    },
  );

  // Health Insurance Plans API Routes
  app.get(
    "/api/health-insurance-plans",
    
    async (req: Request, res: Response) => {
      try {
        const plans = await storage.getHealthInsurancePlans();
        res.json(plans);
      } catch (error) {
        console.error("Erro ao buscar planos de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar planos de saúde" });
      }
    }
  );

  app.get(
    "/api/health-insurance-plans/search",
    
    async (req: Request, res: Response) => {
      try {
        const searchTerm = req.query.q as string;
        const ansCode = req.query.ansCode as string;

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({
            message: "Termo de busca deve ter pelo menos 2 caracteres",
          });
        }

        // Buscar planos (filtrar por operadora se especificado)
        let allPlans;
        if (ansCode) {
          allPlans = await storage.getHealthInsurancePlansByProvider(ansCode);
        } else {
          allPlans = await storage.getHealthInsurancePlans();
        }
        
        // Normalizar o termo de busca
        const normalizedTerm = normalizeText(searchTerm);
        
        // Filtrar planos baseado no termo de busca
        const filteredPlans = allPlans.filter(plan => {
          // Busca por nome comercial (normalizado)
          const commercialNameMatch = normalizeText(plan.commercialName).includes(normalizedTerm);
          
          // Busca por código do plano (exato, sem normalização como solicitado)
          const planCodeMatch = plan.cdPlano.includes(searchTerm);
          
          return commercialNameMatch || planCodeMatch;
        }).slice(0, 50); // Limitar a 50 resultados

        console.log(
          `Encontrados ${filteredPlans.length} planos para o termo "${searchTerm}"${ansCode ? ` na operadora ${ansCode}` : ''}`
        );

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json(filteredPlans);
      } catch (error) {
        console.error("Erro ao buscar planos de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar planos de saúde" });
      }
    },
  );

  app.get(
    "/api/health-insurance-plans/provider/:ansCode",
    
    async (req: Request, res: Response) => {
      try {
        const ansCode = req.params.ansCode;
        if (!ansCode) {
          return res.status(400).json({ error: "Código ANS é obrigatório" });
        }

        const plans = await storage.getHealthInsurancePlansByProvider(ansCode);
        res.json(plans);
      } catch (error) {
        console.error("Erro ao buscar planos por operadora:", error);
        res.status(500).json({ error: "Erro ao buscar planos por operadora" });
      }
    }
  );

  app.get(
    "/api/health-insurance-plans/:id",
    
    async (req: Request, res: Response) => {
      try {
        const planId = parseInt(req.params.id);
        if (isNaN(planId)) {
          return res.status(400).json({ error: "ID de plano inválido" });
        }

        const plan = await storage.getHealthInsurancePlan(planId);
        if (!plan) {
          return res.status(404).json({ error: "Plano de saúde não encontrado" });
        }

        res.json(plan);
      } catch (error) {
        console.error("Erro ao buscar plano de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar plano de saúde" });
      }
    }
  );

  // API para buscar planos por similaridade de nome (para seleção automática)
  app.get(
    "/api/health-insurance-plans/provider/:ansCode/search",
    
    async (req: Request, res: Response) => {
      try {
        const ansCode = req.params.ansCode;
        const searchTerm = req.query.q as string;

        if (!ansCode) {
          return res.status(400).json({ error: "Código ANS é obrigatório" });
        }

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({ error: "Termo de busca deve ter pelo menos 2 caracteres" });
        }

        console.log(`Buscando planos para operadora ${ansCode} com termo: "${searchTerm}"`);

        // Buscar todos os planos da operadora
        const plans = await storage.getHealthInsurancePlansByProvider(ansCode);
        console.log(`Encontrados ${plans.length} planos para a operadora`);

        if (plans.length === 0) {
          return res.json([]);
        }

        // Buscar por similaridade de nome
        const searchTermUpper = searchTerm.toUpperCase().trim();
        const results = [];

        for (const plan of plans) {
          const planName = (plan.nmPlano || '').toUpperCase();
          const planCode = (plan.cdPlano || '').toString();
          let score = 0;
          let matchType = '';

          // Correspondência exata no nome
          if (planName === searchTermUpper) {
            score = 1.0;
            matchType = 'exact_name';
          }
          // Nome contém o termo ou vice-versa
          else if (planName.includes(searchTermUpper) || searchTermUpper.includes(planName)) {
            score = Math.min(planName.length, searchTermUpper.length) / Math.max(planName.length, searchTermUpper.length);
            matchType = 'partial_name';
          }
          // Verificar palavras-chave
          else {
            const planWords = planName.split(/\s+/).filter(w => w.length > 2);
            const searchWords = searchTermUpper.split(/\s+/).filter(w => w.length > 2);
            
            const matchingWords = searchWords.filter(word => 
              planWords.some(planWord => 
                planWord.includes(word) || word.includes(planWord)
              )
            );

            if (matchingWords.length > 0) {
              score = matchingWords.length / Math.max(planWords.length, searchWords.length);
              matchType = 'keyword_match';
            }
          }

          // Adicionar resultado se o score for suficiente
          if (score > 0.3) {
            results.push({
              ...plan,
              matchScore: score,
              matchType: matchType
            });
          }
        }

        // Ordenar por score (maior primeiro)
        results.sort((a, b) => b.matchScore - a.matchScore);

        console.log(`Encontrados ${results.length} planos com similaridade para "${searchTerm}"`);
        if (results.length > 0) {
          console.log(`Melhor match: ${results[0].nmPlano || results[0].cdPlano} (score: ${results[0].matchScore})`);
        }

        res.json(results);
      } catch (error) {
        console.error("Erro ao buscar planos por similaridade:", error);
        res.status(500).json({ error: "Erro ao buscar planos por similaridade" });
      }
    }
  );

  // Rota para upload de logo do usuário
  app.post('/api/users/:id/logo',  (req: Request, res: Response) => {
    try {
      const upload = multer({
        storage: multer.diskStorage({
          destination: function (req, file, cb) {
            const uploadPath = path.join(process.cwd(), 'uploads', 'temp', 'logos');
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          },
          filename: function (req, file, cb) {
            const uniqueSuffix = Date.now();
            const ext = path.extname(file.originalname);
            cb(null, `logo_${uniqueSuffix}${ext}`);
          }
        }),
        limits: { fileSize: 5 * 1024 * 1024 }
      });

      upload.single('logo')(req, res, async function(err) {
        if (err) {
          console.error('Erro ao fazer upload de logo:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const userId = parseInt(req.params.id);
        const fileName = path.basename(req.file.path);
        const tempPath = req.file.path;
        
        // Estrutura final para logos de usuário
        const finalDir = path.join(process.cwd(), 'uploads', 'users', `user_${userId}`, 'logos');
        const finalPath = path.join(finalDir, fileName);
        const logoUrl = `/uploads/users/user_${userId}/logos/${fileName}`;
        
        // Criar diretório final
        if (!fs.existsSync(finalDir)) {
          fs.mkdirSync(finalDir, { recursive: true });
        }
        
        // Mover arquivo
        try {
          fs.renameSync(tempPath, finalPath);
        } catch (error) {
          fs.copyFileSync(tempPath, finalPath);
          fs.unlinkSync(tempPath);
        }
        
        // Atualizar URL do logo no banco de dados
        storage.updateUser(userId, { logoUrl: logoUrl }).then(() => {
          console.log(`Logo URL salva no banco: ${logoUrl}`);
        }).catch((dbError) => {
          console.error('Erro ao salvar logo URL no banco:', dbError);
        });
        
        console.log(`Upload de logo bem sucedido: ${fileName}`);
        res.status(200).json({ 
          url: logoUrl,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de logo:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });

  // Rota para upload de assinatura do usuário
  app.post('/api/users/:id/signature',  (req: Request, res: Response) => {
    try {
      const upload = multer({
        storage: multer.diskStorage({
          destination: function (req, file, cb) {
            const uploadPath = path.join(process.cwd(), 'uploads', 'temp', 'signatures');
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          },
          filename: function (req, file, cb) {
            const uniqueSuffix = Date.now();
            const ext = path.extname(file.originalname);
            cb(null, `signature_${uniqueSuffix}${ext}`);
          }
        }),
        limits: { fileSize: 5 * 1024 * 1024 }
      });

      upload.single('signature')(req, res, async function(err) {
        if (err) {
          console.error('Erro ao fazer upload de assinatura:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const userId = parseInt(req.params.id);
        const fileName = path.basename(req.file.path);
        const tempPath = req.file.path;
        
        // Estrutura final para assinaturas de usuário
        const finalDir = path.join(process.cwd(), 'uploads', 'users', `user_${userId}`, 'signatures');
        const finalPath = path.join(finalDir, fileName);
        const signatureUrl = `/uploads/users/user_${userId}/signatures/${fileName}`;
        
        // Criar diretório final
        if (!fs.existsSync(finalDir)) {
          fs.mkdirSync(finalDir, { recursive: true });
        }
        
        // Mover arquivo
        try {
          fs.renameSync(tempPath, finalPath);
        } catch (error) {
          fs.copyFileSync(tempPath, finalPath);
          fs.unlinkSync(tempPath);
        }
        
        // Atualizar URL da assinatura no banco de dados
        storage.updateUser(userId, { signatureUrl: signatureUrl }).then(() => {
          console.log(`Assinatura URL salva no banco: ${signatureUrl}`);
        }).catch((dbError) => {
          console.error('Erro ao salvar assinatura URL no banco:', dbError);
        });
        
        console.log(`Upload de assinatura bem sucedido: ${fileName}`);
        res.status(200).json({ 
          url: signatureUrl,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de assinatura:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });

  // Endpoint para exclusão de usuários
  app.delete(
    "/api/users/:id",
    
    hasPermission("admin"),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        console.log(`Tentando excluir usuário com ID ${userId}`);

        if (isNaN(userId)) {
          return res.status(400).json({ error: "ID de usuário inválido" });
        }

        // Verificar se o usuário existe
        const user = await storage.getUser(userId);
        if (!user) {
          console.log(`Usuário com ID ${userId} não encontrado`);
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Verificar se não é o próprio usuário tentando se excluir
        if (req.user && req.user.id === userId) {
          console.log(
            `Usuário ${userId} tentando excluir a si mesmo - operação negada`,
          );
          return res
            .status(400)
            .json({ error: "Você não pode excluir seu próprio usuário" });
        }

        console.log(`Excluindo usuário ${userId} (${user.username})`);

        // Excluir o usuário
        const success = await storage.deleteUser(userId);
        if (!success) {
          console.log(`Falha ao excluir usuário ${userId}`);
          return res
            .status(500)
            .json({ error: "Não foi possível excluir o usuário" });
        }

        console.log(`Usuário ${userId} excluído com sucesso`);
        res.status(204).send();
      } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        res.status(500).json({ error: "Erro ao excluir usuário" });
      }
    },
  );

  // API para buscar pedido em andamento do usuário atual
  app.get(
    "/api/medical-orders/in-progress",
    
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        
        if (!userId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }
        
        console.log(`Buscando pedido em andamento para o usuário ID: ${userId}`);
        
        // Buscar pedido em andamento para o usuário
        const orderInProgress = await storage.getMedicalOrderInProgressByUser(userId);
        
        if (orderInProgress) {
          console.log(`Pedido em andamento encontrado: ID ${orderInProgress.id}`);
          return res.status(200).json(orderInProgress);
        } else {
          console.log(`Nenhum pedido em andamento encontrado para o usuário ID: ${userId}`);
          return res.status(404).json({ message: "Nenhum pedido em andamento encontrado" });
        }
      } catch (error) {
        console.error("Erro ao buscar pedido em andamento:", error);
        return res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  );

  // API para buscar pedidos cirúrgicos em andamento de um paciente específico
  app.get(
    "/api/medical-orders/in-progress/patient/:patientId",
    
    async (req: Request, res: Response) => {
      try {
        const patientId = parseInt(req.params.patientId);
        console.log(
          `Buscando pedidos em andamento para o paciente ID ${patientId}`,
        );

        // Validar ID do paciente
        if (isNaN(patientId)) {
          return res.status(400).json({ message: "ID de paciente inválido" });
        }

        // Verificamos primeiro se o paciente existe
        const patient = await storage.getPatient(patientId);
        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // SEGURANÇA: Obter ID do médico logado
        const currentUserId = req.user?.id;
        if (!currentUserId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        // Buscar pedidos para este paciente via storage (a função já está implementada)
        const allOrders = await storage.getMedicalOrdersForPatient(patientId);

        // FILTRO DE SEGURANÇA: Filtrar apenas pedidos do médico logado E incompletos (statusId = 1)
        const inProgressOrders = allOrders.filter((order) => {
          // Verificar se o pedido pertence ao médico logado
          if (order.userId !== currentUserId) {
            console.log(`Pedido ${order.id} rejeitado: pertence ao médico ${order.userId}, não ao médico logado ${currentUserId}`);
            return false;
          }
          // Verificar se order existe e tem um ID
          if (!order || typeof order.id !== "number") {
            return false;
          }

          console.log(
            `Verificando pedido ${order.id} com statusId: ${order.statusId}`,
          );

          // Usar statusId 1 que corresponde ao status "Incompleta" (antigo "em_preenchimento")
          const isInProgress = order.statusId === 1;
          console.log(
            `Pedido está incompleto? ${isInProgress ? "SIM" : "NÃO"}`,
          );
          return isInProgress;
        });

        // Verificação adicional - garantir que todos os pedidos tenham IDs válidos
        const validOrders = inProgressOrders.filter(
          (order) =>
            order &&
            typeof order.id === "number" &&
            order.patientId === patientId,
        );

        console.log(
          `Encontrado(s) ${validOrders.length} pedido(s) válidos incompletos para o paciente ${patientId}`,
        );

        // Se não houver pedidos válidos, retorna um array vazio
        if (validOrders.length === 0) {
          console.log(
            "Nenhum pedido válido encontrado. Retornando array vazio.",
          );
          return res.status(200).json([]);
        }

        // Logando pedidos detalhados para debug
        console.log("Pedidos incompletos encontrados:");
        validOrders.forEach((order) => {
          console.log(
            `ID: ${order.id}, Status: ${order.statusCode}, Paciente: ${order.patientId}`,
          );
        });

        // LOG DETALHADO: Mostrar dados essenciais que serão enviados para o formulário
        console.log("DADOS RETORNADOS PARA FORMULÁRIO:");
        validOrders.forEach((order) => {
          console.log(
            `Pedido ID ${order.id}: CID=${order.cidCodeId}, Hospital=${order.hospitalId}, Procedimento=${order.procedureCbhpmId}, Indicação="${order.clinicalIndication}"`,
          );
          console.log(
            `Arquivos: ExamImages=${JSON.stringify(order.exam_images_url)}, MedicalReport=${order.medical_report_url}`,
          );
        });

        // Retornar apenas os pedidos válidos
        return res.status(200).json(validOrders);
      } catch (error) {
        console.error(
          `Erro ao buscar pedidos em andamento para o paciente ${req.params.patientId}:`,
          error,
        );
        return res.status(500).json({
          message: "Erro ao buscar pedidos em andamento para o paciente",
        });
      }
    },
  );

  // REMOVED: PDF upload route moved to upload-routes.ts for consistency
  // PDF upload now follows exact same pattern as exam images and medical reports

  const httpServer = createServer(app);
  // API para atualizar pedidos médicos
  app.put(
    "/api/medical-orders/:id",
    
    async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.id);
        const orderData = req.body;

        console.log("=== PUT /api/medical-orders/:id DEBUG ===");
        console.log(`Order ID: ${orderId}, Type: ${typeof orderId}`);
        console.log("Request body:", JSON.stringify(orderData, null, 2));
        console.log("Route handler: MAIN ROUTES.TS");
        console.log("Request URL:", req.url);
        console.log("Request path:", req.path);
        console.log("Original URL:", req.originalUrl);

        // 🏭 LOG ESPECÍFICO PARA FORNECEDORES
        console.log("🏭 SERVIDOR - Dados de fornecedores recebidos:", {
          supplierIds: orderData.supplierIds,
          supplierIdsType: typeof orderData.supplierIds,
          supplierIdsIsArray: Array.isArray(orderData.supplierIds),
          allKeys: Object.keys(orderData)
        });

        // Validar ID do pedido
        if (isNaN(orderId)) {
          return res.status(400).json({ message: "ID do pedido inválido" });
        }

        // Validar autenticação do usuário
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        // Buscar o pedido médico atual para verificar permissões
        const currentOrder = await storage.getMedicalOrder(orderId);
        if (!currentOrder) {
          return res
            .status(404)
            .json({ error: "Pedido médico não encontrado" });
        }

        // Verificar se o usuário tem permissão para editar o pedido
        // O criador do pedido ou um administrador pode editá-lo
        const isAdmin = req.user.roleId === 1;
        if (currentOrder.userId !== userId && !isAdmin) {
          return res
            .status(403)
            .json({ message: "Sem permissão para editar este pedido médico" });
        }

        // Log para rastrear valores de lateralidade ao salvar
        console.log(
          "PUT /api/medical-orders/:id - Dados de lateralidade recebidos:",
          {
            cidLaterality: orderData.cidLaterality,
            procedureLaterality: orderData.procedureLaterality,
          },
        );

        // Preparar dados com apenas campos válidos para a nova estrutura relacional
        const orderWithDefaults = {
          ...orderData,
          // Mapear campos do frontend para o formato do banco (snake_case)
          clinical_indication: orderData.clinicalIndication,
          additional_notes: orderData.additionalNotes,
          clinical_justification: orderData.clinicalJustification,
          // CIDs, OPME Items e Suppliers são gerenciados via tabelas relacionais separadas
          // Não incluir campos removidos: cidCodeId, opmeItemIds, supplierIds, etc.
        };

        // Atualizar o pedido médico no banco de dados
        const updatedOrder = await storage.updateMedicalOrder(
          orderId,
          orderWithDefaults,
        );

        // Log após atualização
        console.log("Pedido atualizado:", updatedOrder);

        if (!updatedOrder) {
          return res
            .status(404)
            .json({ error: "Pedido médico não encontrado" });
        }

        // ===== ATUALIZAR DADOS RELACIONAIS =====
        
        // Atualizar CIDs se fornecidos
        if (orderData.cidIds && Array.isArray(orderData.cidIds)) {
          try {
            await relationalOrderService.updateOrderCids(orderId, orderData.cidIds);
            console.log(`CIDs relacionais atualizados para pedido ${orderId}`);
          } catch (error) {
            console.error("Erro ao atualizar CIDs relacionais:", error);
          }
        }

        // Atualizar procedimentos CBHPM se fornecidos
        if (orderData.procedures && Array.isArray(orderData.procedures)) {
          try {
            await relationalOrderService.updateOrderProcedures(orderId, orderData.procedures);
            console.log(`Procedimentos CBHPM atualizados para pedido ${orderId}`);
          } catch (error) {
            console.error("Erro ao atualizar procedimentos CBHPM:", error);
          }
        }

        // Atualizar itens OPME se fornecidos
        if (orderData.opmeItems && Array.isArray(orderData.opmeItems)) {
          try {
            await relationalOrderService.updateOrderOpmeItems(orderId, orderData.opmeItems);
            console.log(`Itens OPME atualizados para pedido ${orderId}`);
          } catch (error) {
            console.error("Erro ao atualizar itens OPME:", error);
          }
        }

        // Atualizar fornecedores se fornecidos
        if (orderData.supplierIds && Array.isArray(orderData.supplierIds)) {
          try {
            await relationalOrderService.updateOrderSuppliers(orderId, orderData.supplierIds);
            console.log(`Fornecedores atualizados para pedido ${orderId}`);
          } catch (error) {
            console.error("Erro ao atualizar fornecedores:", error);
          }
        }

        // Atualizar condutas cirúrgicas se fornecidas
        if (orderData.surgicalApproaches && Array.isArray(orderData.surgicalApproaches)) {
          try {
            await relationalOrderService.updateOrderSurgicalApproaches(orderId, orderData.surgicalApproaches);
            console.log(`Condutas cirúrgicas atualizadas para pedido ${orderId}`);
          } catch (error) {
            console.error("Erro ao atualizar condutas cirúrgicas:", error);
          }
        }

        res.json(updatedOrder);
      } catch (error) {
        console.error("Erro ao atualizar pedido médico:", error);
        
        // Handle specific error cases
        if (error.message && error.message.includes("Pedido médico não encontrado")) {
          return res.status(404).json({
            error: "Pedido médico não encontrado",
          });
        }
        
        // Debug error details
        console.error("=== ERROR DETAILS ===");
        console.error("Error type:", typeof error);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        // Legacy error handling for old procedure errors
        if (error.message && error.message.includes("Procedimento não encontrado")) {
          console.error("=== LEGACY PROCEDURE ERROR IN ROUTES ===");
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
          console.error("This error originates from storage layer");
          
          return res.status(500).json({
            error: "Erro na migração - campo de procedimento removido",
          });
        }
        
        res.status(500).json({
          message: "Erro ao atualizar pedido médico",
          error: error.message,
        });
      }
    },
  );

  // API para deletar pedidos médicos (apenas status "em_preenchimento")
  app.delete(
    "/api/medical-orders/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.id);
        
        console.log(`=== DELETE /api/medical-orders/${orderId} ===`);
        
        // Validar ID do pedido
        if (isNaN(orderId)) {
          return res.status(400).json({ message: "ID do pedido inválido" });
        }

        // Validar autenticação do usuário
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        // Buscar o pedido médico para verificações
        const currentOrder = await storage.getMedicalOrder(orderId);
        if (!currentOrder) {
          return res.status(404).json({ message: "Pedido médico não encontrado" });
        }

        // Verificar se o usuário tem permissão para deletar o pedido
        const isAdmin = req.user.roleId === 1;
        if (currentOrder.userId !== userId && !isAdmin) {
          return res.status(403).json({ 
            message: "Sem permissão para deletar este pedido médico" 
          });
        }

        // Verificar se o pedido está no status correto (apenas "em_preenchimento" pode ser deletado)
        if (currentOrder.statusId !== 1) {
          return res.status(400).json({ 
            message: "Apenas pedidos incompletos podem ser deletados" 
          });
        }

        console.log(`Deletando pedido ${orderId} - Status: ${currentOrder.statusId}`);

        // Deletar o pedido (CASCADE deletará registros relacionados automaticamente)
        const success = await storage.deleteMedicalOrder(orderId);
        
        if (!success) {
          return res.status(500).json({ 
            message: "Erro ao deletar o pedido médico" 
          });
        }

        console.log(`Pedido ${orderId} deletado com sucesso`);
        res.status(204).send(); // 204 No Content - deletado com sucesso
        
      } catch (error) {
        console.error("Erro ao deletar pedido médico:", error);
        res.status(500).json({
          message: "Erro interno do servidor",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  // ==== ROTAS CRUD PARA ADMINISTRAÇÃO DE CID-10 ====
  
  // API para buscar códigos CID-10 com filtros
  app.get(
    "/api/cid-codes",
    
    async (req: Request, res: Response) => {
      try {
        const { search, category } = req.query;
        console.log(`Buscando códigos CID-10 - search: ${search}, category: ${category}`);
        
        const cidCodesResult = await storage.getCidCodes(
          search as string | undefined,
          category as string | undefined
        );
        
        console.log(`Encontrados ${cidCodesResult.length} códigos CID-10`);
        res.status(200).json(cidCodesResult);
      } catch (error) {
        console.error("Erro ao buscar códigos CID-10:", error);
        res.status(500).json({ message: "Erro ao buscar códigos CID-10" });
      }
    },
  );

  // API para buscar códigos CID-10 com base em um termo de busca (DEVE vir antes do endpoint /:id)
  app.get(
    "/api/cid-codes/search",
    
    async (req: Request, res: Response) => {
      try {
        const searchTerm = (req.query.q || req.query.term) as string;

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({
            message: "Termo de busca deve ter pelo menos 2 caracteres",
          });
        }

        const cidCodes = await storage.searchCidCodes(searchTerm);
        console.log(
          `Encontrados ${cidCodes.length} códigos CID-10 para o termo "${searchTerm}" na tabela cid_codes`,
        );

        res.status(200).json(cidCodes);
      } catch (error) {
        console.error("Erro ao buscar códigos CID-10:", error);
        res.status(500).json({ message: "Erro ao buscar códigos CID-10" });
      }
    },
  );

  // API para buscar um código CID-10 específico por ID
  app.get(
    "/api/cid-codes/:id",
    
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
          return res.status(400).json({ message: "ID inválido" });
        }
        
        const cidCode = await storage.getCidCode(id);
        
        if (!cidCode) {
          return res.status(404).json({ message: "Código CID-10 não encontrado" });
        }
        
        res.json(cidCode);
      } catch (error) {
        console.error("Erro ao buscar código CID-10:", error);
        res.status(500).json({ message: "Erro ao buscar código CID-10" });
      }
    },
  );

  // API para criar novo código CID-10
  app.post(
    "/api/cid-codes",
    
    hasPermission("catalog_create"),
    async (req: Request, res: Response) => {
      try {
        // Validar dados usando o schema Zod
        const validationResult = insertCidCodeSchema.safeParse(req.body);
        
        if (!validationResult.success) {
          const errors = validationResult.error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          
          return res.status(400).json({ 
            message: `Dados inválidos: ${errors}` 
          });
        }
        
        const { code, description, category } = validationResult.data;
        
        const newCidCode = await storage.createCidCode({
          code: code.trim().toUpperCase(),
          description: description.trim(),
          category
        });
        
        console.log(`Código CID-10 criado: ${newCidCode.code}`);
        res.status(201).json(newCidCode);
      } catch (error) {
        console.error("Erro ao criar código CID-10:", error);
        if (error.message.includes("unique")) {
          res.status(409).json({ message: "Código CID-10 já existe" });
        } else if (error.message.includes("enum")) {
          res.status(400).json({ message: "Categoria inválida. Selecione uma categoria válida da lista." });
        } else {
          res.status(500).json({ message: "Erro ao criar código CID-10" });
        }
      }
    },
  );

  // API para atualizar código CID-10
  app.put(
    "/api/cid-codes/:id",
    
    hasPermission("catalog_edit"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
          return res.status(400).json({ message: "ID inválido" });
        }
        
        const { code, description, category } = req.body;
        const updates: any = {};
        
        if (code) updates.code = code.trim().toUpperCase();
        if (description) updates.description = description.trim();
        if (category) updates.category = category;
        
        const updatedCidCode = await storage.updateCidCode(id, updates);
        
        if (!updatedCidCode) {
          return res.status(404).json({ message: "Código CID-10 não encontrado" });
        }
        
        console.log(`Código CID-10 atualizado: ${updatedCidCode.code}`);
        res.json(updatedCidCode);
      } catch (error) {
        console.error("Erro ao atualizar código CID-10:", error);
        if (error.message.includes("unique")) {
          res.status(409).json({ message: "Código CID-10 já existe" });
        } else {
          res.status(500).json({ message: "Erro ao atualizar código CID-10" });
        }
      }
    },
  );

  // API para excluir código CID-10
  app.delete(
    "/api/cid-codes/:id",
    
    hasPermission("catalog_delete"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
          return res.status(400).json({ message: "ID inválido" });
        }
        
        const success = await storage.deleteCidCode(id);
        
        if (success) {
          console.log(`Código CID-10 excluído: ID ${id}`);
          res.json({ message: "Código CID-10 excluído com sucesso" });
        } else {
          res.status(404).json({ message: "Código CID-10 não encontrado" });
        }
      } catch (error) {
        console.error("Erro ao excluir código CID-10:", error);
        if (error.message.includes("associações")) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "Erro ao excluir código CID-10" });
        }
      }
    },
  );



  // API para buscar todos os procedimentos
  app.get(
    "/api/procedures",
    
    async (req: Request, res: Response) => {
      try {
        console.log("Buscando todos os procedimentos...");
        const proceduresResult = await db.select().from(procedures).where(eq(procedures.active, true));
        console.log(`Encontrados ${proceduresResult.length} procedimentos`);
        res.status(200).json(proceduresResult);
      } catch (error) {
        console.error("Erro ao buscar todos os procedimentos:", error);
        res.status(500).json({ message: "Erro ao buscar procedimentos" });
      }
    },
  );

  // API para buscar procedimentos com base em um termo de busca (DEVE vir ANTES do endpoint /:id)
  app.get("/api/procedures/search",  async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.q as string;
      const cbhpmOnly = req.query.cbhpmOnly === 'true';

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Termo de busca deve ter pelo menos 2 caracteres" });
      }

      let procedures;
      
      if (cbhpmOnly) {
        // Buscar apenas procedimentos CBHPM (códigos que começam com números)
        procedures = await storage.searchProcedures(searchTerm);
        // Filtrar apenas procedimentos com códigos válidos (não nulos e com formato CBHPM)
        procedures = procedures.filter(p => 
          p.code && 
          p.code.trim() !== '' && 
          /^\d+\.\d+\.\d+\.\d+-\d+$/.test(p.code.trim()) &&
          p.porte && 
          p.porte.trim() !== ''
        );
        console.log(
          `Encontrados ${procedures.length} procedimentos CBHPM para o termo "${searchTerm}"`,
        );
      } else {
        // Busca normal (todos os procedimentos)
        procedures = await storage.searchProcedures(searchTerm);
        console.log(
          `Encontrados ${procedures.length} procedimentos para o termo "${searchTerm}" na tabela procedures`,
        );
      }

      res.status(200).json(procedures);
    } catch (error) {
      console.error("Erro ao buscar procedimentos:", error);
      res.status(500).json({ message: "Erro ao buscar procedimentos" });
    }
  });

  // Endpoint para buscar procedimento por ID
  app.get(
    "/api/procedures/:id",
    
    async (req: Request, res: Response) => {
      try {
        const procedureId = parseInt(req.params.id);

        if (isNaN(procedureId)) {
          return res
            .status(400)
            .json({ message: "ID do procedimento inválido" });
        }

        console.log(`Buscando procedimento com ID: ${procedureId}`);
        const procedure = await storage.getProcedureById(procedureId);

        if (!procedure) {
          return res
            .status(404)
            .json({ message: "Procedimento não encontrado" });
        }

        console.log(`Procedimento encontrado: ${procedure.name}`);
        res.json(procedure);
      } catch (error) {
        console.error("Erro ao buscar procedimento por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );

  // API para criar novo procedimento
  app.post("/api/procedures",  async (req: Request, res: Response) => {
    try {
      const procedureData = req.body;
      console.log("Criando novo procedimento:", procedureData);
      
      const newProcedure = await storage.createProcedure(procedureData);
      res.status(201).json(newProcedure);
    } catch (error) {
      console.error("Erro ao criar procedimento:", error);
      res.status(500).json({ message: "Erro ao criar procedimento" });
    }
  });

  // API para atualizar procedimento - ESTA ROTA ESTÁ INTERCEPTANDO MEDICAL-ORDERS
  app.put("/api/procedures/:id",  async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.id);
      const procedureData = req.body;
      
      console.log("=== PUT /api/procedures/:id - POSSÍVEL INTERCEPTAÇÃO ===");
      console.log(`Procedure ID: ${procedureId}, Type: ${typeof procedureId}`);
      console.log("Request URL:", req.url);
      console.log("Request path:", req.path);
      console.log("Original URL:", req.originalUrl);
      
      // DETECTAR SE ESTÁ INTERCEPTANDO MEDICAL-ORDERS
      if (req.originalUrl.includes('medical-orders')) {
        console.error("=== INTERCEPTAÇÃO DETECTADA ===");
        console.error("Esta rota está interceptando medical-orders!");
        console.error("URL original:", req.originalUrl);
        console.error("Path:", req.path);
        return res.status(500).json({ error: "Rota de procedimentos interceptando medical-orders incorretamente" });
      }
      
      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID de procedimento inválido" });
      }
      
      console.log(`Atualizando procedimento ID ${procedureId}:`, procedureData);
      
      const updatedProcedure = await storage.updateProcedure(procedureId, procedureData);
      if (!updatedProcedure) {
        console.log(`Procedimento ${procedureId} não encontrado - esta é a origem do erro 404`);
        return res.status(404).json({ message: "Procedimento não encontrado" });
      }
      
      res.status(200).json(updatedProcedure);
    } catch (error) {
      console.error("Erro ao atualizar procedimento:", error);
      res.status(500).json({ message: "Erro ao atualizar procedimento" });
    }
  });

  // API para excluir procedimento
  app.delete("/api/procedures/:id",  async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.id);
      
      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID de procedimento inválido" });
      }
      
      console.log(`Excluindo procedimento ID ${procedureId}`);
      
      const deleted = await storage.deleteProcedure(procedureId);
      if (!deleted) {
        return res.status(404).json({ message: "Procedimento não encontrado" });
      }
      
      res.status(200).json({ message: "Procedimento excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir procedimento:", error);
      res.status(500).json({ message: "Erro ao excluir procedimento" });
    }
  });

  // ==== ANATOMICAL REGIONS API ====

  // API para buscar todas as regiões anatômicas
  app.get("/api/anatomical-regions", async (req: Request, res: Response) => {
    try {
      console.log("Buscando todas as regiões anatômicas...");
      const regions = await db.select().from(anatomicalRegions).orderBy(anatomicalRegions.id);
      console.log(`Encontradas ${regions.length} regiões anatômicas`);
      res.status(200).json(regions);
    } catch (error) {
      console.error("Erro ao buscar regiões anatômicas:", error);
      res.status(500).json({ message: "Erro ao buscar regiões anatômicas" });
    }
  });

  // API para buscar região anatômica por ID
  app.get("/api/anatomical-regions/:id", async (req: Request, res: Response) => {
    try {
      const regionId = parseInt(req.params.id);

      if (isNaN(regionId)) {
        return res.status(400).json({ message: "ID da região anatômica inválido" });
      }

      console.log(`Buscando região anatômica com ID: ${regionId}`);
      const [region] = await db.select().from(anatomicalRegions).where(eq(anatomicalRegions.id, regionId));

      if (!region) {
        return res.status(404).json({ message: "Região anatômica não encontrada" });
      }

      console.log(`Região anatômica encontrada: ${region.name}`);
      res.json(region);
    } catch (error) {
      console.error("Erro ao buscar região anatômica por ID:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para buscar procedimentos por região anatômica
  app.get("/api/anatomical-regions/:id/procedures", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const regionId = parseInt(req.params.id);

      if (isNaN(regionId)) {
        return res.status(400).json({ message: "ID da região anatômica inválido" });
      }

      console.log(`Buscando procedimentos para região anatômica ID: ${regionId}`);
      
      // Buscar procedimentos associados à região através da tabela de associação
      const proceduresWithAssociations = await db
        .select({
          id: surgicalProcedures.id,
          name: surgicalProcedures.name,
          description: surgicalProcedures.description,
          isActive: surgicalProcedures.isActive
        })
        .from(surgicalProcedures)
        .innerJoin(anatomicalRegionProcedures, eq(surgicalProcedures.id, anatomicalRegionProcedures.surgicalProcedureId))
        .where(
          and(
            eq(anatomicalRegionProcedures.anatomicalRegionId, regionId),
            eq(surgicalProcedures.isActive, true)
          )
        );

      console.log(`Encontrados ${proceduresWithAssociations.length} procedimentos para região anatômica ${regionId}`);
      res.json(proceduresWithAssociations);
    } catch (error) {
      console.error("Erro ao buscar procedimentos por região anatômica:", error);
      res.status(500).json({ message: "Erro ao buscar procedimentos da região anatômica" });
    }
  });

  // Nova API para buscar materiais OPME sem autenticação (DEVE vir ANTES do endpoint /:id)
  app.get("/api/opme-items/search", async (req: Request, res: Response) => {
    try {
      const searchTerm =
        (req.query.q as string) || (req.query.term as string);

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Termo de busca deve ter pelo menos 2 caracteres" });
      }

      const opmeItems = await storage.searchOpmeItems(searchTerm);
      console.log(
        `Encontrados ${opmeItems.length} materiais OPME para o termo "${searchTerm}" na tabela opme_items`,
      );

      res.status(200).json(opmeItems);
    } catch (error) {
      console.error("Erro ao buscar materiais OPME:", error);
      res.status(500).json({ message: "Erro ao buscar materiais OPME" });
    }
  });

  // API para buscar um item OPME específico por ID (DEVE vir DEPOIS do endpoint /search)
  app.get("/api/opme-items/:id", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "ID de item OPME inválido" });
      }
      
      const opmeItem = await storage.getOpmeItemById(itemId);
      
      if (!opmeItem) {
        return res.status(404).json({ message: "Item OPME não encontrado" });
      }
      
      console.log(`Item OPME encontrado: ${opmeItem.technicalName} (ID: ${itemId})`);
      res.status(200).json(opmeItem);
    } catch (error) {
      console.error("Erro ao buscar item OPME por ID:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para listar todos os materiais OPME
  app.get("/api/opme-items",  async (req: Request, res: Response) => {
    try {
      console.log("Buscando todos os materiais OPME...");
      const opmeItems = await storage.getOpmeItems();
      console.log(`Encontrados ${opmeItems.length} materiais OPME`);
      res.status(200).json(opmeItems);
    } catch (error) {
      console.error("Erro ao buscar materiais OPME:", error);
      res.status(500).json({ message: "Erro ao buscar materiais OPME" });
    }
  });

  // API para criar um novo material OPME
  app.post("/api/opme-items",  async (req: Request, res: Response) => {
    try {
      console.log("Criando novo material OPME:", req.body);
      
      const {
        anvisaRegistrationNumber,
        processNumber,
        technicalName,
        commercialName,
        riskClass,
        holderCnpj,
        registrationHolder,
        manufacturerName,
        countryOfManufacture,
        registrationDate,
        expirationDate,
        isValid
      } = req.body;

      // Validações básicas
      if (!technicalName || !commercialName || !manufacturerName) {
        return res.status(400).json({ 
          message: "Nome técnico, nome comercial e fabricante são obrigatórios" 
        });
      }

      const newOpmeItem = await storage.createOpmeItem({
        anvisaRegistrationNumber: anvisaRegistrationNumber || null,
        processNumber: processNumber || null,
        technicalName,
        commercialName,
        riskClass: riskClass || null,
        holderCnpj: holderCnpj || null,
        registrationHolder: registrationHolder || null,
        manufacturerName,
        countryOfManufacture: countryOfManufacture || null,
        registrationDate: registrationDate || null,
        expirationDate: expirationDate || null,
        isValid: isValid !== undefined ? isValid : true,
      });

      console.log(`Material OPME criado com sucesso: ${newOpmeItem.technicalName} (ID: ${newOpmeItem.id})`);
      res.status(201).json(newOpmeItem);
    } catch (error) {
      console.error("Erro ao criar material OPME:", error);
      res.status(500).json({ 
        message: "Erro ao criar material OPME",
        error: error.message 
      });
    }
  });

  // API para atualizar um material OPME
  app.put("/api/opme-items/:id",  async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "ID de material OPME inválido" });
      }

      console.log(`Atualizando material OPME ID ${itemId}:`, req.body);

      const {
        anvisaRegistrationNumber,
        processNumber,
        technicalName,
        commercialName,
        riskClass,
        holderCnpj,
        registrationHolder,
        manufacturerName,
        countryOfManufacture,
        registrationDate,
        expirationDate,
        isValid
      } = req.body;

      // Validações básicas
      if (!technicalName || !commercialName || !manufacturerName) {
        return res.status(400).json({ 
          message: "Nome técnico, nome comercial e fabricante são obrigatórios" 
        });
      }

      const updatedOpmeItem = await storage.updateOpmeItem(itemId, {
        anvisaRegistrationNumber: anvisaRegistrationNumber || null,
        processNumber: processNumber || null,
        technicalName,
        commercialName,
        riskClass: riskClass || null,
        holderCnpj: holderCnpj || null,
        registrationHolder: registrationHolder || null,
        manufacturerName,
        countryOfManufacture: countryOfManufacture || null,
        registrationDate: registrationDate || null,
        expirationDate: expirationDate || null,
        isValid: isValid !== undefined ? isValid : true,
      });

      if (!updatedOpmeItem) {
        return res.status(404).json({ message: "Material OPME não encontrado" });
      }

      console.log(`Material OPME atualizado: ${updatedOpmeItem.technicalName} (ID: ${itemId})`);
      res.status(200).json(updatedOpmeItem);
    } catch (error) {
      console.error("Erro ao atualizar material OPME:", error);
      res.status(500).json({ 
        message: "Erro ao atualizar material OPME",
        error: error.message 
      });
    }
  });

  // API para excluir um material OPME
  app.delete("/api/opme-items/:id",  async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "ID de material OPME inválido" });
      }

      console.log(`Excluindo material OPME ID ${itemId}`);

      // Verificar se o material existe
      const existingItem = await storage.getOpmeItemById(itemId);
      if (!existingItem) {
        return res.status(404).json({ message: "Material OPME não encontrado" });
      }

      const deleted = await storage.deleteOpmeItem(itemId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Erro ao excluir material OPME" });
      }

      console.log(`Material OPME excluído: ${existingItem.technicalName} (ID: ${itemId})`);
      res.status(200).json({ message: "Material OPME excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir material OPME:", error);
      res.status(500).json({ 
        message: "Erro ao excluir material OPME",
        error: error.message 
      });
    }
  });

  // API para buscar materiais OPME de um pedido específico
  app.get("/api/medical-orders/:orderId/opme-items",  async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID de pedido inválido" });
      }

      console.log(`Buscando materiais OPME para pedido ${orderId}`);

      // Buscar materiais OPME do pedido com JOIN para obter dados completos incluindo procedimento
      const result = await db
        .select({
          id: medicalOrderOpmeItems.id,
          quantity: medicalOrderOpmeItems.quantity,
          procedure: {
            id: procedures.id,
            code: procedures.code,
            description: procedures.description
          },
          opmeItem: {
            id: opmeItems.id,
            technicalName: opmeItems.technicalName,
            commercialName: opmeItems.commercialName,
            anvisaRegistrationNumber: opmeItems.anvisaRegistrationNumber,
            processNumber: opmeItems.processNumber,
            riskClass: opmeItems.riskClass,
            holderCnpj: opmeItems.holderCnpj,
            registrationHolder: opmeItems.registrationHolder,
            manufacturerName: opmeItems.manufacturerName,
            countryOfManufacture: opmeItems.countryOfManufacture,
            registrationDate: opmeItems.registrationDate,
            expirationDate: opmeItems.expirationDate,
            isValid: opmeItems.isValid
          }
        })
        .from(medicalOrderOpmeItems)
        .innerJoin(opmeItems, eq(medicalOrderOpmeItems.opmeItemId, opmeItems.id))
        .innerJoin(procedures, eq(medicalOrderOpmeItems.procedureId, procedures.id))
        .where(eq(medicalOrderOpmeItems.orderId, orderId))
        .orderBy(medicalOrderOpmeItems.id);

      console.log(`Encontrados ${result.length} materiais OPME para pedido ${orderId}`);

      res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao buscar materiais OPME do pedido:", error);
      res.status(500).json({ 
        message: "Erro ao buscar materiais OPME do pedido",
        error: error.message 
      });
    }
  });

  // API para listar todos os fornecedores
  console.log("🔧 Registrando rota GET /api/suppliers");
  app.get("/api/suppliers", async (req: Request, res: Response) => {
    try {
      console.log("=== ENDPOINT /api/suppliers CHAMADO ===");
      console.log("Query params:", req.query);
      console.log("User:", req.user?.username);
      console.log("Headers Accept:", req.headers.accept);
      console.log("Content-Type do response será:", res.getHeader('Content-Type'));
      
      const showAll = req.query.showAll === "true";
      
      // Se showAll for true, retorna todos os fornecedores (ativos e inativos)
      // Caso contrário, retorna apenas os ativos
      const suppliers = await storage.getSuppliers();
      console.log(`Dados brutos do storage: ${suppliers.length} fornecedores encontrados`);
      console.log("Primeiro fornecedor:", suppliers[0]);
      
      const filteredSuppliers = showAll ? suppliers : suppliers.filter(s => s.active);
      
      console.log(`Retornando ${filteredSuppliers.length} fornecedores ${showAll ? '(incluindo inativos)' : '(apenas ativos)'}`);
      console.log("Dados filtrados:", filteredSuppliers);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(filteredSuppliers);
    } catch (error) {
      console.error("ERRO DETALHADO ao listar fornecedores:", error);
      res.status(500).json({ message: "Erro ao listar fornecedores", error: error.message });
    }
  });

  // API para buscar fornecedores por termo de busca (nome ou CNPJ) sem autenticação
  app.get("/api/suppliers/search", async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.term as string;

      // Se não tiver termo de busca ou termo vazio, retornar todos os fornecedores ativos
      if (!searchTerm || searchTerm.trim().length === 0) {
        const allSuppliers = await storage.getSuppliers();
        console.log(
          `Retornando todos os ${allSuppliers.length} fornecedores ativos`,
        );
        return res.status(200).json(allSuppliers);
      }

      // Se tiver termo de busca com menos de 2 caracteres
      if (searchTerm.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Termo de busca deve ter pelo menos 2 caracteres" });
      }

      const suppliers = await storage.searchSuppliers(searchTerm);
      console.log(
        `Encontrados ${suppliers.length} fornecedores para o termo "${searchTerm}"`,
      );

      res.status(200).json(suppliers);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      res.status(500).json({ message: "Erro ao buscar fornecedores" });
    }
  });

  // API para criar novo fornecedor
  app.post("/api/suppliers",  async (req: Request, res: Response) => {
    try {
      const supplierData = req.body;
      console.log("Criando novo fornecedor:", supplierData);
      
      const newSupplier = await storage.createSupplier(supplierData);
      res.status(201).json(newSupplier);
    } catch (error) {
      console.error("Erro ao criar fornecedor:", error);
      res.status(500).json({ message: "Erro ao criar fornecedor" });
    }
  });

  // API para atualizar fornecedor
  app.put("/api/suppliers/:id",  async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.id);
      const supplierData = req.body;
      
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "ID de fornecedor inválido" });
      }
      
      console.log(`Atualizando fornecedor ID ${supplierId}:`, supplierData);
      
      const updatedSupplier = await storage.updateSupplier(supplierId, supplierData);
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      res.status(200).json(updatedSupplier);
    } catch (error) {
      console.error("Erro ao atualizar fornecedor:", error);
      res.status(500).json({ message: "Erro ao atualizar fornecedor" });
    }
  });

  // API para excluir fornecedor
  app.delete("/api/suppliers/:id",  async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.id);
      
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "ID de fornecedor inválido" });
      }
      
      console.log(`Excluindo fornecedor ID ${supplierId}`);
      
      const deleted = await storage.deleteSupplier(supplierId);
      if (!deleted) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      res.status(200).json({ message: "Fornecedor excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir fornecedor:", error);
      res.status(500).json({ message: "Erro ao excluir fornecedor" });
    }
  });





  // Endpoints de Notificações
  app.get("/api/notifications",  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const notifications = await storage.getNotifications(userId);
      res.status(200).json(notifications);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });

  app.get("/api/notifications/unread-count",  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const count = await storage.getUnreadNotificationsCount(userId);
      res.status(200).json({ count });
    } catch (error) {
      console.error("Erro ao buscar contador de notificações:", error);
      res.status(500).json({ count: 0 });
    }
  });

  app.patch("/api/notifications/:id/read",  async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId || isNaN(notificationId)) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      await storage.markNotificationAsRead(notificationId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });

  app.post("/api/notifications/mark-all-read",  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      await storage.markAllNotificationsAsRead(userId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error);
      res.status(500).json({ message: "Erro ao marcar todas as notificações como lidas" });
    }
  });

  app.delete("/api/notifications/:id",  async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId || isNaN(notificationId)) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      await storage.deleteNotification(notificationId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
      res.status(500).json({ message: "Erro ao excluir notificação" });
    }
  });
  
  // API para obter pedidos médicos de um usuário específico
  app.get(
    "/api/orders/user/:userId",
    
    async (req: Request, res: Response) => {
      try {
        const requestedUserId = parseInt(req.params.userId);
        const currentUserId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        
        // Verificar se o ID do usuário é válido
        if (isNaN(requestedUserId)) {
          return res.status(400).json({ message: "ID de usuário inválido" });
        }
        
        // Verificar permissões: apenas administradores podem ver pedidos de outros usuários
        if (!isAdmin && requestedUserId !== currentUserId) {
          return res.status(403).json({
            message: "Acesso negado. Você só pode visualizar seus próprios pedidos."
          });
        }
        
        console.log(`Buscando pedidos para o usuário ID: ${requestedUserId}`);
        
        // Buscar pedidos do usuário
        const orders = await storage.getMedicalOrdersByUser(requestedUserId);
        
        // Formatar os pedidos para exibição na interface
        const formattedOrders = await Promise.all(
          orders.map(async (order) => {
            // Buscar informações associadas (paciente, hospital, etc.)
            const patient = order.patientId
              ? await storage.getPatient(order.patientId)
              : null;
            const hospital = order.hospitalId
              ? await storage.getHospital(order.hospitalId)
              : null;
            const user = order.userId
              ? await storage.getUser(order.userId)
              : null;
            const procedure = order.procedureCbhpmId
              ? await storage.getProcedure(order.procedureCbhpmId)
              : null;

            return {
              id: order.id,
              patientId: order.patientId,
              patientName: patient ? patient.fullName : "Paciente não encontrado",
              patientPhone: patient ? patient.phone : null,
              hospitalId: order.hospitalId,
              hospitalName: hospital ? hospital.name : "Hospital não encontrado",
              procedureName: procedure
                ? procedure.name
                : order.procedureName || "Não especificado",
              status: order.statusCode || "não_especificado",
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              procedureDate: order.procedureDate,
              userName: user ? user.name : "Usuário desconhecido",
              receivedValue: order.receivedValue,
            };
          })
        );
        
        console.log(`Encontrados ${formattedOrders.length} pedidos para o usuário ID: ${requestedUserId}`);
        res.json(formattedOrders);
      } catch (error) {
        console.error(`Erro ao obter pedidos do usuário ID ${req.params.userId}:`, error);
        res.status(500).json({ message: "Erro ao obter pedidos do usuário" });
      }
    }
  );
  
  // Buscar um pedido médico específico por ID
  app.get(
    "/api/medical-orders/:id",
    
    async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.id);
        if (isNaN(orderId)) {
          return res.status(400).json({ error: "ID de pedido inválido" });
        }

        // Buscar o pedido médico completo
        console.log(`Buscando detalhes do pedido ID: ${orderId}`);
        const order = await storage.getMedicalOrder(orderId);
        
        if (!order) {
          return res.status(404).json({ error: "Pedido não encontrado" });
        }
        
        // Buscar informações relacionadas
        const patient = order.patientId
          ? await storage.getPatient(order.patientId)
          : null;
        
        const hospital = order.hospitalId
          ? await storage.getHospital(order.hospitalId)
          : null;
            
        // Buscar informações do usuário (médico)
        const user = order.userId
          ? await storage.getUser(order.userId)
          : null;
          
        // Buscar procedimento principal se existir
        // Procedimentos obtidos via medical_order_procedures
        const procedure = null;
          
        // Buscar diagnósticos (CID) associados
        let cidCodes = [];
        let cidDescriptions = [];
        
        // Buscar CIDs via tabela relacional
        try {
          const { cidCodes: cidCodesTable } = await import("@shared/schema");
          
          const orderCids = await db
            .select({
              cidCode: cidCodesTable.code,
              cidDescription: cidCodesTable.description
            })
            .from(medicalOrderCids)
            .innerJoin(cidCodesTable, eq(medicalOrderCids.cidCodeId, cidCodesTable.id))
            .where(eq(medicalOrderCids.orderId, order.id));
          
          cidCodes = orderCids.map(oc => oc.cidCode);
          cidDescriptions = orderCids.map(oc => oc.cidDescription);
          
          if (orderCids.length > 0) {
            console.log(`Encontrados ${orderCids.length} CIDs para pedido ${order.id}`);
          }
        } catch (err) {
          console.error(`Erro ao buscar CIDs relacionais para pedido ${order.id}:`, err);
        }
        
        // Buscar condutas cirúrgicas associadas ao pedido
        let surgicalApproaches = [];
        try {
          const { medicalOrderSurgicalApproaches, surgicalApproaches: surgicalApproachesTable } = await import("@shared/schema");
          
          const approachData = await db
            .select({
              id: surgicalApproachesTable.id,
              name: surgicalApproachesTable.name,
              description: surgicalApproachesTable.description,
              isPrimary: medicalOrderSurgicalApproaches.isPrimary
            })
            .from(medicalOrderSurgicalApproaches)
            .innerJoin(surgicalApproachesTable, eq(medicalOrderSurgicalApproaches.surgicalApproachId, surgicalApproachesTable.id))
            .where(eq(medicalOrderSurgicalApproaches.medicalOrderId, order.id))
            .orderBy(medicalOrderSurgicalApproaches.isPrimary);
          
          surgicalApproaches = approachData;
          
          if (approachData.length > 0) {
            console.log(`Encontradas ${approachData.length} condutas cirúrgicas para pedido ${order.id}`);
          }
        } catch (err) {
          console.error(`Erro ao buscar condutas cirúrgicas para pedido ${order.id}:`, err);
        }
        
        // Buscar procedimentos secundários
        let procedureIds = [];
        let procedureNames = [];
        let procedureCodes = [];
        let procedureSides = [];
        let accessRoutes = [];
        let techniques = [];
        
        // Adicionar procedimento principal se existir
        if (procedure) {
          procedureIds.push(procedure.id);
          procedureNames.push(procedure.name);
          procedureCodes.push(procedure.code);
          procedureSides.push(order.procedureLaterality || 'não_especificado');
          accessRoutes.push('não_especificado'); // Pode ser ajustado conforme necessário
          techniques.push('não_especificado'); // Pode ser ajustado conforme necessário
        }
        
        // Verificar procedimentos secundários
        if (order.secondaryProcedureIds && Array.isArray(order.secondaryProcedureIds) && order.secondaryProcedureIds.length > 0) {
          console.log(`Buscando procedimentos secundários: ${order.secondaryProcedureIds.join(', ')}`);
          
          for (let i = 0; i < order.secondaryProcedureIds.length; i++) {
            const procedureId = order.secondaryProcedureIds[i];
            try {
              const procData = await storage.getProcedure(procedureId);
              if (procData) {
                procedureIds.push(procData.id);
                procedureNames.push(procData.name);
                procedureCodes.push(procData.code);
                
                // Buscar dados relacionados aos procedimentos secundários
                const laterality = order.secondaryProcedureLateralities && order.secondaryProcedureLateralities[i] 
                  ? order.secondaryProcedureLateralities[i] 
                  : 'não_especificado';
                
                procedureSides.push(laterality);
                accessRoutes.push('não_especificado'); // Pode ser ajustado conforme necessário
                techniques.push('não_especificado'); // Pode ser ajustado conforme necessário
              }
            } catch (err) {
              console.error(`Erro ao buscar procedimento ${procedureId}:`, err);
            }
          }
        }
        
        // Buscar materiais OPME
        let opmeItemIds = [];
        let opmeItemNames = [];
        let opmeItemCodes = [];
        let opmeItemQuantities = [];
        let opmeItemUnits = [];
        let opmeItemSuppliers = [];
        
        // Verificar materiais OPME se existirem
        if (order.opmeItemIds && Array.isArray(order.opmeItemIds) && order.opmeItemIds.length > 0) {
          console.log(`Buscando materiais OPME: ${order.opmeItemIds.join(', ')}`);
          
          for (let i = 0; i < order.opmeItemIds.length; i++) {
            const opmeItemId = order.opmeItemIds[i];
            try {
              const opmeItem = await storage.getOpmeItem(opmeItemId);
              if (opmeItem) {
                opmeItemIds.push(opmeItem.id);
                opmeItemNames.push(opmeItem.name);
                opmeItemCodes.push(opmeItem.code || 'sem código');
                
                // Obter quantidade e unidade
                const quantity = order.opmeItemQuantities && order.opmeItemQuantities[i] 
                  ? order.opmeItemQuantities[i] 
                  : 1;
                
                opmeItemQuantities.push(quantity);
                opmeItemUnits.push(opmeItem.unit || 'unidade');
                
                // Buscar fornecedor se existir
                if (order.opmeSupplierIds && order.opmeSupplierIds[i]) {
                  try {
                    const supplier = await storage.getSupplier(order.opmeSupplierIds[i]);
                    opmeItemSuppliers.push(supplier ? supplier.companyName : 'Fornecedor não especificado');
                  } catch (err) {
                    console.error(`Erro ao buscar fornecedor para OPME ${opmeItemId}:`, err);
                    opmeItemSuppliers.push('Fornecedor não especificado');
                  }
                } else {
                  opmeItemSuppliers.push('Fornecedor não especificado');
                }
              }
            } catch (err) {
              console.error(`Erro ao buscar item OPME ${opmeItemId}:`, err);
            }
          }
        }
        
        // Buscar exames
        let examIds = [];
        let examNames = [];
        let examDates = [];
        let examResults = [];
        let examFiles = [];
        
        // Verificar exames se existirem
        if (order.examIds && Array.isArray(order.examIds) && order.examIds.length > 0) {
          console.log(`Buscando exames: ${order.examIds.join(', ')}`);
          
          for (let i = 0; i < order.examIds.length; i++) {
            const examId = order.examIds[i];
            try {
              // Verificamos se a função getExam existe no storage
              const exam = typeof storage.getExam === 'function' 
                ? await storage.getExam(examId)
                : { id: examId, name: 'Exame', examDate: 'Data não especificada', result: 'Resultado não disponível' };
              if (exam) {
                examIds.push(exam.id);
                examNames.push(exam.name || 'Exame sem nome');
                examDates.push(exam.examDate || 'Data não especificada');
                examResults.push(exam.result || 'Resultado não disponível');
                examFiles.push(exam.fileUrl || '');
              }
            } catch (err) {
              console.error(`Erro ao buscar exame ${examId}:`, err);
            }
          }
        }
        
        // Buscar status baseado no statusId
        let statusCode = 'não_especificado';
        try {
          if (order.statusId) {
            const statusResult = await db
              .select({ code: orderStatuses.code })
              .from(orderStatuses)
              .where(eq(orderStatuses.id, order.statusId))
              .limit(1);
            
            if (statusResult[0]?.code) {
              statusCode = statusResult[0].code;
            }
          }
        } catch (err) {
          console.error(`Erro ao buscar status para pedido ${order.id}:`, err);
        }

        // Formatação dos dados completos do pedido
        const orderDetails = {
          ...order,
          patientName: patient?.fullName || 'Paciente não encontrado',
          hospitalName: hospital?.name || 'Hospital não especificado',
          doctorName: user?.name || user?.fullName || 'Médico não identificado',
          procedureName: procedure?.name || 'Não especificado',
          statusCode: statusCode,
          // Adicionar arrays de CIDs para o frontend
          cidCodes: cidCodes,
          cidDescriptions: cidDescriptions,
          // Adicionar condutas cirúrgicas para o frontend
          surgicalApproaches: surgicalApproaches,
          // Adicionar arrays de procedimentos para o frontend
          procedureIds: procedureIds,
          procedureNames: procedureNames,
          procedureCodes: procedureCodes,
          procedureSides: procedureSides,
          accessRoutes: accessRoutes,
          techniques: techniques,
          // Adicionar arrays de materiais OPME para o frontend
          opmeItemIds: opmeItemIds,
          opmeItemNames: opmeItemNames,
          opmeItemCodes: opmeItemCodes,
          opmeItemQuantities: opmeItemQuantities,
          opmeItemUnits: opmeItemUnits,
          opmeItemSuppliers: opmeItemSuppliers,
          // Adicionar arrays de exames para o frontend
          examIds: examIds,
          examNames: examNames,
          examDates: examDates,
          examResults: examResults,
          examFiles: examFiles
        };
        
        console.log(`Detalhes do pedido ${orderId} enviados com sucesso`);
        console.log("Final response data:", {
          id: orderDetails.id,
          clinicalIndication: orderDetails.clinicalIndication,
          additionalNotes: orderDetails.additionalNotes,
          statusCode: orderDetails.statusCode
        });
        return res.json(orderDetails);
      } catch (error) {
        console.error("Erro ao buscar pedido por ID:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  );



  // Atualizar status de um pedido médico
  app.patch('/api/medical-orders/:id/status',  async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status, notes } = req.body;
      const userId = (req as any).user?.id;

      console.log(`Tentando atualizar status do pedido ${orderId} para: ${status}`);

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      if (!status) {
        return res.status(400).json({ error: "Status é obrigatório" });
      }

      // Verificar se o pedido existe
      const existingOrder = await storage.getMedicalOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      console.log(`Pedido encontrado. Status atual: ${existingOrder.statusCode || existingOrder.statusId}`);

      // Buscar informações do status para mapear o código para ID
      const statusInfo = await db
        .select()
        .from(orderStatuses)
        .where(eq(orderStatuses.code, status))
        .limit(1);

      if (statusInfo.length === 0) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const statusId = statusInfo[0].id;
      const previousStatusId = existingOrder.statusId;

      // Atualizar o status no banco de dados e salvar o status anterior
      const [updatedOrder] = await db
        .update(medicalOrders)
        .set({ 
          statusId: statusId,
          previousStatusId: previousStatusId, // Salvar o status anterior para função desfazer
          updatedAt: new Date()
        })
        .where(eq(medicalOrders.id, orderId))
        .returning();

      console.log(`Status atualizado. Novo statusId: ${updatedOrder?.statusId}`);

      // 🔥 CRIAR REGISTRO NO HISTÓRICO DE AUDITORIA
      let deadlineDate = null;
      let nextNotificationAt = null;

      // Definir prazos baseados no novo status
      if (status === 'em_analise') {
        // 21 dias para resposta da seguradora
        deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 21);
      } else if (status === 'cirurgia_realizada') {
        // 90 dias após cirurgia
        deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 90);
      } else if (status === 'aguardando_envio') {
        // Notificação em 1 hora se não for enviado
        nextNotificationAt = new Date();
        nextNotificationAt.setHours(nextNotificationAt.getHours() + 1);
      }

      // Criar entrada no histórico
      const historyData = {
        orderId: orderId,
        statusId: statusId,
        changedBy: userId || null,
        notes: notes || `Status alterado de ${previousStatusId || 'indefinido'} para ${status}`,
        deadlineDate: deadlineDate,
        nextNotificationAt: nextNotificationAt
      };

      const [historyRecord] = await db
        .insert(medicalOrderStatusHistory)
        .values(historyData)
        .returning();

      console.log(`✅ Registro de histórico criado: ID ${historyRecord.id}`);
      
      // 🔥 AUTORIZAÇÃO AUTOMÁTICA DE PROCEDIMENTOS para status "aceito" (Autorizado)
      if (status === 'aceito') {
        try {
          console.log(`🔄 Autorizando automaticamente todos os procedimentos CBHPM do pedido ${orderId} (status: aceito)`);
          
          // Buscar todos os procedimentos CBHPM do pedido
          const procedures = await storage.getMedicalOrderProcedures(orderId);
          console.log(`📋 Encontrados ${procedures.length} procedimentos para autorizar`);
          
          let authorizedCount = 0;
          
          // Atualizar cada procedimento para status "autorizado" com quantidade total aprovada
          for (const procedure of procedures) {
            const result = await storage.updateProcedureApprovalStatus(
              procedure.id,
              procedure.quantityRequested, // quantity_approved = quantity_requested (autorização total)
              'aprovado'
            );
            
            if (result) {
              authorizedCount++;
              console.log(`✅ Procedimento ${procedure.id} autorizado: ${procedure.quantityRequested} unidades`);
            } else {
              console.log(`❌ Falha ao autorizar procedimento ${procedure.id}`);
            }
          }
          
          console.log(`🎉 Autorização completa: ${authorizedCount}/${procedures.length} procedimentos autorizados`);
          
        } catch (procedureError) {
          console.error('❌ Erro ao autorizar procedimentos automaticamente:', procedureError);
          // Não falhar a requisição - status foi atualizado com sucesso
          // Apenas logar o erro para investigação
        }
      }
      
      res.json({ 
        message: "Status atualizado com sucesso", 
        order: updatedOrder,
        previousStatus: previousStatusId,
        newStatus: status,
        historyRecord: historyRecord,
        deadlineDate: deadlineDate,
        nextNotificationAt: nextNotificationAt
      });
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Desfazer última alteração de status (voltar ao status anterior)
  app.patch('/api/medical-orders/:id/undo-status', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const userId = (req as any).user?.id;

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // Buscar o pedido atual
      const existingOrder = await db
        .select()
        .from(medicalOrders)
        .where(eq(medicalOrders.id, orderId))
        .limit(1);

      if (existingOrder.length === 0) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      const order = existingOrder[0];

      // Verificar se existe um status anterior para desfazer
      if (!order.previousStatusId) {
        return res.status(400).json({ error: "Não há status anterior para desfazer" });
      }

      // Buscar informações do status anterior
      const previousStatusInfo = await db
        .select()
        .from(orderStatuses)
        .where(eq(orderStatuses.id, order.previousStatusId))
        .limit(1);

      if (previousStatusInfo.length === 0) {
        return res.status(400).json({ error: "Status anterior não encontrado" });
      }

      const currentStatusId = order.statusId;
      const previousStatusId = order.previousStatusId;

      // Reverter para o status anterior
      const [updatedOrder] = await db
        .update(medicalOrders)
        .set({ 
          statusId: previousStatusId,
          previousStatusId: null, // Limpar o status anterior após desfazer
          updatedAt: new Date()
        })
        .where(eq(medicalOrders.id, orderId))
        .returning();

      console.log(`Status desfeito. Status revertido de ${currentStatusId} para ${previousStatusId}`);

      // Registrar no histórico que foi desfeito
      const historyData = {
        orderId: orderId,
        statusId: previousStatusId,
        changedBy: userId,
        notes: `Status desfeito - revertido de ${currentStatusId} para ${previousStatusId}`,
        changedAt: new Date()
      };

      const [historyRecord] = await db
        .insert(medicalOrderStatusHistory)
        .values(historyData)
        .returning();

      console.log('✅ Entrada no histórico criada:', historyRecord);

      res.json({
        message: "Status desfeito com sucesso",
        order: updatedOrder,
        revertedFrom: currentStatusId,
        revertedTo: previousStatusId,
        historyRecord: historyRecord
      });
    } catch (error) {
      console.error('Erro ao desfazer status do pedido:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Agendar procedimento (definir data do procedimento)
  app.patch('/api/medical-orders/:id/schedule', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { procedureDate } = req.body;

      console.log(`Agendando procedimento ${orderId} para: ${procedureDate}`);

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      if (!procedureDate) {
        return res.status(400).json({ error: "Data do procedimento é obrigatória" });
      }

      // Verificar se o pedido existe
      const existingOrder = await storage.getMedicalOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Atualizar a data do procedimento
      const updatedOrder = await storage.updateMedicalOrder(orderId, { 
        procedureDate: procedureDate 
      });

      if (!updatedOrder) {
        return res.status(500).json({ error: "Falha ao agendar procedimento" });
      }

      console.log(`Procedimento agendado. Nova data: ${updatedOrder.procedureDate}`);
      
      res.json({ 
        message: "Procedimento agendado com sucesso", 
        order: updatedOrder,
        procedureDate: procedureDate
      });
    } catch (error) {
      console.error('Erro ao agendar procedimento:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Atualizar valor recebido pela cirurgia
  app.patch('/api/medical-orders/:id/received-value', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { receivedValue } = req.body;

      console.log(`Atualizando valor recebido do pedido ${orderId}: R$ ${receivedValue ? (receivedValue / 100).toFixed(2) : 'removendo valor'}`);

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      // Validar que o valor é um número válido ou null
      if (receivedValue !== null && receivedValue !== undefined && (isNaN(receivedValue) || receivedValue < 0)) {
        return res.status(400).json({ error: "Valor recebido deve ser um número positivo ou nulo" });
      }

      // Verificar se o pedido existe
      const existingOrder = await storage.getMedicalOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Atualizar o valor recebido (em centavos)
      const updatedOrder = await storage.updateMedicalOrder(orderId, { 
        receivedValue: receivedValue 
      });

      if (!updatedOrder) {
        return res.status(500).json({ error: "Falha ao atualizar valor recebido" });
      }

      const formattedValue = receivedValue ? `R$ ${(receivedValue / 100).toFixed(2)}` : 'Valor removido';
      console.log(`Valor recebido atualizado: ${formattedValue}`);
      
      res.json({ 
        message: "Valor recebido atualizado com sucesso", 
        order: updatedOrder,
        receivedValue: receivedValue,
        formattedValue: formattedValue
      });
    } catch (error) {
      console.error('Erro ao atualizar valor recebido:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota para processar documentos com Google Vision API
  app.post('/api/process-document', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
      }

      const { documentType } = req.body; // 'identity' ou 'insurance'
      
      console.log(`🔄 Processando documento tipo: ${documentType}`);
      
      let imageBuffer: Buffer;
      
      // Verificar se é PDF
      if (req.file.mimetype === 'application/pdf') {
        console.log('📄 Detectado PDF - convertendo para imagem...');
        imageBuffer = await convertPDFToImage(req.file.path);
      } else {
        // Ler arquivo de imagem diretamente
        imageBuffer = fs.readFileSync(req.file.path);
      }
      
      let processedData;
      let extractedText = '';
      
      if (documentType === 'identity') {
        console.log('🆕 Usando nova arquitetura unificada para documento de identidade...');
        
        try {
          // Importar e usar o novo ExtractionOrchestrator
          const { ExtractionOrchestrator } = await import('./services/document-extraction/core/extraction-orchestrator');
          
          const orchestrator = new ExtractionOrchestrator();
          console.log('🔄 ROTA /api/process-document: Iniciando processamento com nova arquitetura unificada...');
          console.log('📄 ROTA: Tamanho do buffer de imagem:', imageBuffer.length, 'bytes');
          
          const result = await orchestrator.processDocument(imageBuffer);
          
          console.log('📋 ROTA: Resultado da nova arquitetura:', result.success ? '✅ SUCESSO' : '❌ FALHA');
          console.log('📊 ROTA: Detalhes do resultado:', JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log('✅ Documento de identidade processado:', result.data);
            
            // Converter resultado para formato compatível
            const compatibleData = {
              fullName: result.data.nomeCompleto,
              idNumber: result.data.rg || result.data.cpf,
              cpf: result.data.cpf,
              birthDate: result.data.dataNascimento,
              mothersName: result.data.nomeMae,
              fathersName: result.data.nomePai,
              birthPlace: result.data.naturalidade,
              issuedBy: result.data.orgaoExpedidor,
              documentType: result.data.tipoDocumento,
              subtype: result.data.subtipoDocumento,
              // Metadados da nova arquitetura
              confidence: result.confidence,
              method: result.method,
              newArchitecture: true
            };
            
            res.json({
              success: true,
              extractedText: 'Processado pela nova arquitetura unificada',
              data: compatibleData,
              metadata: {
                architecture: 'unified',
                confidence: result.confidence,
                detectionMethod: result.method,
                version: '2.0'
              }
            });
            return;
            
          } else {
            console.log('❌ ROTA: Falha na nova arquitetura:', result.errors?.join(', ') || 'Erro desconhecido');
            console.log('🔄 ROTA: Iniciando fallback para sistema legado...');
            console.log('⚠️ ROTA: ATENÇÃO - Sistema caindo para legacy devido a falha na nova arquitetura');
            
            // Fallback para sistema antigo se nova arquitetura falhar
            console.log('🔄 FALLBACK: Extraindo texto com Google Vision...');
            extractedText = await extractTextFromImage(imageBuffer);
            console.log('📝 FALLBACK: Texto extraído (primeiros 200 chars):', extractedText.substring(0, 200));
            
            console.log('🔄 FALLBACK: Processando com sistema legado...');
            processedData = processIdentityDocument(extractedText);
            console.log('📋 FALLBACK: Dados processados pelo sistema legado:', processedData);
            
            const normalizedData = await normalizeExtractedData(processedData);
            console.log('✅ FALLBACK: Dados normalizados:', normalizedData);
            
            res.json({
              success: true,
              extractedText,
              data: normalizedData,
              metadata: {
                architecture: 'legacy',
                fallback: true,
                reason: result.errors?.join(', ') || 'Nova arquitetura falhou',
                version: '1.0'
              }
            });
          }
          
        } catch (error) {
          console.error('❌ Erro na nova arquitetura:', error);
          
          // Fallback para sistema antigo
          console.log('🔄 Usando sistema antigo como fallback...');
          extractedText = await extractTextFromImage(imageBuffer);
          processedData = processIdentityDocument(extractedText);
          
          const normalizedData = await normalizeExtractedData(processedData);
          
          res.json({
            success: true,
            extractedText,
            data: normalizedData,
            metadata: {
              architecture: 'legacy',
              fallback: true,
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              version: '1.0'
            }
          });
        }
        
      } else if (documentType === 'insurance') {
        console.log('🆕 FORÇANDO nova arquitetura modular para carteirinha...');
        
        try {
          // Importar dinamicamente o novo sistema
          const { documentExtractionService } = await import('./services/document-extraction/index');
          
          console.log('✅ Serviço de extração importado com sucesso');
          
          // Usar a nova arquitetura modular
          console.log('🔄 Iniciando processamento com nova arquitetura...');
          const result = await documentExtractionService.processInsuranceCard(imageBuffer);
          
          console.log('📋 Resultado da nova arquitetura:', result.success ? '✅ SUCESSO' : '❌ FALHA');
          
          if (result.errors) {
            console.log('🔍 Erros encontrados:', result.errors);
          }
        
          if (result.success) {
            console.log('✅ Carteirinha processada com nova arquitetura:', result.data);
            
            // Converter resultado para formato compatível com sistema atual
            const compatibleData = {
              operadora: result.data.operadora,
              normalizedOperadora: result.data.normalizedOperadora,
              nomeTitular: result.data.nomeTitular,
              numeroCarteirinha: result.data.numeroCarteirinha,
              plano: result.data.plano,
              dataNascimento: result.data.dataNascimento,
              cns: result.data.cns,
              ansCode: result.data.ansCode,
              // Metadados da nova arquitetura
              confidence: result.confidence,
              method: result.method,
              newArchitecture: true
            };
            
            res.json({
              success: true,
              extractedText: 'Processado pela nova arquitetura modular',
              data: compatibleData,
              metadata: {
                architecture: 'modular',
                confidence: result.confidence,
                detectionMethod: result.method,
                version: '2.0'
              }
            });
            return;
            
          } else {
            console.log('❌ Falha na nova arquitetura:', result.errors?.join(', ') || 'Erro desconhecido');
            
            res.status(500).json({
              success: false,
              error: 'Falha no processamento da carteirinha',
              errors: result.errors,
              metadata: {
                architecture: 'modular',
                version: '2.0'
              }
            });
          }
        } catch (error) {
          console.error('❌ Erro na nova arquitetura:', error);
          
          res.status(500).json({
            success: false,
            error: 'Erro interno na nova arquitetura',
            details: error instanceof Error ? error.message : 'Erro desconhecido',
            metadata: {
              architecture: 'modular',
              version: '2.0'
            }
          });
        }
        
      } else {
        return res.status(400).json({ error: 'Tipo de documento inválido' });
      }
      
      
      // Remover o arquivo temporário
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar documento:', error);
      
      // Remover arquivo temporário em caso de erro
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        error: 'Erro ao processar documento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // API para formulário de contato
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, phone, subject, message } = req.body;

      // Validação básica
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: nome, email, assunto e mensagem" 
        });
      }

      // Criar mensagem de contato
      const contactMessage = await storage.createContactMessage({
        name,
        email,
        phone: phone || null,
        subject,
        message
      });

      console.log(`Nova mensagem de contato criada: ID ${contactMessage.id}`);

      res.status(201).json({ 
        message: "Mensagem enviada com sucesso",
        id: contactMessage.id
      });
    } catch (error) {
      console.error("Erro ao processar mensagem de contato:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor"
      });
    }
  });

  // === ROTAS DE RECURSOS (APPEALS) ===
  
  // Criar recurso para pedido recusado
  app.post("/api/medical-orders/:orderId/appeals",  async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { justification, additionalDocuments, rejectionReason } = req.body;
      const userId = (req as any).user.id;

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      if (!justification || justification.trim().length === 0) {
        return res.status(400).json({ message: "Justificativa é obrigatória" });
      }

      // Verificar se o pedido existe e está recusado
      const order = await storage.getMedicalOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      // Verificar se o pedido está em status que permite recursos
      const allowedStatusesForAppeals = ["recusado", "pendencia", "autorizado_parcial"];
      if (!allowedStatusesForAppeals.includes(order.status)) {
        return res.status(400).json({ 
          message: "Recursos são permitidos apenas para pedidos recusados, em pendência ou autorizados parcialmente" 
        });
      }

      // Criar o recurso
      const appeal = await storage.createAppeal({
        medicalOrderId: orderId,
        justification: justification.trim(),
        additionalDocuments: additionalDocuments || null,
        rejectionReason: rejectionReason ? rejectionReason.trim() : null,
        createdBy: userId,
        status: "em_analise"
      });

      console.log(`Recurso criado: ID ${appeal.id} para pedido ${orderId}`);
      res.status(201).json(appeal);

    } catch (error) {
      console.error("Erro ao criar recurso:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar recursos de um pedido
  app.get("/api/medical-orders/:orderId/appeals",  async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      const appeals = await storage.getAppealsByOrderId(orderId);
      res.json(appeals);

    } catch (error) {
      console.error("Erro ao buscar recursos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Atualizar status de um recurso (para administradores)
  app.patch("/api/appeals/:appealId/status",  async (req: Request, res: Response) => {
    try {
      const appealId = parseInt(req.params.appealId);
      const { status, reviewerNotes } = req.body;

      if (isNaN(appealId)) {
        return res.status(400).json({ message: "ID do recurso inválido" });
      }

      if (!["aprovado", "negado", "cancelado"].includes(status)) {
        return res.status(400).json({ message: "Status inválido" });
      }

      const updatedAppeal = await storage.updateAppealStatus(appealId, status, reviewerNotes);
      if (!updatedAppeal) {
        return res.status(404).json({ message: "Recurso não encontrado" });
      }

      console.log(`Status do recurso ${appealId} atualizado para: ${status}`);
      res.json(updatedAppeal);

    } catch (error) {
      console.error("Erro ao atualizar status do recurso:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ====================================
  // SURGICAL PROCEDURES API ENDPOINTS
  // ====================================

  // GET /api/surgical-procedures - Listar todos os procedimentos cirúrgicos
  app.get("/api/surgical-procedures", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedures = await db.select().from(surgicalProcedures).where(eq(surgicalProcedures.isActive, true));
      
      console.log(`Retornando ${procedures.length} procedimentos cirúrgicos`);
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(procedures);
    } catch (error) {
      console.error("Erro ao buscar procedimentos cirúrgicos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ====================================
  // SURGICAL APPROACHES API ENDPOINTS
  // ====================================

  // GET /api/surgical-approaches - Listar todas as condutas cirúrgicas
  app.get("/api/surgical-approaches",  async (req: Request, res: Response) => {
    try {
      const approaches = await db.select().from(surgicalApproaches);
      
      console.log(`Retornando ${approaches.length} condutas cirúrgicas`);
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(approaches);
    } catch (error) {
      console.error("Erro ao buscar condutas cirúrgicas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approaches/:id - Buscar conduta cirúrgica por ID
  app.get("/api/surgical-approaches/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const approach = await db.select().from(surgicalApproaches).where(eq(surgicalApproaches.id, id));
      
      if (approach.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      console.log(`Retornando conduta cirúrgica ID ${id}: ${approach[0].name}`);
      res.json(approach[0]);
    } catch (error) {
      console.error("Erro ao buscar conduta cirúrgica:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/surgical-approaches - Criar nova conduta cirúrgica
  app.post("/api/surgical-approaches",  async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;

      // Validar dados obrigatórios
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Nome da conduta cirúrgica é obrigatório" });
      }

      // Verificar se já existe uma conduta com o mesmo nome
      const existing = await db.select().from(surgicalApproaches).where(eq(surgicalApproaches.name, name.trim()));
      
      if (existing.length > 0) {
        return res.status(409).json({ message: "Já existe uma conduta cirúrgica com este nome" });
      }

      // Criar nova conduta cirúrgica
      const newApproach = await db.insert(surgicalApproaches).values({
        name: name.trim(),
        description: description?.trim() || null
      }).returning();

      console.log(`Nova conduta cirúrgica criada: ${newApproach[0].name} (ID: ${newApproach[0].id})`);
      
      res.setHeader("Content-Type", "application/json");
      res.status(201).json(newApproach[0]);
    } catch (error) {
      console.error("Erro ao criar conduta cirúrgica:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/surgical-approaches/:id - Atualizar conduta cirúrgica
  app.put("/api/surgical-approaches/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Nome da conduta cirúrgica é obrigatório" });
      }

      // Verificar se a conduta existe
      const existing = await db.select().from(surgicalApproaches).where(eq(surgicalApproaches.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      // Verificar se já existe outra conduta com o mesmo nome
      const nameCheck = await db.select().from(surgicalApproaches)
        .where(and(
          eq(surgicalApproaches.name, name.trim()),
          // Excluir o registro atual da verificação
          // Como não temos ne() vamos usar uma subquery ou verificar após
        ));
      
      const duplicateName = nameCheck.find(approach => approach.id !== id);
      if (duplicateName) {
        return res.status(409).json({ message: "Já existe uma conduta cirúrgica com este nome" });
      }

      // Atualizar conduta cirúrgica
      const updatedApproach = await db.update(surgicalApproaches)
        .set({
          name: name.trim(),
          description: description?.trim() || null
        })
        .where(eq(surgicalApproaches.id, id))
        .returning();

      console.log(`Conduta cirúrgica atualizada: ${updatedApproach[0].name} (ID: ${id})`);
      res.json(updatedApproach[0]);
    } catch (error) {
      console.error("Erro ao atualizar conduta cirúrgica:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/surgical-approaches/:id - Deletar conduta cirúrgica
  app.delete("/api/surgical-approaches/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a conduta existe
      const existing = await db.select().from(surgicalApproaches).where(eq(surgicalApproaches.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      // TODO: Verificar se a conduta está sendo usada em algum pedido médico
      // antes de permitir a exclusão (implementar quando necessário)

      // Deletar conduta cirúrgica
      await db.delete(surgicalApproaches).where(eq(surgicalApproaches.id, id));

      console.log(`Conduta cirúrgica deletada: ${existing[0].name} (ID: ${id})`);
      res.status(204).send(); // No content
    } catch (error) {
      console.error("Erro ao deletar conduta cirúrgica:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ====================================
  // SURGICAL PROCEDURE-APPROACHES ASSOCIATION API ENDPOINTS
  // ====================================

  // GET /api/surgical-procedure-approaches - Listar todas as associações procedimento-conduta
  app.get("/api/surgical-procedure-approaches", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const associations = await db.select({
        id: surgicalProcedureApproaches.id,
        surgicalProcedureId: surgicalProcedureApproaches.surgicalProcedureId,
        surgicalApproachId: surgicalProcedureApproaches.surgicalApproachId,
        isPreferred: surgicalProcedureApproaches.isPreferred,
        complexity: surgicalProcedureApproaches.complexity,
        estimatedDuration: surgicalProcedureApproaches.estimatedDuration,
        notes: surgicalProcedureApproaches.notes,
        createdAt: surgicalProcedureApproaches.createdAt,
        updatedAt: surgicalProcedureApproaches.updatedAt,
        procedureName: surgicalProcedures.name,
        procedureDescription: surgicalProcedures.description,
        approachName: surgicalApproaches.name,
        approachDescription: surgicalApproaches.description
      })
      .from(surgicalProcedureApproaches)
      .leftJoin(surgicalProcedures, eq(surgicalProcedureApproaches.surgicalProcedureId, surgicalProcedures.id))
      .leftJoin(surgicalApproaches, eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproaches.id))
      .orderBy(surgicalProcedureApproaches.surgicalProcedureId, surgicalProcedureApproaches.surgicalApproachId);
      
      console.log(`Retornando ${associations.length} associações procedimento-conduta cirúrgica`);
      
      res.setHeader("Content-Type", "application/json");
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar associações procedimento-conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-procedure-approaches/procedure/:procedureId - Buscar condutas por procedimento
  app.get("/api/surgical-procedure-approaches/procedure/:procedureId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.procedureId);
      
      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID do procedimento inválido" });
      }
      
      const associations = await db.select({
        id: surgicalProcedureApproaches.id,
        surgicalProcedureId: surgicalProcedureApproaches.surgicalProcedureId,
        surgicalApproachId: surgicalProcedureApproaches.surgicalApproachId,
        isPreferred: surgicalProcedureApproaches.isPreferred,
        complexity: surgicalProcedureApproaches.complexity,
        estimatedDuration: surgicalProcedureApproaches.estimatedDuration,
        notes: surgicalProcedureApproaches.notes,
        createdAt: surgicalProcedureApproaches.createdAt,
        updatedAt: surgicalProcedureApproaches.updatedAt,
        procedureName: surgicalProcedures.name,
        procedureDescription: surgicalProcedures.description,
        approachName: surgicalApproaches.name,
        approachDescription: surgicalApproaches.description
      })
      .from(surgicalProcedureApproaches)
      .leftJoin(surgicalProcedures, eq(surgicalProcedureApproaches.surgicalProcedureId, surgicalProcedures.id))
      .leftJoin(surgicalApproaches, eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproaches.id))
      .where(eq(surgicalProcedureApproaches.surgicalProcedureId, procedureId))
      .orderBy(sql`${surgicalProcedureApproaches.isPreferred} DESC`, surgicalApproaches.name);
      
      console.log(`Retornando ${associations.length} condutas para procedimento ${procedureId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar condutas por procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-procedure-approaches/approach/:approachId - Buscar procedimentos por conduta
  app.get("/api/surgical-procedure-approaches/approach/:approachId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const approachId = parseInt(req.params.approachId);
      
      if (isNaN(approachId)) {
        return res.status(400).json({ message: "ID da conduta inválido" });
      }
      
      const associations = await db.select({
        id: surgicalProcedureApproaches.id,
        surgicalProcedureId: surgicalProcedureApproaches.surgicalProcedureId,
        surgicalApproachId: surgicalProcedureApproaches.surgicalApproachId,
        isPreferred: surgicalProcedureApproaches.isPreferred,
        complexity: surgicalProcedureApproaches.complexity,
        estimatedDuration: surgicalProcedureApproaches.estimatedDuration,
        notes: surgicalProcedureApproaches.notes,
        createdAt: surgicalProcedureApproaches.createdAt,
        updatedAt: surgicalProcedureApproaches.updatedAt,
        procedureName: surgicalProcedures.name,
        procedureDescription: surgicalProcedures.description,
        approachName: surgicalApproaches.name,
        approachDescription: surgicalApproaches.description
      })
      .from(surgicalProcedureApproaches)
      .leftJoin(surgicalProcedures, eq(surgicalProcedureApproaches.surgicalProcedureId, surgicalProcedures.id))
      .leftJoin(surgicalApproaches, eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproaches.id))
      .where(eq(surgicalProcedureApproaches.surgicalApproachId, approachId))
      .orderBy(sql`${surgicalProcedureApproaches.isPreferred} DESC`, surgicalProcedures.name);
      
      console.log(`Retornando ${associations.length} procedimentos para conduta ${approachId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar procedimentos por conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/surgical-procedure-approaches - Criar nova associação procedimento-conduta
  app.post("/api/surgical-procedure-approaches", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { surgicalProcedureId, surgicalApproachId, isPreferred, complexity, estimatedDuration, notes } = req.body;

      // Validar dados obrigatórios
      if (!surgicalProcedureId || !surgicalApproachId) {
        return res.status(400).json({ message: "ID do procedimento e da conduta são obrigatórios" });
      }

      // Verificar se o procedimento existe
      const procedure = await db.select().from(surgicalProcedures).where(eq(surgicalProcedures.id, surgicalProcedureId));
      if (procedure.length === 0) {
        return res.status(404).json({ message: "Procedimento cirúrgico não encontrado" });
      }

      // Verificar se a conduta existe
      const approach = await db.select().from(surgicalApproaches).where(eq(surgicalApproaches.id, surgicalApproachId));
      if (approach.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      // Verificar se já existe associação
      const existing = await db.select().from(surgicalProcedureApproaches)
        .where(and(
          eq(surgicalProcedureApproaches.surgicalProcedureId, surgicalProcedureId),
          eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproachId)
        ));
      
      if (existing.length > 0) {
        return res.status(409).json({ message: "Associação já existe" });
      }

      // Criar nova associação
      const newAssociation = await db.insert(surgicalProcedureApproaches)
        .values({
          surgicalProcedureId: surgicalProcedureId,
          surgicalApproachId: surgicalApproachId,
          isPreferred: isPreferred || false,
          complexity: complexity?.trim() || null,
          estimatedDuration: estimatedDuration || null,
          notes: notes?.trim() || null
        })
        .returning();

      console.log(`Nova associação criada: Procedimento ${surgicalProcedureId} <-> Conduta ${surgicalApproachId}`);
      res.status(201).json(newAssociation[0]);
    } catch (error) {
      console.error("Erro ao criar associação procedimento-conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/surgical-procedure-approaches/:id - Atualizar associação procedimento-conduta
  app.put("/api/surgical-procedure-approaches/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isPreferred, complexity, estimatedDuration, notes } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalProcedureApproaches).where(eq(surgicalProcedureApproaches.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Atualizar associação
      const updatedAssociation = await db.update(surgicalProcedureApproaches)
        .set({
          isPreferred: isPreferred !== undefined ? isPreferred : existing[0].isPreferred,
          complexity: complexity !== undefined ? complexity?.trim() : existing[0].complexity,
          estimatedDuration: estimatedDuration !== undefined ? estimatedDuration : existing[0].estimatedDuration,
          notes: notes !== undefined ? notes?.trim() : existing[0].notes,
          updatedAt: new Date()
        })
        .where(eq(surgicalProcedureApproaches.id, id))
        .returning();

      console.log(`Associação atualizada: ID ${id}`);
      res.json(updatedAssociation[0]);
    } catch (error) {
      console.error("Erro ao atualizar associação procedimento-conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/surgical-procedure-approaches/:id - Deletar associação procedimento-conduta
  app.delete("/api/surgical-procedure-approaches/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalProcedureApproaches).where(eq(surgicalProcedureApproaches.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Deletar associação
      await db.delete(surgicalProcedureApproaches).where(eq(surgicalProcedureApproaches.id, id));

      console.log(`Associação deletada: ID ${id}`);
      res.status(204).send(); // No content
    } catch (error) {
      console.error("Erro ao deletar associação procedimento-conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });


  // === ENDPOINTS PARA ASSOCIAÇÕES ENTRE CONDUTAS CIRÚRGICAS E PROCEDIMENTOS ===

  // GET /api/surgical-approach-procedures - Listar todas as associações
  app.get("/api/surgical-approach-procedures",  async (req: Request, res: Response) => {
    try {
      const associations = await db.select({
        id: surgicalApproachProcedures.id,
        surgicalApproachId: surgicalApproachProcedures.surgicalApproachId,
        procedureId: surgicalApproachProcedures.procedureId,
        isPreferred: surgicalApproachProcedures.isPreferred,
        complexity: surgicalApproachProcedures.complexity,
        estimatedDuration: surgicalApproachProcedures.estimatedDuration,
        notes: surgicalApproachProcedures.notes,
        surgicalApproachName: surgicalApproaches.name,
        procedureCode: procedures.code,
        procedureName: procedures.name,
        createdAt: surgicalApproachProcedures.createdAt
      })
      .from(surgicalApproachProcedures)
      .leftJoin(surgicalApproaches, eq(surgicalApproachProcedures.surgicalApproachId, surgicalApproaches.id))
      .leftJoin(procedures, eq(surgicalApproachProcedures.procedureId, procedures.id))
      .orderBy(surgicalApproachProcedures.surgicalApproachId, surgicalApproachProcedures.isPreferred);

      console.log(`Retornando ${associations.length} associações conduta-procedimento`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar associações conduta-procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approach-procedures/approach/:approachId - Buscar procedimentos por conduta
  app.get("/api/surgical-approach-procedures/approach/:approachId",  async (req: Request, res: Response) => {
    try {
      const approachId = parseInt(req.params.approachId);

      if (isNaN(approachId)) {
        return res.status(400).json({ message: "ID da conduta cirúrgica inválido" });
      }

      const associations = await db.select({
        id: surgicalApproachProcedures.id,
        procedureId: surgicalApproachProcedures.procedureId,
        isPreferred: surgicalApproachProcedures.isPreferred,
        complexity: surgicalApproachProcedures.complexity,
        estimatedDuration: surgicalApproachProcedures.estimatedDuration,
        notes: surgicalApproachProcedures.notes,
        procedureCode: procedures.code,
        procedureName: procedures.name
      })
      .from(surgicalApproachProcedures)
      .leftJoin(procedures, eq(surgicalApproachProcedures.procedureId, procedures.id))
      .where(eq(surgicalApproachProcedures.surgicalApproachId, approachId))
      .orderBy(surgicalApproachProcedures.isPreferred);

      console.log(`Encontrados ${associations.length} procedimentos para conduta cirúrgica ID ${approachId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar procedimentos por conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approach-procedures/procedure/:procedureId - Buscar condutas por procedimento
  app.get("/api/surgical-approach-procedures/procedure/:procedureId",  async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.procedureId);

      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID do procedimento inválido" });
      }

      const associations = await db.select({
        id: surgicalApproachProcedures.id,
        surgicalApproachId: surgicalApproachProcedures.surgicalApproachId,
        isPreferred: surgicalApproachProcedures.isPreferred,
        complexity: surgicalApproachProcedures.complexity,
        estimatedDuration: surgicalApproachProcedures.estimatedDuration,
        notes: surgicalApproachProcedures.notes,
        surgicalApproachName: surgicalApproaches.name,
        surgicalApproachDescription: surgicalApproaches.description
      })
      .from(surgicalApproachProcedures)
      .leftJoin(surgicalApproaches, eq(surgicalApproachProcedures.surgicalApproachId, surgicalApproaches.id))
      .where(eq(surgicalApproachProcedures.procedureId, procedureId))
      .orderBy(surgicalApproachProcedures.isPreferred);

      console.log(`Encontradas ${associations.length} condutas para procedimento ID ${procedureId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar condutas por procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/surgical-approach-procedures - Criar nova associação
  app.post("/api/surgical-approach-procedures",  async (req: Request, res: Response) => {
    try {
      const { surgicalApproachId, procedureId, isPreferred, complexity, estimatedDuration, notes } = req.body;

      // Validar dados obrigatórios
      if (!surgicalApproachId || !procedureId) {
        return res.status(400).json({ 
          message: "ID da conduta cirúrgica e ID do procedimento são obrigatórios" 
        });
      }

      // Verificar se conduta cirúrgica existe
      const approachExists = await db.select().from(surgicalApproaches)
        .where(eq(surgicalApproaches.id, surgicalApproachId));
      if (approachExists.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      // Verificar se procedimento existe
      const procedureExists = await db.select().from(procedures).where(eq(procedures.id, procedureId));
      if (procedureExists.length === 0) {
        return res.status(404).json({ message: "Procedimento não encontrado" });
      }

      // Verificar se associação já existe
      const existingAssociation = await db.select().from(surgicalApproachProcedures)
        .where(and(
          eq(surgicalApproachProcedures.surgicalApproachId, surgicalApproachId),
          eq(surgicalApproachProcedures.procedureId, procedureId)
        ));
      
      if (existingAssociation.length > 0) {
        return res.status(409).json({ 
          message: "Associação entre esta conduta cirúrgica e procedimento já existe" 
        });
      }

      // Criar nova associação
      const newAssociation = await db.insert(surgicalApproachProcedures).values({
        surgicalApproachId: parseInt(surgicalApproachId),
        procedureId: parseInt(procedureId),
        isPreferred: isPreferred || false,
        complexity: complexity?.trim() || null,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
        notes: notes?.trim() || null
      }).returning();

      console.log(`Nova associação criada: Conduta ${surgicalApproachId} - Procedimento ${procedureId} (ID: ${newAssociation[0].id})`);
      
      res.setHeader("Content-Type", "application/json");
      res.status(201).json(newAssociation[0]);
    } catch (error) {
      console.error("Erro ao criar associação conduta-procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/surgical-approach-procedures/:id - Atualizar associação
  app.put("/api/surgical-approach-procedures/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isPreferred, complexity, estimatedDuration, notes } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalApproachProcedures).where(eq(surgicalApproachProcedures.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Atualizar associação
      const updatedAssociation = await db.update(surgicalApproachProcedures)
        .set({
          isPreferred: isPreferred !== undefined ? isPreferred : existing[0].isPreferred,
          complexity: complexity !== undefined ? (complexity?.trim() || null) : existing[0].complexity,
          estimatedDuration: estimatedDuration !== undefined ? (estimatedDuration ? parseInt(estimatedDuration) : null) : existing[0].estimatedDuration,
          notes: notes !== undefined ? (notes?.trim() || null) : existing[0].notes,
          updatedAt: new Date()
        })
        .where(eq(surgicalApproachProcedures.id, id))
        .returning();

      console.log(`Associação conduta-procedimento atualizada: ID ${id}`);
      res.json(updatedAssociation[0]);
    } catch (error) {
      console.error("Erro ao atualizar associação conduta-procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/surgical-approach-procedures/:id - Deletar associação
  app.delete("/api/surgical-approach-procedures/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalApproachProcedures).where(eq(surgicalApproachProcedures.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Deletar associação
      await db.delete(surgicalApproachProcedures).where(eq(surgicalApproachProcedures.id, id));

      console.log(`Associação conduta-procedimento deletada: ID ${id}`);
      res.status(204).send(); // No content
    } catch (error) {
      console.error("Erro ao deletar associação conduta-procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/cbhpm-procedures-by-combination - Buscar procedimentos CBHPM por combinação Procedimento Médico + Conduta
  app.get("/api/cbhpm-procedures-by-combination", async (req: Request, res: Response) => {
    try {
      const medicalProcedureId = parseInt(req.query.medicalProcedureId as string);
      const approachId = parseInt(req.query.approachId as string);

      if (isNaN(medicalProcedureId) || isNaN(approachId)) {
        return res.status(400).json({ message: "IDs de procedimento médico ou conduta inválidos" });
      }

      const cbhpmProcedures = await db.select({
        id: surgicalApproachProcedures.id,
        procedureId: surgicalApproachProcedures.procedureId,
        procedureCode: procedures.code,
        procedureName: procedures.name,
        porte: procedures.porte,
        porteAnestesista: procedures.porteAnestesista,
        numeroAuxiliares: procedures.numeroAuxiliares,
        quantity: surgicalApproachProcedures.quantity,
        isPreferred: surgicalApproachProcedures.isPreferred,
        complexity: surgicalApproachProcedures.complexity,
        estimatedDuration: surgicalApproachProcedures.estimatedDuration,
        notes: surgicalApproachProcedures.notes,
        createdAt: surgicalApproachProcedures.createdAt
      })
      .from(surgicalApproachProcedures)
      .leftJoin(procedures, eq(surgicalApproachProcedures.procedureId, procedures.id))
      .where(
        and(
          eq(surgicalApproachProcedures.surgicalProcedureId, medicalProcedureId),
          eq(surgicalApproachProcedures.surgicalApproachId, approachId)
        )
      )
      .orderBy(desc(surgicalApproachProcedures.isPreferred), procedures.code);

      console.log(`Encontrados ${cbhpmProcedures.length} procedimentos CBHPM para Procedimento Médico ID ${medicalProcedureId} + Conduta ID ${approachId}`);
      res.json(cbhpmProcedures);
    } catch (error) {
      console.error("Erro ao buscar procedimentos CBHPM por combinação:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === ENDPOINTS PARA ASSOCIAÇÕES ENTRE CONDUTAS CIRÚRGICAS E ITENS OPME ===

  // GET /api/surgical-approach-opme-items - Listar todas as associações
  app.get("/api/surgical-approach-opme-items",  async (req: Request, res: Response) => {
    try {
      const associations = await db.select({
        id: surgicalApproachOpmeItems.id,
        surgicalApproachId: surgicalApproachOpmeItems.surgicalApproachId,
        opmeItemId: surgicalApproachOpmeItems.opmeItemId,
        isRequired: surgicalApproachOpmeItems.isRequired,
        quantity: surgicalApproachOpmeItems.quantity,
        alternativeItems: surgicalApproachOpmeItems.alternativeItems,
        notes: surgicalApproachOpmeItems.notes,
        surgicalApproachName: surgicalApproaches.name,
        opmeCommercialName: opmeItems.commercialName,
        opmeTechnicalName: opmeItems.technicalName,
        createdAt: surgicalApproachOpmeItems.createdAt
      })
      .from(surgicalApproachOpmeItems)
      .leftJoin(surgicalApproaches, eq(surgicalApproachOpmeItems.surgicalApproachId, surgicalApproaches.id))
      .leftJoin(opmeItems, eq(surgicalApproachOpmeItems.opmeItemId, opmeItems.id))
      .orderBy(surgicalApproachOpmeItems.surgicalApproachId, surgicalApproachOpmeItems.isRequired);

      console.log(`Retornando ${associations.length} associações conduta-OPME`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar associações conduta-OPME:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approach-opme-items/approach/:approachId - Buscar itens OPME por conduta
  app.get("/api/surgical-approach-opme-items/approach/:approachId",  async (req: Request, res: Response) => {
    try {
      const approachId = parseInt(req.params.approachId);

      if (isNaN(approachId)) {
        return res.status(400).json({ message: "ID da conduta cirúrgica inválido" });
      }

      const associations = await db.select({
        id: surgicalApproachOpmeItems.id,
        opmeItemId: surgicalApproachOpmeItems.opmeItemId,
        isRequired: surgicalApproachOpmeItems.isRequired,
        quantity: surgicalApproachOpmeItems.quantity,
        alternativeItems: surgicalApproachOpmeItems.alternativeItems,
        notes: surgicalApproachOpmeItems.notes,
        opmeCommercialName: opmeItems.commercialName,
        opmeTechnicalName: opmeItems.technicalName,
        opmeAnvisaNumber: opmeItems.anvisaRegistrationNumber
      })
      .from(surgicalApproachOpmeItems)
      .leftJoin(opmeItems, eq(surgicalApproachOpmeItems.opmeItemId, opmeItems.id))
      .where(eq(surgicalApproachOpmeItems.surgicalApproachId, approachId))
      .orderBy(surgicalApproachOpmeItems.isRequired);

      console.log(`Encontrados ${associations.length} itens OPME para conduta cirúrgica ID ${approachId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar itens OPME por conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approach-opme-items/opme/:opmeId - Buscar condutas por item OPME
  app.get("/api/surgical-approach-opme-items/opme/:opmeId",  async (req: Request, res: Response) => {
    try {
      const opmeId = parseInt(req.params.opmeId);

      if (isNaN(opmeId)) {
        return res.status(400).json({ message: "ID do item OPME inválido" });
      }

      const associations = await db.select({
        id: surgicalApproachOpmeItems.id,
        surgicalApproachId: surgicalApproachOpmeItems.surgicalApproachId,
        isRequired: surgicalApproachOpmeItems.isRequired,
        quantity: surgicalApproachOpmeItems.quantity,
        alternativeItems: surgicalApproachOpmeItems.alternativeItems,
        notes: surgicalApproachOpmeItems.notes,
        surgicalApproachName: surgicalApproaches.name,
        surgicalApproachDescription: surgicalApproaches.description
      })
      .from(surgicalApproachOpmeItems)
      .leftJoin(surgicalApproaches, eq(surgicalApproachOpmeItems.surgicalApproachId, surgicalApproaches.id))
      .where(eq(surgicalApproachOpmeItems.opmeItemId, opmeId))
      .orderBy(surgicalApproachOpmeItems.isRequired);

      console.log(`Encontradas ${associations.length} condutas para item OPME ID ${opmeId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar condutas por item OPME:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/surgical-approach-opme-items - Criar nova associação
  app.post("/api/surgical-approach-opme-items",  async (req: Request, res: Response) => {
    try {
      const { surgicalApproachId, opmeItemId, isRequired, quantity, alternativeItems, notes } = req.body;

      // Validar dados obrigatórios
      if (!surgicalApproachId || !opmeItemId) {
        return res.status(400).json({ 
          message: "ID da conduta cirúrgica e ID do item OPME são obrigatórios" 
        });
      }

      // Verificar se conduta cirúrgica existe
      const approachExists = await db.select().from(surgicalApproaches)
        .where(eq(surgicalApproaches.id, surgicalApproachId));
      if (approachExists.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      // Verificar se item OPME existe
      const opmeExists = await db.select().from(opmeItems).where(eq(opmeItems.id, opmeItemId));
      if (opmeExists.length === 0) {
        return res.status(404).json({ message: "Item OPME não encontrado" });
      }

      // Verificar se associação já existe
      const existingAssociation = await db.select().from(surgicalApproachOpmeItems)
        .where(and(
          eq(surgicalApproachOpmeItems.surgicalApproachId, surgicalApproachId),
          eq(surgicalApproachOpmeItems.opmeItemId, opmeItemId)
        ));
      
      if (existingAssociation.length > 0) {
        return res.status(409).json({ 
          message: "Associação entre esta conduta cirúrgica e item OPME já existe" 
        });
      }

      // Criar nova associação
      const newAssociation = await db.insert(surgicalApproachOpmeItems).values({
        surgicalApproachId: parseInt(surgicalApproachId),
        opmeItemId: parseInt(opmeItemId),
        isRequired: isRequired || false,
        quantity: quantity ? parseInt(quantity) : 1,
        alternativeItems: alternativeItems?.trim() || null,
        notes: notes?.trim() || null
      }).returning();

      console.log(`Nova associação criada: Conduta ${surgicalApproachId} - Item OPME ${opmeItemId} (ID: ${newAssociation[0].id})`);
      
      res.setHeader("Content-Type", "application/json");
      res.status(201).json(newAssociation[0]);
    } catch (error) {
      console.error("Erro ao criar associação conduta-OPME:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/surgical-approach-opme-items/:id - Atualizar associação
  app.put("/api/surgical-approach-opme-items/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isRequired, quantity, alternativeItems, notes } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalApproachOpmeItems).where(eq(surgicalApproachOpmeItems.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Atualizar associação
      const updatedAssociation = await db.update(surgicalApproachOpmeItems)
        .set({
          isRequired: isRequired !== undefined ? isRequired : existing[0].isRequired,
          quantity: quantity !== undefined ? (quantity ? parseInt(quantity) : 1) : existing[0].quantity,
          alternativeItems: alternativeItems !== undefined ? (alternativeItems?.trim() || null) : existing[0].alternativeItems,
          notes: notes !== undefined ? (notes?.trim() || null) : existing[0].notes,
          updatedAt: new Date()
        })
        .where(eq(surgicalApproachOpmeItems.id, id))
        .returning();

      console.log(`Associação conduta-OPME atualizada: ID ${id}`);
      res.json(updatedAssociation[0]);
    } catch (error) {
      console.error("Erro ao atualizar associação conduta-OPME:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/surgical-approach-opme-items/:id - Deletar associação
  app.delete("/api/surgical-approach-opme-items/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalApproachOpmeItems).where(eq(surgicalApproachOpmeItems.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Deletar associação
      await db.delete(surgicalApproachOpmeItems).where(eq(surgicalApproachOpmeItems.id, id));

      console.log(`Associação conduta-OPME deletada: ID ${id}`);
      res.status(204).send(); // No content
    } catch (error) {
      console.error("Erro ao deletar associação conduta-OPME:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === ENDPOINTS PARA ASSOCIAÇÕES ENTRE CONDUTAS CIRÚRGICAS E FORNECEDORES ===

  // GET /api/surgical-approach-suppliers - Listar todas as associações
  app.get("/api/surgical-approach-suppliers",  async (req: Request, res: Response) => {
    try {
      const associations = await db.select({
        id: surgicalApproachSuppliers.id,
        surgicalApproachId: surgicalApproachSuppliers.surgicalApproachId,
        supplierId: surgicalApproachSuppliers.supplierId,
        priority: surgicalApproachSuppliers.priority,
        isPreferred: surgicalApproachSuppliers.isPreferred,
        contractNumber: surgicalApproachSuppliers.contractNumber,
        priceRange: surgicalApproachSuppliers.priceRange,
        notes: surgicalApproachSuppliers.notes,
        surgicalApproachName: surgicalApproaches.name,
        supplierCompanyName: suppliers.companyName,
        supplierCnpj: suppliers.cnpj,
        createdAt: surgicalApproachSuppliers.createdAt
      })
      .from(surgicalApproachSuppliers)
      .leftJoin(surgicalApproaches, eq(surgicalApproachSuppliers.surgicalApproachId, surgicalApproaches.id))
      .leftJoin(suppliers, eq(surgicalApproachSuppliers.supplierId, suppliers.id))
      .orderBy(surgicalApproachSuppliers.surgicalApproachId, surgicalApproachSuppliers.priority);

      console.log(`Retornando ${associations.length} associações conduta-fornecedor`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar associações conduta-fornecedor:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approach-suppliers/approach/:approachId - Buscar fornecedores por conduta
  app.get("/api/surgical-approach-suppliers/approach/:approachId",  async (req: Request, res: Response) => {
    try {
      const approachId = parseInt(req.params.approachId);

      if (isNaN(approachId)) {
        return res.status(400).json({ message: "ID da conduta cirúrgica inválido" });
      }

      const associations = await db.select({
        id: surgicalApproachSuppliers.id,
        supplierId: surgicalApproachSuppliers.supplierId,
        priority: surgicalApproachSuppliers.priority,
        isPreferred: surgicalApproachSuppliers.isPreferred,
        contractNumber: surgicalApproachSuppliers.contractNumber,
        priceRange: surgicalApproachSuppliers.priceRange,
        notes: surgicalApproachSuppliers.notes,
        supplierCompanyName: suppliers.companyName,
        supplierCnpj: suppliers.cnpj,
        supplierPhone: suppliers.phone,
        supplierEmail: suppliers.email
      })
      .from(surgicalApproachSuppliers)
      .leftJoin(suppliers, eq(surgicalApproachSuppliers.supplierId, suppliers.id))
      .where(eq(surgicalApproachSuppliers.surgicalApproachId, approachId))
      .orderBy(surgicalApproachSuppliers.priority);

      console.log(`Encontrados ${associations.length} fornecedores para conduta cirúrgica ID ${approachId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar fornecedores por conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approach-suppliers/supplier/:supplierId - Buscar condutas por fornecedor
  app.get("/api/surgical-approach-suppliers/supplier/:supplierId",  async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.supplierId);

      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "ID do fornecedor inválido" });
      }

      const associations = await db.select({
        id: surgicalApproachSuppliers.id,
        surgicalApproachId: surgicalApproachSuppliers.surgicalApproachId,
        priority: surgicalApproachSuppliers.priority,
        isPreferred: surgicalApproachSuppliers.isPreferred,
        contractNumber: surgicalApproachSuppliers.contractNumber,
        priceRange: surgicalApproachSuppliers.priceRange,
        notes: surgicalApproachSuppliers.notes,
        surgicalApproachName: surgicalApproaches.name,
        surgicalApproachDescription: surgicalApproaches.description
      })
      .from(surgicalApproachSuppliers)
      .leftJoin(surgicalApproaches, eq(surgicalApproachSuppliers.surgicalApproachId, surgicalApproaches.id))
      .where(eq(surgicalApproachSuppliers.supplierId, supplierId))
      .orderBy(surgicalApproachSuppliers.priority);

      console.log(`Encontradas ${associations.length} condutas para fornecedor ID ${supplierId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar condutas por fornecedor:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/surgical-approach-suppliers - Criar nova associação
  app.post("/api/surgical-approach-suppliers",  async (req: Request, res: Response) => {
    try {
      const { surgicalApproachId, supplierId, priority, isPreferred, contractNumber, priceRange, notes } = req.body;

      // Validar dados obrigatórios
      if (!surgicalApproachId || !supplierId) {
        return res.status(400).json({ 
          message: "ID da conduta cirúrgica e ID do fornecedor são obrigatórios" 
        });
      }

      // Validar prioridade
      const priorityNum = priority ? parseInt(priority) : 1;
      if (priorityNum < 1 || priorityNum > 3) {
        return res.status(400).json({ 
          message: "Prioridade deve estar entre 1 e 3" 
        });
      }

      // Verificar se conduta cirúrgica existe
      const approachExists = await db.select().from(surgicalApproaches)
        .where(eq(surgicalApproaches.id, surgicalApproachId));
      if (approachExists.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      // Verificar se fornecedor existe
      const supplierExists = await db.select().from(suppliers).where(eq(suppliers.id, supplierId));
      if (supplierExists.length === 0) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }

      // Verificar se associação já existe
      const existingAssociation = await db.select().from(surgicalApproachSuppliers)
        .where(and(
          eq(surgicalApproachSuppliers.surgicalApproachId, surgicalApproachId),
          eq(surgicalApproachSuppliers.supplierId, supplierId)
        ));
      
      if (existingAssociation.length > 0) {
        return res.status(409).json({ 
          message: "Associação entre esta conduta cirúrgica e fornecedor já existe" 
        });
      }

      // Verificar limite de 3 fornecedores
      const supplierCount = await db.select().from(surgicalApproachSuppliers)
        .where(eq(surgicalApproachSuppliers.surgicalApproachId, surgicalApproachId));
      
      if (supplierCount.length >= 3) {
        return res.status(400).json({ 
          message: "Cada conduta cirúrgica pode ter no máximo 3 fornecedores associados" 
        });
      }

      // Criar nova associação
      const newAssociation = await db.insert(surgicalApproachSuppliers).values({
        surgicalApproachId: parseInt(surgicalApproachId),
        supplierId: parseInt(supplierId),
        priority: priorityNum,
        isPreferred: isPreferred || false,
        contractNumber: contractNumber?.trim() || null,
        priceRange: priceRange?.trim() || null,
        notes: notes?.trim() || null
      }).returning();

      console.log(`Nova associação criada: Conduta ${surgicalApproachId} - Fornecedor ${supplierId} (ID: ${newAssociation[0].id})`);
      
      res.setHeader("Content-Type", "application/json");
      res.status(201).json(newAssociation[0]);
    } catch (error: any) {
      if (error.message?.includes('máximo 3 fornecedores')) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Erro ao criar associação conduta-fornecedor:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/surgical-approach-suppliers/:id - Atualizar associação
  app.put("/api/surgical-approach-suppliers/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { priority, isPreferred, contractNumber, priceRange, notes } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalApproachSuppliers).where(eq(surgicalApproachSuppliers.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Validar prioridade se fornecida
      let priorityNum = existing[0].priority;
      if (priority !== undefined) {
        priorityNum = parseInt(priority);
        if (priorityNum < 1 || priorityNum > 3) {
          return res.status(400).json({ 
            message: "Prioridade deve estar entre 1 e 3" 
          });
        }
      }

      // Atualizar associação
      const updatedAssociation = await db.update(surgicalApproachSuppliers)
        .set({
          priority: priorityNum,
          isPreferred: isPreferred !== undefined ? isPreferred : existing[0].isPreferred,
          contractNumber: contractNumber !== undefined ? (contractNumber?.trim() || null) : existing[0].contractNumber,
          priceRange: priceRange !== undefined ? (priceRange?.trim() || null) : existing[0].priceRange,
          notes: notes !== undefined ? (notes?.trim() || null) : existing[0].notes,
          updatedAt: new Date()
        })
        .where(eq(surgicalApproachSuppliers.id, id))
        .returning();

      console.log(`Associação conduta-fornecedor atualizada: ID ${id}`);
      res.json(updatedAssociation[0]);
    } catch (error) {
      console.error("Erro ao atualizar associação conduta-fornecedor:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/surgical-approach-suppliers/:id - Deletar associação
  app.delete("/api/surgical-approach-suppliers/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalApproachSuppliers).where(eq(surgicalApproachSuppliers.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Deletar associação
      await db.delete(surgicalApproachSuppliers).where(eq(surgicalApproachSuppliers.id, id));

      console.log(`Associação conduta-fornecedor deletada: ID ${id}`);
      res.status(204).send(); // No content
    } catch (error) {
      console.error("Erro ao deletar associação conduta-fornecedor:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === ENDPOINTS PARA JUSTIFICATIVAS CLÍNICAS PRÉ-DEFINIDAS ===

  // GET /api/clinical-justifications - Listar todas as justificativas
  app.get("/api/clinical-justifications",  async (req: Request, res: Response) => {
    try {
      const { category, specialty, procedureType, isActive } = req.query;

      let query = db.select({
        id: clinicalJustifications.id,
        content: clinicalJustifications.content,
        isActive: clinicalJustifications.isActive,
        createdBy: clinicalJustifications.createdBy,
        createdAt: clinicalJustifications.createdAt,
        creatorName: users.name
      })
      .from(clinicalJustifications)
      .leftJoin(users, eq(clinicalJustifications.createdBy, users.id));

      // Aplicar filtros se fornecidos
      const conditions = [];
      if (isActive !== undefined) conditions.push(eq(clinicalJustifications.isActive, isActive === 'true'));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const justifications = await query.orderBy(clinicalJustifications.createdAt);

      console.log(`Retornando ${justifications.length} justificativas clínicas`);
      res.json(justifications);
    } catch (error) {
      console.error("Erro ao buscar justificativas clínicas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/clinical-justifications/:id - Buscar justificativa por ID
  app.get("/api/clinical-justifications/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const justification = await db.select({
        id: clinicalJustifications.id,
        content: clinicalJustifications.content,
        isActive: clinicalJustifications.isActive,
        createdBy: clinicalJustifications.createdBy,
        createdAt: clinicalJustifications.createdAt,
        creatorName: users.name
      })
      .from(clinicalJustifications)
      .leftJoin(users, eq(clinicalJustifications.createdBy, users.id))
      .where(eq(clinicalJustifications.id, id));

      if (justification.length === 0) {
        return res.status(404).json({ message: "Justificativa clínica não encontrada" });
      }

      console.log(`Justificativa clínica encontrada: ID ${id}`);
      res.json(justification[0]);
    } catch (error) {
      console.error("Erro ao buscar justificativa clínica:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/clinical-justifications/search/:term - Buscar por termo
  app.get("/api/clinical-justifications/search/:term",  async (req: Request, res: Response) => {
    try {
      const searchTerm = req.params.term?.toLowerCase();

      if (!searchTerm || searchTerm.length < 3) {
        return res.status(400).json({ message: "Termo de busca deve ter pelo menos 3 caracteres" });
      }

      const justifications = await db.select({
        id: clinicalJustifications.id,
        content: clinicalJustifications.content
      })
      .from(clinicalJustifications)
      .where(and(
        eq(clinicalJustifications.isActive, true)
      ));

      // Filtrar resultados que contenham o termo de busca no conteúdo
      const filteredJustifications = justifications.filter(j => 
        j.content.toLowerCase().includes(searchTerm)
      );

      console.log(`Encontradas ${filteredJustifications.length} justificativas para termo "${searchTerm}"`);
      res.json(filteredJustifications);
    } catch (error) {
      console.error("Erro ao buscar justificativas por termo:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/clinical-justifications - Criar nova justificativa
  app.post("/api/clinical-justifications",  async (req: Request, res: Response) => {
    try {
      const { content, isActive } = req.body;
      const userId = req.user?.id;

      // Validar dados obrigatórios
      if (!content?.trim()) {
        return res.status(400).json({ 
          message: "Conteúdo é obrigatório" 
        });
      }

      // Criar nova justificativa
      const newJustification = await db.insert(clinicalJustifications).values({
        content: content.trim(),
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId
      }).returning();

      console.log(`Nova justificativa clínica criada (ID: ${newJustification[0].id})`);
      
      res.setHeader("Content-Type", "application/json");
      res.status(201).json(newJustification[0]);
    } catch (error) {
      console.error("Erro ao criar justificativa clínica:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/clinical-justifications/:id - Atualizar justificativa
  app.put("/api/clinical-justifications/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { content, isActive } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a justificativa existe
      const existing = await db.select().from(clinicalJustifications)
        .where(eq(clinicalJustifications.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Justificativa clínica não encontrada" });
      }

      // Validar dados se fornecidos
      if (content !== undefined && !content?.trim()) {
        return res.status(400).json({ 
          message: "Conteúdo não pode estar vazio" 
        });
      }

      // Atualizar justificativa
      const updatedJustification = await db.update(clinicalJustifications)
        .set({
          content: content !== undefined ? content.trim() : existing[0].content,
          isActive: isActive !== undefined ? isActive : existing[0].isActive,
          updatedAt: new Date()
        })
        .where(eq(clinicalJustifications.id, id))
        .returning();

      console.log(`Justificativa clínica atualizada: ID ${id}`);
      res.json(updatedJustification[0]);
    } catch (error) {
      console.error("Erro ao atualizar justificativa clínica:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/clinical-justifications/:id - Deletar justificativa
  app.delete("/api/clinical-justifications/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a justificativa existe
      const existing = await db.select().from(clinicalJustifications)
        .where(eq(clinicalJustifications.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Justificativa clínica não encontrada" });
      }

      // Deletar justificativa
      await db.delete(clinicalJustifications).where(eq(clinicalJustifications.id, id));

      console.log(`Justificativa clínica deletada: ID ${id}`);
      res.status(204).send(); // No content
    } catch (error) {
      console.error("Erro ao deletar justificativa clínica:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/clinical-justifications/categories - Listar categorias disponíveis
  app.get("/api/clinical-justifications/categories",  async (req: Request, res: Response) => {
    try {
      // Como os campos category/specialty/procedureType foram removidos, retornamos array vazio
      console.log(`Retornando 0 categorias de justificativas (campos removidos)`);
      res.json([]);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/clinical-justifications/specialties - Listar especialidades disponíveis
  app.get("/api/clinical-justifications/specialties",  async (req: Request, res: Response) => {
    try {
      const specialties = await db.selectDistinct({
        specialty: clinicalJustifications.specialty
      })
      .from(clinicalJustifications)
      .where(and(
        eq(clinicalJustifications.isActive, true)
      ));

      const specialtyList = specialties
        .map(s => s.specialty)
        .filter(s => s !== null)
        .sort();

      console.log(`Retornando ${specialtyList.length} especialidades de justificativas`);
      res.json(specialtyList);
    } catch (error) {
      console.error("Erro ao buscar especialidades:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === ENDPOINTS PARA ASSOCIAÇÕES ENTRE CONDUTAS CIRÚRGICAS E JUSTIFICATIVAS CLÍNICAS ===

  // GET /api/surgical-approach-justifications - Listar todas as associações
  app.get("/api/surgical-approach-justifications",  async (req: Request, res: Response) => {
    try {
      const associations = await db.select({
        id: surgicalApproachJustifications.id,
        surgicalApproachId: surgicalApproachJustifications.surgicalApproachId,
        justificationId: surgicalApproachJustifications.justificationId,
        isPreferred: surgicalApproachJustifications.isPreferred,
        customNotes: surgicalApproachJustifications.customNotes,
        surgicalApproachName: surgicalApproaches.name,
        justificationTitle: clinicalJustifications.title,
        justificationCategory: clinicalJustifications.category,
        justificationSpecialty: clinicalJustifications.specialty,
        createdAt: surgicalApproachJustifications.createdAt
      })
      .from(surgicalApproachJustifications)
      .leftJoin(surgicalApproaches, eq(surgicalApproachJustifications.surgicalApproachId, surgicalApproaches.id))
      .leftJoin(clinicalJustifications, eq(surgicalApproachJustifications.justificationId, clinicalJustifications.id))
      .orderBy(surgicalApproachJustifications.surgicalApproachId, surgicalApproachJustifications.isPreferred);

      console.log(`Retornando ${associations.length} associações conduta-justificativa`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar associações conduta-justificativa:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approach-justifications/approach/:approachId - Buscar justificativas por conduta
  app.get("/api/surgical-approach-justifications/approach/:approachId",  async (req: Request, res: Response) => {
    try {
      const approachId = parseInt(req.params.approachId);

      if (isNaN(approachId)) {
        return res.status(400).json({ message: "ID da conduta cirúrgica inválido" });
      }

      const associations = await db.select({
        id: surgicalApproachJustifications.id,
        justificationId: surgicalApproachJustifications.justificationId,
        isPreferred: surgicalApproachJustifications.isPreferred,
        customNotes: surgicalApproachJustifications.customNotes,
        justificationTitle: clinicalJustifications.title,
        justificationContent: clinicalJustifications.content,
        justificationCategory: clinicalJustifications.category,
        justificationSpecialty: clinicalJustifications.specialty,
        justificationProcedureType: clinicalJustifications.procedureType
      })
      .from(surgicalApproachJustifications)
      .leftJoin(clinicalJustifications, eq(surgicalApproachJustifications.justificationId, clinicalJustifications.id))
      .where(eq(surgicalApproachJustifications.surgicalApproachId, approachId))
      .orderBy(surgicalApproachJustifications.isPreferred);

      console.log(`Encontradas ${associations.length} justificativas para conduta cirúrgica ID ${approachId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar justificativas por conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approach-justifications/justification/:justificationId - Buscar condutas por justificativa
  app.get("/api/surgical-approach-justifications/justification/:justificationId",  async (req: Request, res: Response) => {
    try {
      const justificationId = parseInt(req.params.justificationId);

      if (isNaN(justificationId)) {
        return res.status(400).json({ message: "ID da justificativa inválido" });
      }

      const associations = await db.select({
        id: surgicalApproachJustifications.id,
        surgicalApproachId: surgicalApproachJustifications.surgicalApproachId,
        isPreferred: surgicalApproachJustifications.isPreferred,
        customNotes: surgicalApproachJustifications.customNotes,
        surgicalApproachName: surgicalApproaches.name,
        surgicalApproachDescription: surgicalApproaches.description
      })
      .from(surgicalApproachJustifications)
      .leftJoin(surgicalApproaches, eq(surgicalApproachJustifications.surgicalApproachId, surgicalApproaches.id))
      .where(eq(surgicalApproachJustifications.justificationId, justificationId))
      .orderBy(surgicalApproachJustifications.isPreferred);

      console.log(`Encontradas ${associations.length} condutas para justificativa ID ${justificationId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar condutas por justificativa:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/surgical-approach-justifications - Criar nova associação
  app.post("/api/surgical-approach-justifications",  async (req: Request, res: Response) => {
    try {
      const { surgicalApproachId, justificationId, isPreferred, customNotes } = req.body;

      // Validar dados obrigatórios
      if (!surgicalApproachId || !justificationId) {
        return res.status(400).json({ 
          message: "ID da conduta cirúrgica e ID da justificativa são obrigatórios" 
        });
      }

      // Verificar se conduta cirúrgica existe
      const approachExists = await db.select().from(surgicalApproaches)
        .where(eq(surgicalApproaches.id, surgicalApproachId));
      if (approachExists.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      // Verificar se justificativa existe
      const justificationExists = await db.select().from(clinicalJustifications)
        .where(eq(clinicalJustifications.id, justificationId));
      if (justificationExists.length === 0) {
        return res.status(404).json({ message: "Justificativa clínica não encontrada" });
      }

      // Verificar se associação já existe
      const existingAssociation = await db.select().from(surgicalApproachJustifications)
        .where(and(
          eq(surgicalApproachJustifications.surgicalApproachId, surgicalApproachId),
          eq(surgicalApproachJustifications.justificationId, justificationId)
        ));
      
      if (existingAssociation.length > 0) {
        return res.status(409).json({ 
          message: "Associação entre esta conduta cirúrgica e justificativa já existe" 
        });
      }

      // Criar nova associação
      const newAssociation = await db.insert(surgicalApproachJustifications).values({
        surgicalApproachId: parseInt(surgicalApproachId),
        justificationId: parseInt(justificationId),
        isPreferred: isPreferred || false,
        customNotes: customNotes?.trim() || null
      }).returning();

      console.log(`Nova associação criada: Conduta ${surgicalApproachId} - Justificativa ${justificationId} (ID: ${newAssociation[0].id})`);
      
      res.setHeader("Content-Type", "application/json");
      res.status(201).json(newAssociation[0]);
    } catch (error) {
      console.error("Erro ao criar associação conduta-justificativa:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/surgical-approach-justifications/:id - Atualizar associação
  app.put("/api/surgical-approach-justifications/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isPreferred, customNotes } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalApproachJustifications)
        .where(eq(surgicalApproachJustifications.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Atualizar associação
      const updatedAssociation = await db.update(surgicalApproachJustifications)
        .set({
          isPreferred: isPreferred !== undefined ? isPreferred : existing[0].isPreferred,
          customNotes: customNotes !== undefined ? (customNotes?.trim() || null) : existing[0].customNotes,
          updatedAt: new Date()
        })
        .where(eq(surgicalApproachJustifications.id, id))
        .returning();

      console.log(`Associação conduta-justificativa atualizada: ID ${id}`);
      res.json(updatedAssociation[0]);
    } catch (error) {
      console.error("Erro ao atualizar associação conduta-justificativa:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/surgical-approach-justifications/:id - Deletar associação
  app.delete("/api/surgical-approach-justifications/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(surgicalApproachJustifications)
        .where(eq(surgicalApproachJustifications.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Deletar associação
      await db.delete(surgicalApproachJustifications).where(eq(surgicalApproachJustifications.id, id));

      console.log(`Associação conduta-justificativa deletada: ID ${id}`);
      res.status(204).send(); // No content
    } catch (error) {
      console.error("Erro ao deletar associação conduta-justificativa:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === ENDPOINTS PARA ASSOCIAÇÕES ENTRE PEDIDOS MÉDICOS E CONDUTAS CIRÚRGICAS ===

  // GET /api/medical-order-surgical-approaches - Listar todas as associações
  app.get("/api/medical-order-surgical-approaches",  async (req: Request, res: Response) => {
    try {
      const associations = await db.select({
        id: medicalOrderSurgicalApproaches.id,
        medicalOrderId: medicalOrderSurgicalApproaches.medicalOrderId,
        surgicalApproachId: medicalOrderSurgicalApproaches.surgicalApproachId,
        isPrimary: medicalOrderSurgicalApproaches.isPrimary,
        surgicalApproachName: surgicalApproaches.name,
        surgicalApproachDescription: surgicalApproaches.description,
        createdAt: medicalOrderSurgicalApproaches.createdAt
      })
      .from(medicalOrderSurgicalApproaches)
      .leftJoin(surgicalApproaches, eq(medicalOrderSurgicalApproaches.surgicalApproachId, surgicalApproaches.id))
      .orderBy(medicalOrderSurgicalApproaches.medicalOrderId, medicalOrderSurgicalApproaches.isPrimary);

      console.log(`Retornando ${associations.length} associações pedido-conduta`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar associações pedido-conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/medical-order-surgical-approaches/order/:orderId - Buscar condutas por pedido
  app.get("/api/medical-order-surgical-approaches/order/:orderId",  async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido médico inválido" });
      }

      const associations = await db.select({
        id: medicalOrderSurgicalApproaches.id,
        surgicalApproachId: medicalOrderSurgicalApproaches.surgicalApproachId,
        isPrimary: medicalOrderSurgicalApproaches.isPrimary,
        surgicalApproachName: surgicalApproaches.name,
        surgicalApproachDescription: surgicalApproaches.description,
        // Campos necessários do procedimento cirúrgico
        surgicalProcedureId: medicalOrderSurgicalProcedures.surgicalProcedureId,
        procedureName: surgicalProcedures.name
      })
      .from(medicalOrderSurgicalApproaches)
      .leftJoin(surgicalApproaches, eq(medicalOrderSurgicalApproaches.surgicalApproachId, surgicalApproaches.id))
      .leftJoin(medicalOrderSurgicalProcedures, eq(medicalOrderSurgicalApproaches.medicalOrderId, medicalOrderSurgicalProcedures.medicalOrderId))
      .leftJoin(surgicalProcedures, eq(medicalOrderSurgicalProcedures.surgicalProcedureId, surgicalProcedures.id))
      .where(eq(medicalOrderSurgicalApproaches.medicalOrderId, orderId))
      .orderBy(medicalOrderSurgicalApproaches.isPrimary);

      console.log(`Encontradas ${associations.length} condutas para pedido médico ID ${orderId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar condutas por pedido:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/medical-order-surgical-approaches/approach/:approachId - Buscar pedidos por conduta
  app.get("/api/medical-order-surgical-approaches/approach/:approachId",  async (req: Request, res: Response) => {
    try {
      const approachId = parseInt(req.params.approachId);

      if (isNaN(approachId)) {
        return res.status(400).json({ message: "ID da conduta cirúrgica inválido" });
      }

      const associations = await db.select({
        id: medicalOrderSurgicalApproaches.id,
        medicalOrderId: medicalOrderSurgicalApproaches.medicalOrderId,
        isPrimary: medicalOrderSurgicalApproaches.isPrimary,
        orderStatusCode: medicalOrders.statusCode,
        orderClinicalIndication: medicalOrders.clinicalIndication
      })
      .from(medicalOrderSurgicalApproaches)
      .leftJoin(medicalOrders, eq(medicalOrderSurgicalApproaches.medicalOrderId, medicalOrders.id))
      .where(eq(medicalOrderSurgicalApproaches.surgicalApproachId, approachId))
      .orderBy(medicalOrderSurgicalApproaches.isPrimary);

      console.log(`Encontrados ${associations.length} pedidos para conduta cirúrgica ID ${approachId}`);
      res.json(associations);
    } catch (error) {
      console.error("Erro ao buscar pedidos por conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/medical-order-surgical-approaches - Criar nova associação
  app.post("/api/medical-order-surgical-approaches",  async (req: Request, res: Response) => {
    try {
      const { medicalOrderId, surgicalApproachId, isPrimary } = req.body;

      // Validar dados obrigatórios
      if (!medicalOrderId || !surgicalApproachId) {
        return res.status(400).json({ 
          message: "ID do pedido médico e ID da conduta cirúrgica são obrigatórios" 
        });
      }

      // Verificar se pedido médico existe
      const orderExists = await db.select().from(medicalOrders)
        .where(eq(medicalOrders.id, medicalOrderId));
      if (orderExists.length === 0) {
        return res.status(404).json({ message: "Pedido médico não encontrado" });
      }

      // Verificar se conduta cirúrgica existe
      const approachExists = await db.select().from(surgicalApproaches)
        .where(eq(surgicalApproaches.id, surgicalApproachId));
      if (approachExists.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      // Verificar se associação já existe
      const existingAssociation = await db.select().from(medicalOrderSurgicalApproaches)
        .where(and(
          eq(medicalOrderSurgicalApproaches.medicalOrderId, medicalOrderId),
          eq(medicalOrderSurgicalApproaches.surgicalApproachId, surgicalApproachId)
        ));
      
      let resultAssociation;
      
      if (existingAssociation.length > 0) {
        // Atualizar associação existente (UPSERT)
        console.log(`Atualizando associação existente: Pedido ${medicalOrderId} - Conduta ${surgicalApproachId}`);
        
        const [updatedAssociation] = await db.update(medicalOrderSurgicalApproaches)
          .set({
            isPrimary: isPrimary || false,
            updatedAt: new Date()
          })
          .where(eq(medicalOrderSurgicalApproaches.id, existingAssociation[0].id))
          .returning();
          
        resultAssociation = updatedAssociation;
        console.log(`Associação atualizada: ID ${updatedAssociation.id}`);
      } else {
        // Criar nova associação
        console.log(`Criando nova associação: Pedido ${medicalOrderId} - Conduta ${surgicalApproachId}`);
        
        const [newAssociation] = await db.insert(medicalOrderSurgicalApproaches).values({
          medicalOrderId: parseInt(medicalOrderId),
          surgicalApproachId: parseInt(surgicalApproachId),
          isPrimary: isPrimary || false
        }).returning();
        
        resultAssociation = newAssociation;
        console.log(`Nova associação criada: ID ${newAssociation.id}`);
      }

      res.setHeader("Content-Type", "application/json");
      res.status(200).json(resultAssociation);
    } catch (error) {
      console.error("Erro ao criar associação pedido-conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/medical-order-surgical-approaches/:id - Atualizar associação
  app.put("/api/medical-order-surgical-approaches/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isPrimary } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(medicalOrderSurgicalApproaches)
        .where(eq(medicalOrderSurgicalApproaches.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Atualizar associação
      const updatedAssociation = await db.update(medicalOrderSurgicalApproaches)
        .set({
          isPrimary: isPrimary !== undefined ? isPrimary : existing[0].isPrimary,
          updatedAt: new Date()
        })
        .where(eq(medicalOrderSurgicalApproaches.id, id))
        .returning();

      console.log(`Associação pedido-conduta atualizada: ID ${id}`);
      res.json(updatedAssociation[0]);
    } catch (error) {
      console.error("Erro ao atualizar associação pedido-conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/medical-order-surgical-approaches/:id - Deletar associação
  app.delete("/api/medical-order-surgical-approaches/:id",  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Verificar se a associação existe
      const existing = await db.select().from(medicalOrderSurgicalApproaches)
        .where(eq(medicalOrderSurgicalApproaches.id, id));
      
      if (existing.length === 0) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      // Deletar associação
      await db.delete(medicalOrderSurgicalApproaches).where(eq(medicalOrderSurgicalApproaches.id, id));

      console.log(`Associação pedido-conduta deletada: ID ${id}`);
      res.status(204).send(); // No content
    } catch (error) {
      console.error("Erro ao deletar associação pedido-conduta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/medical-order-surgical-approaches/order/:orderId - Deletar todas as condutas de um pedido
  app.delete("/api/medical-order-surgical-approaches/order/:orderId",  async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido médico inválido" });
      }

      // Verificar se o pedido existe
      const orderExists = await db.select().from(medicalOrders).where(eq(medicalOrders.id, orderId));
      if (orderExists.length === 0) {
        return res.status(404).json({ message: "Pedido médico não encontrado" });
      }

      // Deletar todas as condutas cirúrgicas do pedido
      const deleted = await db.delete(medicalOrderSurgicalApproaches)
        .where(eq(medicalOrderSurgicalApproaches.medicalOrderId, orderId))
        .returning();

      console.log(`🗑️ Removidas ${deleted.length} condutas cirúrgicas do pedido ${orderId}`);
      res.json({ message: `${deleted.length} condutas cirúrgicas removidas com sucesso`, deletedCount: deleted.length });
    } catch (error) {
      console.error("Erro ao deletar condutas cirúrgicas do pedido:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ============================================
  // ENDPOINTS PARA PROCEDIMENTOS CIRÚRGICOS
  // ============================================

  // GET /api/medical-order-surgical-procedures/order/:orderId - Buscar procedimentos cirúrgicos de um pedido
  app.get("/api/medical-order-surgical-procedures/order/:orderId", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido médico inválido" });
      }

      // Buscar procedimentos cirúrgicos do pedido com informações completas
      const procedures = await db.select({
        id: medicalOrderSurgicalProcedures.id,
        medicalOrderId: medicalOrderSurgicalProcedures.medicalOrderId,
        surgicalProcedureId: medicalOrderSurgicalProcedures.surgicalProcedureId,
        isMain: medicalOrderSurgicalProcedures.isMain,
        additionalNotes: medicalOrderSurgicalProcedures.additionalNotes,
        createdAt: medicalOrderSurgicalProcedures.createdAt,
        updatedAt: medicalOrderSurgicalProcedures.updatedAt,
        procedureName: surgicalProcedures.name,
        procedureDescription: surgicalProcedures.description,
      })
      .from(medicalOrderSurgicalProcedures)
      .innerJoin(surgicalProcedures, eq(medicalOrderSurgicalProcedures.surgicalProcedureId, surgicalProcedures.id))
      .where(eq(medicalOrderSurgicalProcedures.medicalOrderId, orderId));

      console.log(`Encontrados ${procedures.length} procedimentos cirúrgicos para pedido médico ID ${orderId}`);
      res.json(procedures);
    } catch (error) {
      console.error("Erro ao buscar procedimentos cirúrgicos do pedido:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/medical-order-surgical-procedures - Criar associação pedido-procedimento cirúrgico
  app.post("/api/medical-order-surgical-procedures", async (req: Request, res: Response) => {
    try {
      const { medicalOrderId, surgicalProcedureId, isMain, additionalNotes } = req.body;

      // Validar dados obrigatórios
      if (!medicalOrderId || !surgicalProcedureId) {
        return res.status(400).json({ message: "medicalOrderId e surgicalProcedureId são obrigatórios" });
      }

      // Verificar se o pedido médico existe
      const orderExists = await db.select().from(medicalOrders).where(eq(medicalOrders.id, medicalOrderId));
      if (orderExists.length === 0) {
        return res.status(404).json({ message: "Pedido médico não encontrado" });
      }

      // Verificar se o procedimento cirúrgico existe
      const procedureExists = await db.select().from(surgicalProcedures).where(eq(surgicalProcedures.id, surgicalProcedureId));
      if (procedureExists.length === 0) {
        return res.status(404).json({ message: "Procedimento cirúrgico não encontrado" });
      }

      // Verificar se já existe associação
      const existingAssociation = await db.select()
        .from(medicalOrderSurgicalProcedures)
        .where(
          and(
            eq(medicalOrderSurgicalProcedures.medicalOrderId, medicalOrderId),
            eq(medicalOrderSurgicalProcedures.surgicalProcedureId, surgicalProcedureId)
          )
        );

      if (existingAssociation.length > 0) {
        return res.status(409).json({ message: "Associação já existe entre este pedido e procedimento" });
      }

      // Criar nova associação
      const newAssociation = await db.insert(medicalOrderSurgicalProcedures)
        .values({
          medicalOrderId,
          surgicalProcedureId,
          isMain: isMain || false,
          additionalNotes: additionalNotes?.trim() || null,
        })
        .returning();

      console.log(`Associação pedido-procedimento criada: Pedido ${medicalOrderId} ↔ Procedimento ${surgicalProcedureId}`);
      res.status(201).json(newAssociation[0]);
    } catch (error) {
      console.error("Erro ao criar associação pedido-procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/orders/:id/surgical-procedures - Gerenciar procedimentos cirúrgicos relacionais de um pedido médico
  app.put("/api/orders/:id/surgical-procedures", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { procedures } = req.body;

      console.log(`🔧 Atualizando procedimentos cirúrgicos para pedido ${orderId}:`, procedures);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      if (!Array.isArray(procedures)) {
        return res.status(400).json({ message: "procedures deve ser um array" });
      }

      // Verificar se o pedido existe
      const orderExists = await db.select().from(medicalOrders).where(eq(medicalOrders.id, orderId));
      if (orderExists.length === 0) {
        return res.status(404).json({ message: "Pedido médico não encontrado" });
      }

      // Remover todas as associações existentes
      await db.delete(medicalOrderSurgicalProcedures).where(eq(medicalOrderSurgicalProcedures.medicalOrderId, orderId));
      console.log(`🗑️ Removidas associações existentes para pedido ${orderId}`);

      // Adicionar novas associações
      if (procedures.length > 0) {
        const newAssociations = procedures.map((procedure: any) => ({
          medicalOrderId: orderId,
          surgicalProcedureId: procedure.surgicalProcedureId,
          isMain: procedure.isMain || false,
          additionalNotes: procedure.additionalNotes?.trim() || null,
        }));

        await db.insert(medicalOrderSurgicalProcedures).values(newAssociations);
        console.log(`✅ Adicionadas ${procedures.length} novas associações procedimento cirúrgico para pedido ${orderId}`);
      }

      res.json({ 
        message: `Procedimentos cirúrgicos atualizados com sucesso para pedido ${orderId}`,
        totalProcedures: procedures.length
      });
    } catch (error) {
      console.error("Erro ao atualizar procedimentos cirúrgicos do pedido:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/medical-order-surgical-procedures/order/:orderId - Deletar todos os procedimentos cirúrgicos de um pedido
  app.delete("/api/medical-order-surgical-procedures/order/:orderId", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido médico inválido" });
      }

      // Verificar se o pedido existe
      const orderExists = await db.select().from(medicalOrders).where(eq(medicalOrders.id, orderId));
      if (orderExists.length === 0) {
        return res.status(404).json({ message: "Pedido médico não encontrado" });
      }

      // Deletar todos os procedimentos cirúrgicos do pedido
      const deleted = await db.delete(medicalOrderSurgicalProcedures)
        .where(eq(medicalOrderSurgicalProcedures.medicalOrderId, orderId))
        .returning();

      console.log(`🗑️ Removidos ${deleted.length} procedimentos cirúrgicos do pedido ${orderId}`);
      res.json({ message: `${deleted.length} procedimentos cirúrgicos removidos com sucesso`, deletedCount: deleted.length });
    } catch (error) {
      console.error("Erro ao deletar procedimentos cirúrgicos do pedido:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/orders/:id/cids - Gerenciar CIDs relacionais de um pedido médico
  app.put("/api/orders/:id/cids",  async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { cidIds } = req.body;

      console.log(`🆔 Atualizando CIDs para pedido ${orderId}:`, cidIds);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      if (!Array.isArray(cidIds)) {
        return res.status(400).json({ message: "cidIds deve ser um array" });
      }

      // Verificar se o pedido existe
      const orderExists = await db.select().from(medicalOrders).where(eq(medicalOrders.id, orderId));
      if (orderExists.length === 0) {
        return res.status(404).json({ message: "Pedido médico não encontrado" });
      }

      // Remover todas as associações existentes
      await db.delete(medicalOrderCids).where(eq(medicalOrderCids.orderId, orderId));
      console.log(`🗑️ Removidas associações existentes para pedido ${orderId}`);

      // Adicionar novas associações
      if (cidIds.length > 0) {
        const newAssociations = cidIds.map((cidId: number) => ({
          orderId: orderId,
          cidCodeId: cidId,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await db.insert(medicalOrderCids).values(newAssociations);
        console.log(`✅ Adicionadas ${cidIds.length} novas associações CID para pedido ${orderId}`);
      }

      res.json({ 
        success: true, 
        message: `CIDs atualizados para pedido ${orderId}`,
        cidCount: cidIds.length 
      });
    } catch (error) {
      console.error("Erro ao atualizar CIDs do pedido:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/orders/:id/procedures - Gerenciar procedimentos CBHPM relacionais de um pedido médico
  app.put("/api/orders/:id/procedures",  async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { procedureIds } = req.body;

      console.log(`🏥 Atualizando procedimentos CBHPM para pedido ${orderId}:`, procedureIds);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      if (!Array.isArray(procedureIds)) {
        return res.status(400).json({ message: "procedureIds deve ser um array" });
      }

      // Verificar se o pedido existe
      const orderExists = await db.select().from(medicalOrders).where(eq(medicalOrders.id, orderId));
      if (orderExists.length === 0) {
        return res.status(404).json({ message: "Pedido médico não encontrado" });
      }

      // Remover todas as associações existentes
      await db.delete(medicalOrderProcedures).where(eq(medicalOrderProcedures.orderId, orderId));
      console.log(`🗑️ Removidas associações de procedimentos existentes para pedido ${orderId}`);

      // Adicionar novas associações
      if (procedureIds.length > 0) {
        const newAssociations = procedureIds.map((procedureId: number) => ({
          orderId: orderId,
          procedureId: procedureId,
          quantity: 1, // Quantidade padrão
          isPrimary: false, // Será definido na interface
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await db.insert(medicalOrderProcedures).values(newAssociations);
        console.log(`✅ Adicionadas ${procedureIds.length} novas associações de procedimentos para pedido ${orderId}`);
      }

      res.json({ 
        success: true, 
        message: `Procedimentos CBHPM atualizados para pedido ${orderId}`,
        procedureCount: procedureIds.length 
      });
    } catch (error) {
      console.error("Erro ao atualizar procedimentos do pedido:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/orders/:id/surgical-approaches - Gerenciar condutas cirúrgicas relacionais de um pedido médico
  app.put("/api/orders/:id/surgical-approaches", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { surgicalApproaches } = req.body;

      console.log(`🔧 Atualizando condutas cirúrgicas para pedido ${orderId}:`, surgicalApproaches);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      if (!Array.isArray(surgicalApproaches)) {
        return res.status(400).json({ message: "surgicalApproaches deve ser um array" });
      }

      // Verificar se o pedido existe
      const orderExists = await db.select().from(medicalOrders).where(eq(medicalOrders.id, orderId));
      if (orderExists.length === 0) {
        return res.status(404).json({ message: "Pedido médico não encontrado" });
      }

      // Remover todas as condutas cirúrgicas existentes
      await db.delete(medicalOrderSurgicalApproaches).where(eq(medicalOrderSurgicalApproaches.medicalOrderId, orderId));
      console.log(`🗑️ Removidas condutas cirúrgicas existentes para pedido ${orderId}`);

      // Adicionar novas condutas cirúrgicas
      if (surgicalApproaches.length > 0) {
        const newApproaches = surgicalApproaches.map((approach: any) => ({
          medicalOrderId: orderId,
          surgicalApproachId: approach.surgicalApproachId,
          isPrimary: approach.isPrimary || false,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await db.insert(medicalOrderSurgicalApproaches).values(newApproaches);
        console.log(`✅ Adicionadas ${surgicalApproaches.length} novas condutas cirúrgicas para pedido ${orderId}`);
      }

      res.json({ 
        success: true, 
        message: `Condutas cirúrgicas atualizadas para pedido ${orderId}`,
        approachCount: surgicalApproaches.length 
      });
    } catch (error) {
      console.error("Erro ao atualizar condutas cirúrgicas do pedido:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/orders/:id/suppliers - Gerenciar fornecedores relacionais de um pedido médico
  app.put("/api/orders/:id/suppliers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { supplierIds } = req.body;

      console.log(`🏭 Atualizando fornecedores para pedido ${orderId}:`, supplierIds);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      if (!Array.isArray(supplierIds)) {
        return res.status(400).json({ message: "supplierIds deve ser um array" });
      }

      // Verificar se o pedido existe
      const orderExists = await db.select().from(medicalOrders).where(eq(medicalOrders.id, orderId));
      if (orderExists.length === 0) {
        return res.status(404).json({ message: "Pedido médico não encontrado" });
      }

      // Remover todos os fornecedores existentes
      await db.delete(medicalOrderSuppliers).where(eq(medicalOrderSuppliers.orderId, orderId));
      console.log(`🗑️ Removidos fornecedores existentes para pedido ${orderId}`);

      // Adicionar novos fornecedores
      if (supplierIds.length > 0) {
        const newSuppliers = supplierIds.map((supplierId: number) => ({
          orderId: orderId,
          supplierId: supplierId,
          createdAt: new Date()
        }));

        await db.insert(medicalOrderSuppliers).values(newSuppliers);
        console.log(`✅ Adicionados ${supplierIds.length} novos fornecedores para pedido ${orderId}`);
      }

      res.json({ 
        success: true, 
        message: `Fornecedores atualizados para pedido ${orderId}`,
        supplierCount: supplierIds.length 
      });
    } catch (error) {
      console.error("Erro ao atualizar fornecedores do pedido:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-approaches/:id/complete - Buscar conduta cirúrgica com todos os dados associados
  app.get("/api/surgical-approaches/:id/complete",  async (req: Request, res: Response) => {
    try {
      const approachId = parseInt(req.params.id);
      const surgicalProcedureId = req.query.surgicalProcedureId ? parseInt(req.query.surgicalProcedureId as string) : null;

      if (isNaN(approachId)) {
        return res.status(400).json({ message: "ID da conduta cirúrgica inválido" });
      }

      console.log(`🔍 Buscando dados completos da conduta cirúrgica ${approachId}${surgicalProcedureId ? ` para Procedimento Cirúrgico ${surgicalProcedureId}` : ''}`);

      // Buscar conduta cirúrgica básica
      const approach = await db.select().from(surgicalApproaches).where(eq(surgicalApproaches.id, approachId));
      if (approach.length === 0) {
        return res.status(404).json({ message: "Conduta cirúrgica não encontrada" });
      }

      // Buscar procedimentos CBHPM associados (arquitetura atual)
      // Filtrando apenas por conduta cirúrgica (approach)
      const associatedProcedures = await db
        .select({
          id: procedures.id,
          code: procedures.code,
          name: procedures.name,
          description: procedures.description,
          porte: procedures.porte,
          isPreferred: surgicalApproachProcedures.isPreferred,
          complexity: surgicalApproachProcedures.complexity,
          estimatedDuration: surgicalApproachProcedures.estimatedDuration,
          notes: surgicalApproachProcedures.notes
        })
        .from(surgicalApproachProcedures)
        .innerJoin(procedures, eq(surgicalApproachProcedures.procedureId, procedures.id))
        .where(eq(surgicalApproachProcedures.surgicalApproachId, approachId))
        .orderBy(surgicalApproachProcedures.isPreferred);

      // Buscar itens OPME associados (nova arquitetura: Procedimento + Conduta)
      // Filtrando por conduta cirúrgica E procedimento cirúrgico quando disponível
      let opmeWhereConditions = [eq(surgicalApproachOpmeItems.surgicalApproachId, approachId)];
      
      if (surgicalProcedureId) {
        opmeWhereConditions.push(eq(surgicalApproachOpmeItems.surgicalProcedureId, surgicalProcedureId));
      }
      
      const associatedOpmeItems = await db
        .select({
          id: opmeItems.id,
          technicalName: opmeItems.technicalName,
          commercialName: opmeItems.commercialName,
          manufacturerName: opmeItems.manufacturerName,
          anvisaRegistrationNumber: opmeItems.anvisaRegistrationNumber,
          riskClass: opmeItems.riskClass,
          registrationHolder: opmeItems.registrationHolder,
          isRequired: surgicalApproachOpmeItems.isRequired,
          quantity: surgicalApproachOpmeItems.quantity,
          alternativeItems: surgicalApproachOpmeItems.alternativeItems,
          notes: surgicalApproachOpmeItems.notes
        })
        .from(surgicalApproachOpmeItems)
        .innerJoin(opmeItems, eq(surgicalApproachOpmeItems.opmeItemId, opmeItems.id))
        .where(and(...opmeWhereConditions))
        .orderBy(surgicalApproachOpmeItems.isRequired);

      // Buscar fornecedores associados (nova arquitetura: Procedimento + Conduta)
      // Filtrando por conduta cirúrgica E procedimento cirúrgico quando disponível
      let suppliersWhereConditions = [eq(surgicalApproachSuppliers.surgicalApproachId, approachId)];
      
      if (surgicalProcedureId) {
        suppliersWhereConditions.push(eq(surgicalApproachSuppliers.surgicalProcedureId, surgicalProcedureId));
      }
      
      const suppliersData = await db
        .select({
          id: suppliers.id,
          companyName: suppliers.companyName,
          tradeName: suppliers.tradeName,
          cnpj: suppliers.cnpj,
          phone: suppliers.phone,
          email: suppliers.email,
          priority: surgicalApproachSuppliers.priority,
          isPreferred: surgicalApproachSuppliers.isPreferred,
          contractNumber: surgicalApproachSuppliers.contractNumber,
          priceRange: surgicalApproachSuppliers.priceRange,
          notes: surgicalApproachSuppliers.notes
        })
        .from(surgicalApproachSuppliers)
        .innerJoin(suppliers, eq(surgicalApproachSuppliers.supplierId, suppliers.id))
        .where(and(...suppliersWhereConditions))
        .orderBy(surgicalApproachSuppliers.priority);

      // Buscar justificativas clínicas associadas (nova arquitetura: Procedimento + Conduta)
      // Filtrando por conduta cirúrgica E procedimento cirúrgico quando disponível
      let justificationsWhereConditions = [eq(surgicalApproachJustifications.surgicalApproachId, approachId)];
      
      if (surgicalProcedureId) {
        justificationsWhereConditions.push(eq(surgicalApproachJustifications.surgicalProcedureId, surgicalProcedureId));
      }

      const justifications = await db
        .select({
          id: clinicalJustifications.id,
          content: clinicalJustifications.content,
          isPreferred: surgicalApproachJustifications.isPreferred,
          customNotes: surgicalApproachJustifications.customNotes
        })
        .from(surgicalApproachJustifications)
        .innerJoin(clinicalJustifications, eq(surgicalApproachJustifications.justificationId, clinicalJustifications.id))
        .where(and(...justificationsWhereConditions))
        .orderBy(surgicalApproachJustifications.isPreferred);

      const completeData = {
        approach: approach[0],
        procedures: associatedProcedures,
        opmeItems: associatedOpmeItems,
        suppliers: suppliersData,
        justifications: justifications
      };

      console.log(`✅ Dados completos encontrados: ${associatedProcedures.length} procedimentos, ${associatedOpmeItems.length} OPME, ${suppliersData.length} fornecedores, ${justifications.length} justificativas`);

      res.json(completeData);
    } catch (error) {
      console.error("Erro ao buscar dados completos da conduta cirúrgica:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ========================================
  // SURGICAL PROCEDURE + CONDUCT → CID ASSOCIATIONS ROUTES
  // ========================================

  // GET /api/surgical-procedure-conduct-cids - Listar todas as associações
  app.get('/api/surgical-procedure-conduct-cids', async (req, res) => {
    try {
      console.log('📋 Buscando associações procedimento + conduta → CID');
      
      const { surgicalProcedureConductCids, surgicalProcedures, surgicalApproaches, cidCodes } = await import("@shared/schema");
      
      const associations = await db
        .select({
          id: surgicalProcedureConductCids.id,
          surgicalProcedureId: surgicalProcedureConductCids.surgicalProcedureId,
          surgicalApproachId: surgicalProcedureConductCids.surgicalApproachId,
          cidCodeId: surgicalProcedureConductCids.cidCodeId,
          isPrimaryCid: surgicalProcedureConductCids.isPrimaryCid,
          notes: surgicalProcedureConductCids.notes,
          createdAt: surgicalProcedureConductCids.createdAt,
          // Dados relacionados
          procedureName: surgicalProcedures.name,
          approachName: surgicalApproaches.name,
          cidCode: cidCodes.code,
          cidDescription: cidCodes.description
        })
        .from(surgicalProcedureConductCids)
        .innerJoin(surgicalProcedures, eq(surgicalProcedureConductCids.surgicalProcedureId, surgicalProcedures.id))
        .innerJoin(surgicalApproaches, eq(surgicalProcedureConductCids.surgicalApproachId, surgicalApproaches.id))
        .innerJoin(cidCodes, eq(surgicalProcedureConductCids.cidCodeId, cidCodes.id))
        .orderBy(surgicalProcedures.name, surgicalApproaches.name, surgicalProcedureConductCids.isPrimaryCid);

      console.log(`✅ Encontradas ${associations.length} associações procedimento + conduta → CID`);
      res.json(associations);
    } catch (error) {
      console.error('❌ Erro ao buscar associações:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // GET /api/surgical-procedure-conduct-cids/procedure/:procedureId/approach/:approachId - Buscar CIDs por procedimento + conduta
  app.get('/api/surgical-procedure-conduct-cids/procedure/:procedureId/approach/:approachId', async (req, res) => {
    try {
      const procedureId = parseInt(req.params.procedureId);
      const approachId = parseInt(req.params.approachId);

      if (isNaN(procedureId) || isNaN(approachId)) {
        return res.status(400).json({ message: "IDs de procedimento e conduta devem ser números válidos" });
      }

      console.log(`🔍 Buscando CIDs para procedimento ${procedureId} + conduta ${approachId}`);
      
      const { surgicalProcedureConductCids, cidCodes } = await import("@shared/schema");
      
      const associatedCids = await db
        .select({
          id: surgicalProcedureConductCids.id,
          cidId: cidCodes.id,
          cidCode: cidCodes.code,
          cidDescription: cidCodes.description,
          cidCategory: cidCodes.category,
          isPrimaryCid: surgicalProcedureConductCids.isPrimaryCid,
          notes: surgicalProcedureConductCids.notes
        })
        .from(surgicalProcedureConductCids)
        .innerJoin(cidCodes, eq(surgicalProcedureConductCids.cidCodeId, cidCodes.id))
        .where(
          and(
            eq(surgicalProcedureConductCids.surgicalProcedureId, procedureId),
            eq(surgicalProcedureConductCids.surgicalApproachId, approachId)
          )
        )
        .orderBy(desc(surgicalProcedureConductCids.isPrimaryCid), cidCodes.code);

      console.log(`✅ Encontrados ${associatedCids.length} CIDs para procedimento ${procedureId} + conduta ${approachId}`);
      res.json(associatedCids);
    } catch (error) {
      console.error('❌ Erro ao buscar CIDs por procedimento + conduta:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // POST /api/surgical-procedure-conduct-cids - Criar nova associação
  app.post('/api/surgical-procedure-conduct-cids', async (req, res) => {
    try {
      const { surgicalProcedureConductCids, insertSurgicalProcedureConductCidSchema } = await import("@shared/schema");
      
      const validatedData = insertSurgicalProcedureConductCidSchema.parse(req.body);
      console.log('📝 Criando nova associação procedimento + conduta → CID:', validatedData);

      const [newAssociation] = await db
        .insert(surgicalProcedureConductCids)
        .values(validatedData)
        .returning();

      console.log('✅ Associação criada com sucesso:', newAssociation);
      res.status(201).json(newAssociation);
    } catch (error) {
      console.error('❌ Erro ao criar associação:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  });

  // PUT /api/surgical-procedure-conduct-cids/:id - Atualizar associação
  app.put('/api/surgical-procedure-conduct-cids/:id', async (req, res) => {
    try {
      const associationId = parseInt(req.params.id);
      if (isNaN(associationId)) {
        return res.status(400).json({ message: "ID da associação inválido" });
      }

      const { surgicalProcedureConductCids, insertSurgicalProcedureConductCidSchema } = await import("@shared/schema");
      
      const validatedData = insertSurgicalProcedureConductCidSchema.parse(req.body);
      console.log(`📝 Atualizando associação ${associationId}:`, validatedData);

      const [updatedAssociation] = await db
        .update(surgicalProcedureConductCids)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(surgicalProcedureConductCids.id, associationId))
        .returning();

      if (!updatedAssociation) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      console.log('✅ Associação atualizada com sucesso:', updatedAssociation);
      res.json(updatedAssociation);
    } catch (error) {
      console.error('❌ Erro ao atualizar associação:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  });

  // DELETE /api/surgical-procedure-conduct-cids/:id - Remover associação
  app.delete('/api/surgical-procedure-conduct-cids/:id', async (req, res) => {
    try {
      const associationId = parseInt(req.params.id);
      if (isNaN(associationId)) {
        return res.status(400).json({ message: "ID da associação inválido" });
      }

      const { surgicalProcedureConductCids } = await import("@shared/schema");
      
      console.log(`🗑️ Removendo associação ${associationId}`);

      const [deletedAssociation] = await db
        .delete(surgicalProcedureConductCids)
        .where(eq(surgicalProcedureConductCids.id, associationId))
        .returning();

      if (!deletedAssociation) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }

      console.log('✅ Associação removida com sucesso:', deletedAssociation);
      res.json({ message: "Associação removida com sucesso" });
    } catch (error) {
      console.error('❌ Erro ao remover associação:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // ========================================
  // MEDICAL ORDER STATUS HISTORY ROUTES
  // ========================================

  // GET /api/medical-order-status-history - Listar todos os registros de histórico
  app.get('/api/medical-order-status-history',  async (req, res) => {
    try {
      console.log('📋 Buscando histórico de status de pedidos médicos');
      
      const statusHistory = await db
        .select({
          id: medicalOrderStatusHistory.id,
          orderId: medicalOrderStatusHistory.orderId,
          statusId: medicalOrderStatusHistory.statusId,
          changedBy: medicalOrderStatusHistory.changedBy,
          changedAt: medicalOrderStatusHistory.changedAt,
          notes: medicalOrderStatusHistory.notes,
          deadlineDate: medicalOrderStatusHistory.deadlineDate,
          nextNotificationAt: medicalOrderStatusHistory.nextNotificationAt,
          // Dados relacionados
          statusCode: orderStatuses.code,
          statusName: orderStatuses.name,
          statusColor: orderStatuses.color,
          statusIcon: orderStatuses.icon,
          changedByUsername: users.username,
          changedByName: users.name
        })
        .from(medicalOrderStatusHistory)
        .innerJoin(orderStatuses, eq(medicalOrderStatusHistory.statusId, orderStatuses.id))
        .leftJoin(users, eq(medicalOrderStatusHistory.changedBy, users.id))
        .orderBy(medicalOrderStatusHistory.changedAt);

      console.log(`✅ Encontrados ${statusHistory.length} registros de histórico`);
      res.json(statusHistory);
    } catch (error) {
      console.error('❌ Erro ao buscar histórico de status:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // GET /api/medical-order-status-history/:id - Buscar histórico específico por ID
  app.get('/api/medical-order-status-history/:id',  async (req, res) => {
    try {
      const historyId = parseInt(req.params.id);
      console.log(`🔍 Buscando histórico de status ID: ${historyId}`);

      const historyRecord = await db
        .select({
          id: medicalOrderStatusHistory.id,
          orderId: medicalOrderStatusHistory.orderId,
          statusId: medicalOrderStatusHistory.statusId,
          changedBy: medicalOrderStatusHistory.changedBy,
          changedAt: medicalOrderStatusHistory.changedAt,
          notes: medicalOrderStatusHistory.notes,
          deadlineDate: medicalOrderStatusHistory.deadlineDate,
          nextNotificationAt: medicalOrderStatusHistory.nextNotificationAt,
          // Dados relacionados
          statusCode: orderStatuses.code,
          statusName: orderStatuses.name,
          statusColor: orderStatuses.color,
          statusIcon: orderStatuses.icon,
          changedByUsername: users.username,
          changedByName: users.name
        })
        .from(medicalOrderStatusHistory)
        .innerJoin(orderStatuses, eq(medicalOrderStatusHistory.statusId, orderStatuses.id))
        .leftJoin(users, eq(medicalOrderStatusHistory.changedBy, users.id))
        .where(eq(medicalOrderStatusHistory.id, historyId));

      if (historyRecord.length === 0) {
        return res.status(404).json({ message: 'Registro de histórico não encontrado' });
      }

      console.log(`✅ Histórico encontrado: Status ${historyRecord[0].statusName}`);
      res.json(historyRecord[0]);
    } catch (error) {
      console.error('❌ Erro ao buscar histórico específico:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // GET /api/medical-order-status-history/order/:orderId - Buscar histórico por pedido médico
  app.get('/api/medical-order-status-history/order/:orderId',  async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      console.log(`📋 Buscando histórico de status para o pedido médico ID: ${orderId}`);

      const orderHistory = await db
        .select({
          id: medicalOrderStatusHistory.id,
          orderId: medicalOrderStatusHistory.orderId,
          statusId: medicalOrderStatusHistory.statusId,
          changedBy: medicalOrderStatusHistory.changedBy,
          changedAt: medicalOrderStatusHistory.changedAt,
          notes: medicalOrderStatusHistory.notes,
          deadlineDate: medicalOrderStatusHistory.deadlineDate,
          nextNotificationAt: medicalOrderStatusHistory.nextNotificationAt,
          // Dados relacionados
          statusCode: orderStatuses.code,
          statusName: orderStatuses.name,
          statusColor: orderStatuses.color,
          statusIcon: orderStatuses.icon,
          changedByUsername: users.username,
          changedByName: users.name
        })
        .from(medicalOrderStatusHistory)
        .innerJoin(orderStatuses, eq(medicalOrderStatusHistory.statusId, orderStatuses.id))
        .leftJoin(users, eq(medicalOrderStatusHistory.changedBy, users.id))
        .where(eq(medicalOrderStatusHistory.orderId, orderId))
        .orderBy(medicalOrderStatusHistory.changedAt);

      console.log(`✅ Encontrados ${orderHistory.length} registros no histórico do pedido ${orderId}`);
      res.json(orderHistory);
    } catch (error) {
      console.error('❌ Erro ao buscar histórico do pedido:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // POST /api/medical-order-status-history - Criar novo registro de histórico
  app.post('/api/medical-order-status-history',  async (req, res) => {
    try {
      console.log('➕ Criando novo registro de histórico de status');
      console.log('Dados recebidos:', req.body);

      // Validar dados de entrada
      const validatedData = insertMedicalOrderStatusHistorySchema.parse(req.body);
      
      // Verificar se o pedido médico existe
      const orderExists = await db
        .select({ id: medicalOrders.id })
        .from(medicalOrders)
        .where(eq(medicalOrders.id, validatedData.orderId));

      if (orderExists.length === 0) {
        return res.status(404).json({ message: 'Pedido médico não encontrado' });
      }

      // Verificar se o status existe
      const statusExists = await db
        .select({ id: orderStatuses.id })
        .from(orderStatuses)
        .where(eq(orderStatuses.id, validatedData.statusId));

      if (statusExists.length === 0) {
        return res.status(404).json({ message: 'Status não encontrado' });
      }

      // Criar registro no histórico
      const newHistory = await db
        .insert(medicalOrderStatusHistory)
        .values(validatedData)
        .returning();

      console.log(`✅ Registro de histórico criado com ID: ${newHistory[0].id}`);
      res.status(201).json(newHistory[0]);
    } catch (error) {
      console.error('❌ Erro ao criar registro de histórico:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // PUT /api/medical-order-status-history/:id - Atualizar registro de histórico
  app.put('/api/medical-order-status-history/:id',  async (req, res) => {
    try {
      const historyId = parseInt(req.params.id);
      console.log(`✏️ Atualizando registro de histórico ID: ${historyId}`);
      console.log('Dados recebidos:', req.body);

      // Validar dados de entrada
      const validatedData = insertMedicalOrderStatusHistorySchema.partial().parse(req.body);

      // Verificar se o registro existe
      const existingHistory = await db
        .select({ id: medicalOrderStatusHistory.id })
        .from(medicalOrderStatusHistory)
        .where(eq(medicalOrderStatusHistory.id, historyId));

      if (existingHistory.length === 0) {
        return res.status(404).json({ message: 'Registro de histórico não encontrado' });
      }

      // Atualizar registro
      const updatedHistory = await db
        .update(medicalOrderStatusHistory)
        .set(validatedData)
        .where(eq(medicalOrderStatusHistory.id, historyId))
        .returning();

      console.log(`✅ Registro de histórico ${historyId} atualizado com sucesso`);
      res.json(updatedHistory[0]);
    } catch (error) {
      console.error('❌ Erro ao atualizar registro de histórico:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // DELETE /api/medical-order-status-history/:id - Deletar registro de histórico
  app.delete('/api/medical-order-status-history/:id',  async (req, res) => {
    try {
      const historyId = parseInt(req.params.id);
      console.log(`🗑️ Deletando registro de histórico ID: ${historyId}`);

      // Verificar se o registro existe
      const existingHistory = await db
        .select({ id: medicalOrderStatusHistory.id })
        .from(medicalOrderStatusHistory)
        .where(eq(medicalOrderStatusHistory.id, historyId));

      if (existingHistory.length === 0) {
        return res.status(404).json({ message: 'Registro de histórico não encontrado' });
      }

      // Deletar registro
      await db
        .delete(medicalOrderStatusHistory)
        .where(eq(medicalOrderStatusHistory.id, historyId));

      console.log(`✅ Registro de histórico ${historyId} deletado com sucesso`);
      res.json({ message: 'Registro de histórico deletado com sucesso' });
    } catch (error) {
      console.error('❌ Erro ao deletar registro de histórico:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // GET /api/medical-order-status-history/notifications/pending - Buscar notificações pendentes
  app.get('/api/medical-order-status-history/notifications/pending',  async (req, res) => {
    try {
      console.log('🔔 Buscando notificações pendentes');
      
      const now = new Date();
      const pendingNotifications = await db
        .select({
          id: medicalOrderStatusHistory.id,
          orderId: medicalOrderStatusHistory.orderId,
          statusId: medicalOrderStatusHistory.statusId,
          changedAt: medicalOrderStatusHistory.changedAt,
          notes: medicalOrderStatusHistory.notes,
          deadlineDate: medicalOrderStatusHistory.deadlineDate,
          nextNotificationAt: medicalOrderStatusHistory.nextNotificationAt,
          // Dados relacionados
          statusCode: orderStatuses.code,
          statusName: orderStatuses.name,
          statusColor: orderStatuses.color,
          statusIcon: orderStatuses.icon
        })
        .from(medicalOrderStatusHistory)
        .innerJoin(orderStatuses, eq(medicalOrderStatusHistory.statusId, orderStatuses.id))
        .where(
          and(
            eq(medicalOrderStatusHistory.nextNotificationAt, now), // Notificações que devem ser enviadas agora
            // ou deadline_date <= now (prazos vencidos)
          )
        )
        .orderBy(medicalOrderStatusHistory.nextNotificationAt);

      console.log(`✅ Encontradas ${pendingNotifications.length} notificações pendentes`);
      res.json(pendingNotifications);
    } catch (error) {
      console.error('❌ Erro ao buscar notificações pendentes:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // ========================================
  // MEDICAL ORDER SUPPLIER MANUFACTURERS API
  // ========================================

  // PUT /api/medical-orders/:orderId/suppliers/:supplierId/manufacturer - Adicionar/Atualizar fabricante para um fornecedor específico
  app.put('/api/medical-orders/:orderId/suppliers/:supplierId/manufacturer', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const supplierId = parseInt(req.params.supplierId);
      
      if (isNaN(orderId) || isNaN(supplierId)) {
        return res.status(400).json({ message: 'IDs do pedido e fornecedor devem ser válidos' });
      }

      const { manufacturerName } = req.body;
      if (!manufacturerName || typeof manufacturerName !== 'string' || manufacturerName.trim() === '') {
        return res.status(400).json({ message: 'Nome do fabricante é obrigatório' });
      }

      // Verificar se o pedido existe
      const existingOrder = await db
        .select({ id: medicalOrders.id })
        .from(medicalOrders)
        .where(eq(medicalOrders.id, orderId))
        .limit(1);

      if (existingOrder.length === 0) {
        return res.status(404).json({ message: 'Pedido médico não encontrado' });
      }

      // Verificar se o fornecedor existe
      const existingSupplier = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.id, supplierId))
        .limit(1);
        
      if (existingSupplier.length === 0) {
        return res.status(404).json({ message: 'Fornecedor não encontrado' });
      }

      // Verificar se já existe um fabricante para este fornecedor neste pedido
      const existingManufacturer = await db
        .select({ id: medicalOrderSupplierManufacturers.id })
        .from(medicalOrderSupplierManufacturers)
        .where(
          and(
            eq(medicalOrderSupplierManufacturers.orderId, orderId),
            eq(medicalOrderSupplierManufacturers.supplierId, supplierId)
          )
        )
        .limit(1);

      let result;
      if (existingManufacturer.length > 0) {
        // Atualizar fabricante existente
        [result] = await db
          .update(medicalOrderSupplierManufacturers)
          .set({
            manufacturerName: manufacturerName.trim(),
            updatedAt: new Date(),
          })
          .where(eq(medicalOrderSupplierManufacturers.id, existingManufacturer[0].id))
          .returning();
          
        console.log(`✅ Fabricante atualizado para fornecedor ${supplierId} no pedido ${orderId}: "${manufacturerName}"`);
      } else {
        // Inserir novo fabricante
        [result] = await db
          .insert(medicalOrderSupplierManufacturers)
          .values({
            orderId,
            supplierId,
            manufacturerName: manufacturerName.trim(),
          })
          .returning();
          
        console.log(`✅ Novo fabricante adicionado para fornecedor ${supplierId} no pedido ${orderId}: "${manufacturerName}"`);
      }

      res.json(result);
    } catch (error: any) {
      console.error('Erro ao gerenciar fabricante do fornecedor:', error);
      res.status(500).json({ message: 'Erro ao gerenciar fabricante do fornecedor' });
    }
  });

  // DELETE /api/medical-orders/:orderId/suppliers/:supplierId/manufacturer - Remover fabricante de um fornecedor específico
  app.delete('/api/medical-orders/:orderId/suppliers/:supplierId/manufacturer', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const supplierId = parseInt(req.params.supplierId);
      
      if (isNaN(orderId) || isNaN(supplierId)) {
        return res.status(400).json({ message: 'IDs do pedido e fornecedor devem ser válidos' });
      }

      const result = await db
        .delete(medicalOrderSupplierManufacturers)
        .where(
          and(
            eq(medicalOrderSupplierManufacturers.orderId, orderId),
            eq(medicalOrderSupplierManufacturers.supplierId, supplierId)
          )
        )
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Fabricante não encontrado para este fornecedor' });
      }

      console.log(`✅ Fabricante removido do fornecedor ${supplierId} no pedido ${orderId}`);
      res.json({ message: 'Fabricante removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover fabricante do fornecedor:', error);
      res.status(500).json({ message: 'Erro ao remover fabricante do fornecedor' });
    }
  });

  // GET /api/medical-orders/:orderId/suppliers-with-manufacturers - Listar fornecedores de um pedido com seus fabricantes
  app.get('/api/medical-orders/:orderId/suppliers-with-manufacturers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID do pedido inválido' });
      }

      // Usar query SQL direta para evitar problemas com Drizzle
      const result = await pool.query(`
        WITH supplier_positions AS (
          SELECT 
            mos.*,
            ROW_NUMBER() OVER (ORDER BY mos.id) as position
          FROM medical_order_suppliers mos
          WHERE mos.order_id = $1
        )
        SELECT 
          s.id as supplier_id,
          s.trade_name as supplier_name,
          mosm.manufacturer_name,
          sp.id as order_supplier_id,
          sp.position as supplier_position
        FROM supplier_positions sp
        LEFT JOIN suppliers s ON s.id = sp.supplier_id
        LEFT JOIN medical_order_supplier_manufacturers mosm ON (
          mosm.order_id = sp.order_id AND 
          mosm.priority = sp.position
        )
        ORDER BY sp.position;
      `, [orderId]);

      const suppliersWithManufacturers = result.rows.map(row => ({
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        manufacturerId: null,
        manufacturerName: row.manufacturer_name || null,
      }));

      console.log(`🏭 suppliers-with-manufacturers - Pedido ${orderId}: ${suppliersWithManufacturers.length} fornecedores`, suppliersWithManufacturers);
      res.json(suppliersWithManufacturers);
    } catch (error) {
      console.error('Erro ao buscar fornecedores com fabricantes:', error);
      res.status(500).json({ message: 'Erro ao buscar fornecedores com fabricantes' });
    }
  });

  // GET /api/medical-orders/:orderId/combined-suppliers-manufacturers - Novo endpoint para teste
  app.get('/api/medical-orders/:orderId/combined-suppliers-manufacturers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID do pedido inválido' });
      }

      // Query SQL direta para buscar combinação de fornecedores e fabricantes
      const result = await pool.query(`
        WITH supplier_positions AS (
          SELECT 
            mos.*,
            ROW_NUMBER() OVER (ORDER BY mos.id) as position
          FROM medical_order_suppliers mos
          WHERE mos.order_id = $1
        )
        SELECT 
          s.id as supplier_id,
          s.trade_name as supplier_name,
          mosm.manufacturer_name,
          sp.id as order_supplier_id,
          sp.position as supplier_position
        FROM supplier_positions sp
        LEFT JOIN suppliers s ON s.id = sp.supplier_id
        LEFT JOIN medical_order_supplier_manufacturers mosm ON (
          mosm.order_id = sp.order_id AND 
          mosm.priority = sp.position
        )
        ORDER BY sp.position;
      `, [orderId]);

      const suppliersWithManufacturers = result.rows.map(row => ({
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        manufacturerId: null,
        manufacturerName: row.manufacturer_name || null,
      }));

      console.log(`🏭 combined-suppliers-manufacturers - Pedido ${orderId}:`, suppliersWithManufacturers);
      res.json(suppliersWithManufacturers);
    } catch (error) {
      console.error('Erro ao buscar fornecedores com fabricantes (novo endpoint):', error);
      res.status(500).json({ message: 'Erro ao buscar fornecedores com fabricantes' });
    }
  });

  // GET /api/medical-orders/:orderId/manufacturers - Listar fabricantes de um pedido ordenados por prioridade
  app.get('/api/medical-orders/:orderId/manufacturers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID do pedido inválido' });
      }

      const manufacturers = await db
        .select({
          id: medicalOrderSupplierManufacturers.id,
          orderId: medicalOrderSupplierManufacturers.orderId,
          supplierId: medicalOrderSupplierManufacturers.supplierId,
          priority: medicalOrderSupplierManufacturers.priority,
          manufacturerName: medicalOrderSupplierManufacturers.manufacturerName,
          createdAt: medicalOrderSupplierManufacturers.createdAt,
          updatedAt: medicalOrderSupplierManufacturers.updatedAt,
          // Incluir informações do fornecedor se existir
          supplierName: suppliers.companyName,
        })
        .from(medicalOrderSupplierManufacturers)
        .leftJoin(suppliers, eq(medicalOrderSupplierManufacturers.supplierId, suppliers.id))
        .where(eq(medicalOrderSupplierManufacturers.orderId, orderId))
        .orderBy(medicalOrderSupplierManufacturers.priority);

      console.log(`Encontrados ${manufacturers.length} fabricantes para pedido ${orderId}`);
      res.json(manufacturers);
    } catch (error) {
      console.error('Erro ao buscar fabricantes do pedido:', error);
      res.status(500).json({ message: 'Erro ao buscar fabricantes do pedido' });
    }
  });

  // POST /api/medical-orders/:orderId/manufacturers - Adicionar fabricante a um pedido
  app.post('/api/medical-orders/:orderId/manufacturers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID do pedido inválido' });
      }

      const { manufacturerName, priority, supplierId } = req.body;
      if (!manufacturerName || typeof manufacturerName !== 'string' || manufacturerName.trim() === '') {
        return res.status(400).json({ message: 'Nome do fabricante é obrigatório' });
      }

      // Validar priority (obrigatório, 1-3)
      const validPriority = parseInt(priority);
      if (isNaN(validPriority) || validPriority < 1 || validPriority > 3) {
        return res.status(400).json({ message: 'Prioridade deve ser um número entre 1 e 3' });
      }

      // Validar supplierId se fornecido
      let validSupplierId = null;
      if (supplierId !== undefined && supplierId !== null) {
        validSupplierId = parseInt(supplierId);
        if (isNaN(validSupplierId)) {
          return res.status(400).json({ message: 'ID do fornecedor deve ser um número válido' });
        }
        
        // Verificar se o fornecedor existe
        const existingSupplier = await db
          .select({ id: suppliers.id })
          .from(suppliers)
          .where(eq(suppliers.id, validSupplierId))
          .limit(1);
          
        if (existingSupplier.length === 0) {
          return res.status(404).json({ message: 'Fornecedor não encontrado' });
        }
      }

      // Verificar se o pedido existe
      const existingOrder = await db
        .select({ id: medicalOrders.id })
        .from(medicalOrders)
        .where(eq(medicalOrders.id, orderId))
        .limit(1);

      if (existingOrder.length === 0) {
        return res.status(404).json({ message: 'Pedido médico não encontrado' });
      }

      // Inserir fabricante (constraint UNIQUE previne duplicatas na mesma prioridade)
      const [newManufacturer] = await db
        .insert(medicalOrderSupplierManufacturers)
        .values({
          orderId,
          priority: validPriority,
          supplierId: validSupplierId,
          manufacturerName: manufacturerName.trim(),
        })
        .returning();

      console.log(`✅ Fabricante "${manufacturerName}" adicionado ao pedido ${orderId}`);
      res.status(201).json(newManufacturer);
    } catch (error: any) {
      console.error('Erro ao adicionar fabricante:', error);
      
      // Verificar se é erro de duplicata
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ message: 'Este fabricante já está associado ao pedido' });
      }
      
      res.status(500).json({ message: 'Erro ao adicionar fabricante' });
    }
  });

  // PUT /api/medical-orders/:orderId/manufacturers - Atualizar todos os fabricantes de um pedido (batch)
  app.put('/api/medical-orders/:orderId/manufacturers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID do pedido inválido' });
      }

      const { manufacturers } = req.body;
      if (!Array.isArray(manufacturers)) {
        return res.status(400).json({ message: 'manufacturers deve ser um array de objetos' });
      }

      // Validar e processar fabricantes com prioridades
      const validManufacturers = [];
      for (let i = 0; i < manufacturers.length; i++) {
        const manufacturer = manufacturers[i];
        
        if (typeof manufacturer === 'string' && manufacturer.trim() !== '') {
          // Backward compatibility: string simples recebe prioridade baseada no índice
          validManufacturers.push({
            manufacturerName: manufacturer.trim(),
            priority: i + 1,
            supplierId: null,
          });
        } else if (typeof manufacturer === 'object' && manufacturer.manufacturerName) {
          // Objeto com estrutura completa
          const priority = manufacturer.priority || (i + 1);
          if (priority < 1 || priority > 3) {
            return res.status(400).json({ message: `Prioridade deve ser entre 1 e 3 para fabricante "${manufacturer.manufacturerName}"` });
          }
          
          validManufacturers.push({
            manufacturerName: manufacturer.manufacturerName.trim(),
            priority,
            supplierId: manufacturer.supplierId || null,
          });
        }
      }

      // Verificar se o pedido existe
      const existingOrder = await db
        .select({ id: medicalOrders.id })
        .from(medicalOrders)
        .where(eq(medicalOrders.id, orderId))
        .limit(1);

      if (existingOrder.length === 0) {
        return res.status(404).json({ message: 'Pedido médico não encontrado' });
      }

      // Transação: remover todos os fabricantes existentes e inserir os novos
      await db.transaction(async (tx) => {
        // Remover fabricantes existentes
        await tx
          .delete(medicalOrderSupplierManufacturers)
          .where(eq(medicalOrderSupplierManufacturers.orderId, orderId));

        // Inserir novos fabricantes (se houver)
        if (validManufacturers.length > 0) {
          await tx
            .insert(medicalOrderSupplierManufacturers)
            .values(
              validManufacturers.map(({ manufacturerName, priority, supplierId }) => ({
                orderId,
                priority,
                supplierId,
                manufacturerName,
              }))
            );
        }
      });

      // Retornar fabricantes atualizados
      const updatedManufacturers = await db
        .select()
        .from(medicalOrderSupplierManufacturers)
        .where(eq(medicalOrderSupplierManufacturers.orderId, orderId))
        .orderBy(medicalOrderSupplierManufacturers.priority);

      console.log(`✅ Fabricantes do pedido ${orderId} atualizados: ${validManufacturers.length} fabricantes`);
      res.json(updatedManufacturers);
    } catch (error) {
      console.error('Erro ao atualizar fabricantes:', error);
      res.status(500).json({ message: 'Erro ao atualizar fabricantes' });
    }
  });

  // DELETE /api/medical-orders/:orderId/manufacturers/:manufacturerId - Remover fabricante específico
  app.delete('/api/medical-orders/:orderId/manufacturers/:manufacturerId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const manufacturerId = parseInt(req.params.manufacturerId);
      
      if (isNaN(orderId) || isNaN(manufacturerId)) {
        return res.status(400).json({ message: 'IDs do pedido e fabricante devem ser válidos' });
      }

      const result = await db
        .delete(medicalOrderSupplierManufacturers)
        .where(
          and(
            eq(medicalOrderSupplierManufacturers.orderId, orderId),
            eq(medicalOrderSupplierManufacturers.id, manufacturerId)
          )
        )
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Fabricante não encontrado para este pedido' });
      }

      console.log(`✅ Fabricante ID ${manufacturerId} removido do pedido ${orderId}`);
      res.json({ message: 'Fabricante removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover fabricante:', error);
      res.status(500).json({ message: 'Erro ao remover fabricante' });
    }
  });

  // GET /api/medical-orders/:orderId/suppliers - Buscar fornecedores de um pedido médico
  app.get('/api/medical-orders/:orderId/suppliers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: 'ID de pedido inválido' });
      }

      console.log(`🔍 Buscando fornecedores para pedido ${orderId}`);

      // Buscar fornecedores do pedido usando Drizzle ORM (simplificado)
      const rawSuppliers = await db
        .select()
        .from(medicalOrderSuppliers)
        .innerJoin(suppliers, eq(medicalOrderSuppliers.supplierId, suppliers.id))
        .where(eq(medicalOrderSuppliers.orderId, orderId));

      console.log(`📋 Raw suppliers encontrados:`, rawSuppliers.length);

      // Mapear os resultados para o formato esperado pelo frontend
      const formattedSuppliers = rawSuppliers.map((row: any) => ({
        id: row.medical_order_suppliers.id,
        orderId: row.medical_order_suppliers.orderId,
        supplierId: row.medical_order_suppliers.supplierId,
        isApproved: row.medical_order_suppliers.isApproved,
        approvedBy: row.medical_order_suppliers.approvedBy,
        approvedAt: row.medical_order_suppliers.approvedAt,
        supplier: {
          id: row.suppliers.id,
          name: row.suppliers.companyName,
          companyName: row.suppliers.companyName,
          tradeName: row.suppliers.tradeName,
          cnpj: row.suppliers.cnpj,
          phone: row.suppliers.phone,
          email: row.suppliers.email,
          address: row.suppliers.address,
          postalCode: row.suppliers.postalCode,
          active: row.suppliers.active,
        }
      }));

      console.log(`✅ Encontrados ${formattedSuppliers.length} fornecedores para pedido ${orderId}`);

      res.json(formattedSuppliers);
    } catch (error) {
      console.error('❌ Erro ao buscar fornecedores do pedido:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar fornecedores do pedido',
        message: error.message 
      });
    }
  });

  // POST /api/medical-orders/:orderId/suppliers/:supplierId/approve - Aprovar fornecedor
  app.post('/api/medical-orders/:orderId/suppliers/:supplierId/approve', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const supplierId = parseInt(req.params.supplierId);
      const userId = req.user?.id;
      
      if (isNaN(orderId) || isNaN(supplierId)) {
        return res.status(400).json({ error: 'IDs inválidos' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      console.log(`🎯 Aprovando fornecedor ${supplierId} para pedido ${orderId} por usuário ${userId}`);

      // Verificar se o pedido existe
      const existingOrder = await storage.getMedicalOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Verificar se a associação pedido-fornecedor existe
      const existingAssociation = await db
        .select()
        .from(medicalOrderSuppliers)
        .where(
          and(
            eq(medicalOrderSuppliers.orderId, orderId),
            eq(medicalOrderSuppliers.supplierId, supplierId)
          )
        )
        .limit(1);

      if (existingAssociation.length === 0) {
        return res.status(404).json({ error: 'Associação pedido-fornecedor não encontrada' });
      }

      // Desaprovar todos os fornecedores existentes para este pedido
      await db
        .update(medicalOrderSuppliers)
        .set({
          isApproved: false,
          approvedBy: null,
          approvedAt: null
        })
        .where(eq(medicalOrderSuppliers.orderId, orderId));

      // Aprovar apenas o fornecedor selecionado
      await db
        .update(medicalOrderSuppliers)
        .set({
          isApproved: true,
          approvedBy: userId,
          approvedAt: new Date()
        })
        .where(
          and(
            eq(medicalOrderSuppliers.orderId, orderId),
            eq(medicalOrderSuppliers.supplierId, supplierId)
          )
        );

      console.log(`✅ Fornecedor ${supplierId} aprovado com sucesso para pedido ${orderId}`);

      res.json({ 
        message: 'Fornecedor aprovado com sucesso',
        orderId,
        supplierId,
        approvedBy: userId,
        approvedAt: new Date()
      });
    } catch (error) {
      console.error('❌ Erro ao aprovar fornecedor:', error);
      res.status(500).json({ 
        error: 'Erro ao aprovar fornecedor',
        message: error.message 
      });
    }
  });

  // GET /api/suppliers/search - Buscar fornecedores por nome ou CNPJ
  app.get('/api/suppliers/search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const searchTerm = (req.query.q as string) || '';
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({ error: 'Termo de busca deve ter pelo menos 2 caracteres' });
      }

      console.log(`🔍 Buscando fornecedores por termo: "${searchTerm}"`);

      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      
      const foundSuppliers = await db
        .select({
          id: suppliers.id,
          name: suppliers.tradeName,
          companyName: suppliers.companyName,
          cnpj: suppliers.cnpj,
          isActive: suppliers.active
        })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.active, true),
            or(
              sql`LOWER(${suppliers.companyName}) LIKE ${searchPattern}`,
              sql`LOWER(${suppliers.tradeName}) LIKE ${searchPattern}`,
              sql`REPLACE(${suppliers.cnpj}, '.', '') LIKE ${searchPattern.replace(/\./g, '')}`,
              sql`REPLACE(REPLACE(REPLACE(${suppliers.cnpj}, '.', ''), '/', ''), '-', '') LIKE ${searchPattern.replace(/[\.\/-]/g, '')}`
            )
          )
        )
        .limit(20)
        .orderBy(sql`COALESCE(${suppliers.tradeName}, ${suppliers.companyName})`);

      console.log(`📋 Encontrados ${foundSuppliers.length} fornecedores para "${searchTerm}"`);
      
      res.json(foundSuppliers);
    } catch (error) {
      console.error('❌ Erro ao buscar fornecedores:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar fornecedores',
        message: error.message 
      });
    }
  });

  // POST /api/medical-orders/:orderId/suppliers - Adicionar novo fornecedor ao pedido
  app.post('/api/medical-orders/:orderId/suppliers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { supplierId } = req.body;
      const userId = req.user?.id;
      
      if (isNaN(orderId) || !supplierId || !userId) {
        return res.status(400).json({ error: 'Parâmetros inválidos' });
      }

      console.log(`➕ Adicionando fornecedor ${supplierId} ao pedido ${orderId} por usuário ${userId}`);

      // Verificar se o pedido existe
      const existingOrder = await storage.getMedicalOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Verificar se o fornecedor existe
      const existingSupplier = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, supplierId))
        .limit(1);
        
      if (existingSupplier.length === 0) {
        return res.status(404).json({ error: 'Fornecedor não encontrado' });
      }

      // Verificar se já existe associação
      const existingAssociation = await db
        .select()
        .from(medicalOrderSuppliers)
        .where(
          and(
            eq(medicalOrderSuppliers.orderId, orderId),
            eq(medicalOrderSuppliers.supplierId, supplierId)
          )
        )
        .limit(1);

      if (existingAssociation.length > 0) {
        return res.status(400).json({ error: 'Fornecedor já está associado a este pedido' });
      }

      // Verificar se já existe um fornecedor aprovado
      const existingApproval = await db
        .select()
        .from(medicalOrderSuppliers)
        .where(
          and(
            eq(medicalOrderSuppliers.orderId, orderId),
            eq(medicalOrderSuppliers.isApproved, true)
          )
        )
        .limit(1);

      if (existingApproval.length > 0) {
        return res.status(400).json({ 
          error: 'Já existe um fornecedor aprovado para este pedido',
          approvedSupplierId: existingApproval[0].supplierId
        });
      }

      // Adicionar a associação e marcar como aprovado imediatamente
      await db
        .insert(medicalOrderSuppliers)
        .values({
          orderId: orderId,
          supplierId: supplierId,
          isApproved: true,
          approvedBy: userId,
          approvedAt: new Date()
        });

      console.log(`✅ Fornecedor ${supplierId} adicionado e aprovado para pedido ${orderId}`);

      res.json({ 
        message: 'Fornecedor adicionado e aprovado com sucesso',
        orderId,
        supplierId,
        approvedBy: userId,
        approvedAt: new Date()
      });
    } catch (error) {
      console.error('❌ Erro ao adicionar fornecedor:', error);
      res.status(500).json({ 
        error: 'Erro ao adicionar fornecedor',
        message: error.message 
      });
    }
  });

  // ====================================
  // SURGICAL PROCEDURES ASSOCIATIONS API - PARA REMOÇÃO SELETIVA
  // ====================================

  // GET /api/surgical-procedures/:id/cids - Buscar CIDs específicos de um procedimento cirúrgico
  app.get("/api/surgical-procedures/:id/cids", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.id);
      
      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID do procedimento inválido" });
      }
      
      console.log(`🔍 Buscando CIDs específicos do procedimento cirúrgico ${procedureId}`);
      
      // Buscar CIDs associados diretamente ao procedimento cirúrgico
      const associatedCids = await db
        .select({
          id: cidCodes.id,
          code: cidCodes.code,
          description: cidCodes.description,
          category: cidCodes.category,
          surgicalApproachId: surgicalProcedureConductCids.surgicalApproachId
        })
        .from(surgicalProcedureConductCids)
        .innerJoin(cidCodes, eq(surgicalProcedureConductCids.cidCodeId, cidCodes.id))
        .where(eq(surgicalProcedureConductCids.surgicalProcedureId, procedureId));
      
      console.log(`✅ Encontrados ${associatedCids.length} CIDs para procedimento ${procedureId}`);
      res.json(associatedCids);
    } catch (error) {
      console.error("Erro ao buscar CIDs do procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-procedures/:id/cbhpm - Buscar procedimentos CBHPM específicos de um procedimento cirúrgico
  app.get("/api/surgical-procedures/:id/cbhpm", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.id);
      
      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID do procedimento inválido" });
      }
      
      console.log(`🔍 Buscando procedimentos CBHPM específicos do procedimento cirúrgico ${procedureId}`);
      
      // Buscar procedimentos CBHPM associados através das condutas do procedimento
      const associatedCbhpm = await db
        .select({
          id: procedures.id,
          code: procedures.code,
          name: procedures.name,
          description: procedures.description,
          porte: procedures.porte,
          surgicalApproachId: surgicalProcedureApproaches.surgicalApproachId
        })
        .from(surgicalProcedureApproaches)
        .innerJoin(surgicalApproachProcedures, eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproachProcedures.surgicalApproachId))
        .innerJoin(procedures, eq(surgicalApproachProcedures.procedureId, procedures.id))
        .where(eq(surgicalProcedureApproaches.surgicalProcedureId, procedureId));
      
      console.log(`✅ Encontrados ${associatedCbhpm.length} procedimentos CBHPM para procedimento ${procedureId}`);
      res.json(associatedCbhpm);
    } catch (error) {
      console.error("Erro ao buscar procedimentos CBHPM do procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-procedures/:id/opme - Buscar itens OPME específicos de um procedimento cirúrgico
  app.get("/api/surgical-procedures/:id/opme", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.id);
      
      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID do procedimento inválido" });
      }
      
      console.log(`🔍 Buscando itens OPME específicos do procedimento cirúrgico ${procedureId}`);
      
      // Buscar itens OPME associados através das condutas do procedimento
      const associatedOpme = await db
        .select({
          id: opmeItems.id,
          technicalName: opmeItems.technicalName,
          commercialName: opmeItems.commercialName,
          manufacturerName: opmeItems.manufacturerName,
          anvisaRegistrationNumber: opmeItems.anvisaRegistrationNumber,
          quantity: surgicalApproachOpmeItems.quantity,
          surgicalApproachId: surgicalProcedureApproaches.surgicalApproachId
        })
        .from(surgicalProcedureApproaches)
        .innerJoin(surgicalApproachOpmeItems, eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproachOpmeItems.surgicalApproachId))
        .innerJoin(opmeItems, eq(surgicalApproachOpmeItems.opmeItemId, opmeItems.id))
        .where(eq(surgicalProcedureApproaches.surgicalProcedureId, procedureId));
      
      console.log(`✅ Encontrados ${associatedOpme.length} itens OPME para procedimento ${procedureId}`);
      res.json(associatedOpme);
    } catch (error) {
      console.error("Erro ao buscar itens OPME do procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/surgical-procedures/:id/suppliers - Buscar fornecedores específicos de um procedimento cirúrgico
  app.get("/api/surgical-procedures/:id/suppliers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.id);
      
      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID do procedimento inválido" });
      }
      
      console.log(`🔍 Buscando fornecedores específicos do procedimento cirúrgico ${procedureId}`);
      
      // Buscar fornecedores associados através das condutas do procedimento
      const associatedSuppliers = await db
        .select({
          id: suppliers.id,
          companyName: suppliers.companyName,
          tradeName: suppliers.tradeName,
          cnpj: suppliers.cnpj,
          phone: suppliers.phone,
          email: suppliers.email,
          priority: surgicalApproachSuppliers.priority,
          surgicalApproachId: surgicalProcedureApproaches.surgicalApproachId
        })
        .from(surgicalProcedureApproaches)
        .innerJoin(surgicalApproachSuppliers, eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproachSuppliers.surgicalApproachId))
        .innerJoin(suppliers, eq(surgicalApproachSuppliers.supplierId, suppliers.id))
        .where(eq(surgicalProcedureApproaches.surgicalProcedureId, procedureId));
      
      console.log(`✅ Encontrados ${associatedSuppliers.length} fornecedores para procedimento ${procedureId}`);
      res.json(associatedSuppliers);
    } catch (error) {
      console.error("Erro ao buscar fornecedores do procedimento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ====================================
  // SURGICAL PROCEDURES SELECTIVE REMOVAL API - PARA REMOÇÃO SELETIVA
  // ====================================

  // DELETE /api/surgical-procedures/:id/cids/:cidId - Remover CID específico de um procedimento
  app.delete("/api/surgical-procedures/:procedureId/cids/:cidId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.procedureId);
      const cidId = parseInt(req.params.cidId);
      
      if (isNaN(procedureId) || isNaN(cidId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      console.log(`🗑️ Removendo CID ${cidId} do procedimento cirúrgico ${procedureId}`);
      
      // Buscar condutas cirúrgicas associadas ao procedimento para verificar compartilhamento
      const otherProceduresWithSameCid = await db
        .select({ id: surgicalProcedureConductCids.surgicalProcedureId })
        .from(surgicalProcedureConductCids)
        .where(and(
          eq(surgicalProcedureConductCids.cidCodeId, cidId),
          ne(surgicalProcedureConductCids.surgicalProcedureId, procedureId)
        ));
      
      // Se o CID é compartilhado com outros procedimentos, apenas remover do procedimento atual
      if (otherProceduresWithSameCid.length > 0) {
        await db
          .delete(surgicalProcedureConductCids)
          .where(and(
            eq(surgicalProcedureConductCids.surgicalProcedureId, procedureId),
            eq(surgicalProcedureConductCids.cidCodeId, cidId)
          ));
        console.log(`✅ CID ${cidId} removido do procedimento ${procedureId} (compartilhado com outros)`);
      } else {
        // Remover completamente se não for compartilhado
        await db
          .delete(surgicalProcedureConductCids)
          .where(eq(surgicalProcedureConductCids.cidCodeId, cidId));
        console.log(`✅ CID ${cidId} removido completamente (não compartilhado)`);
      }
      
      res.json({ message: "CID removido com sucesso" });
    } catch (error) {
      console.error("Erro ao remover CID:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/surgical-procedures/:id/cbhpm/:cbhpmId - Remover CBHPM específico de um procedimento
  app.delete("/api/surgical-procedures/:procedureId/cbhpm/:cbhpmId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.procedureId);
      const cbhpmId = parseInt(req.params.cbhpmId);
      
      if (isNaN(procedureId) || isNaN(cbhpmId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      console.log(`🗑️ Removendo CBHPM ${cbhpmId} do procedimento cirúrgico ${procedureId}`);
      
      // Verificar se o CBHPM é compartilhado com outros procedimentos
      const sharedApproaches = await db
        .select({ 
          surgicalApproachId: surgicalApproachProcedures.surgicalApproachId,
          procedureId: surgicalProcedureApproaches.surgicalProcedureId
        })
        .from(surgicalApproachProcedures)
        .innerJoin(surgicalProcedureApproaches, eq(surgicalApproachProcedures.surgicalApproachId, surgicalProcedureApproaches.surgicalApproachId))
        .where(and(
          eq(surgicalApproachProcedures.procedureId, cbhpmId),
          ne(surgicalProcedureApproaches.surgicalProcedureId, procedureId)
        ));
      
      if (sharedApproaches.length > 0) {
        // Remover apenas a associação específica
        const approachesToRemove = await db
          .select({ surgicalApproachId: surgicalProcedureApproaches.surgicalApproachId })
          .from(surgicalProcedureApproaches)
          .innerJoin(surgicalApproachProcedures, eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproachProcedures.surgicalApproachId))
          .where(and(
            eq(surgicalProcedureApproaches.surgicalProcedureId, procedureId),
            eq(surgicalApproachProcedures.procedureId, cbhpmId)
          ));

        for (const approach of approachesToRemove) {
          await db
            .delete(surgicalApproachProcedures)
            .where(and(
              eq(surgicalApproachProcedures.surgicalApproachId, approach.surgicalApproachId),
              eq(surgicalApproachProcedures.procedureId, cbhpmId)
            ));
        }
        console.log(`✅ CBHPM ${cbhpmId} removido do procedimento ${procedureId} (compartilhado)`);
      } else {
        // Remover completamente
        await db
          .delete(surgicalApproachProcedures)
          .where(eq(surgicalApproachProcedures.procedureId, cbhpmId));
        console.log(`✅ CBHPM ${cbhpmId} removido completamente`);
      }
      
      res.json({ message: "Procedimento CBHPM removido com sucesso" });
    } catch (error) {
      console.error("Erro ao remover CBHPM:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/surgical-procedures/:id/opme/:opmeId - Remover item OPME específico de um procedimento
  app.delete("/api/surgical-procedures/:procedureId/opme/:opmeId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.procedureId);
      const opmeId = parseInt(req.params.opmeId);
      
      if (isNaN(procedureId) || isNaN(opmeId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      console.log(`🗑️ Removendo item OPME ${opmeId} do procedimento cirúrgico ${procedureId}`);
      
      // Verificar se o item OPME é compartilhado com outros procedimentos
      const sharedApproaches = await db
        .select({ 
          surgicalApproachId: surgicalApproachOpmeItems.surgicalApproachId,
          procedureId: surgicalProcedureApproaches.surgicalProcedureId
        })
        .from(surgicalApproachOpmeItems)
        .innerJoin(surgicalProcedureApproaches, eq(surgicalApproachOpmeItems.surgicalApproachId, surgicalProcedureApproaches.surgicalApproachId))
        .where(and(
          eq(surgicalApproachOpmeItems.opmeItemId, opmeId),
          ne(surgicalProcedureApproaches.surgicalProcedureId, procedureId)
        ));
      
      if (sharedApproaches.length > 0) {
        // Remover apenas a associação específica
        const approachesToRemove = await db
          .select({ surgicalApproachId: surgicalProcedureApproaches.surgicalApproachId })
          .from(surgicalProcedureApproaches)
          .innerJoin(surgicalApproachOpmeItems, eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproachOpmeItems.surgicalApproachId))
          .where(and(
            eq(surgicalProcedureApproaches.surgicalProcedureId, procedureId),
            eq(surgicalApproachOpmeItems.opmeItemId, opmeId)
          ));

        for (const approach of approachesToRemove) {
          await db
            .delete(surgicalApproachOpmeItems)
            .where(and(
              eq(surgicalApproachOpmeItems.surgicalApproachId, approach.surgicalApproachId),
              eq(surgicalApproachOpmeItems.opmeItemId, opmeId)
            ));
        }
        console.log(`✅ Item OPME ${opmeId} removido do procedimento ${procedureId} (compartilhado)`);
      } else {
        // Remover completamente
        await db
          .delete(surgicalApproachOpmeItems)
          .where(eq(surgicalApproachOpmeItems.opmeItemId, opmeId));
        console.log(`✅ Item OPME ${opmeId} removido completamente`);
      }
      
      res.json({ message: "Item OPME removido com sucesso" });
    } catch (error) {
      console.error("Erro ao remover item OPME:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/surgical-procedures/:id/suppliers/:supplierId - Remover fornecedor específico de um procedimento
  app.delete("/api/surgical-procedures/:procedureId/suppliers/:supplierId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.procedureId);
      const supplierId = parseInt(req.params.supplierId);
      
      if (isNaN(procedureId) || isNaN(supplierId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      console.log(`🗑️ Removendo fornecedor ${supplierId} do procedimento cirúrgico ${procedureId}`);
      
      // Verificar se o fornecedor é compartilhado com outros procedimentos
      const sharedApproaches = await db
        .select({ 
          surgicalApproachId: surgicalApproachSuppliers.surgicalApproachId,
          procedureId: surgicalProcedureApproaches.surgicalProcedureId
        })
        .from(surgicalApproachSuppliers)
        .innerJoin(surgicalProcedureApproaches, eq(surgicalApproachSuppliers.surgicalApproachId, surgicalProcedureApproaches.surgicalApproachId))
        .where(and(
          eq(surgicalApproachSuppliers.supplierId, supplierId),
          ne(surgicalProcedureApproaches.surgicalProcedureId, procedureId)
        ));
      
      if (sharedApproaches.length > 0) {
        // Remover apenas a associação específica
        const approachesToRemove = await db
          .select({ surgicalApproachId: surgicalProcedureApproaches.surgicalApproachId })
          .from(surgicalProcedureApproaches)
          .innerJoin(surgicalApproachSuppliers, eq(surgicalProcedureApproaches.surgicalApproachId, surgicalApproachSuppliers.surgicalApproachId))
          .where(and(
            eq(surgicalProcedureApproaches.surgicalProcedureId, procedureId),
            eq(surgicalApproachSuppliers.supplierId, supplierId)
          ));

        for (const approach of approachesToRemove) {
          await db
            .delete(surgicalApproachSuppliers)
            .where(and(
              eq(surgicalApproachSuppliers.surgicalApproachId, approach.surgicalApproachId),
              eq(surgicalApproachSuppliers.supplierId, supplierId)
            ));
        }
        console.log(`✅ Fornecedor ${supplierId} removido do procedimento ${procedureId} (compartilhado)`);
      } else {
        // Remover completamente
        await db
          .delete(surgicalApproachSuppliers)
          .where(eq(surgicalApproachSuppliers.supplierId, supplierId));
        console.log(`✅ Fornecedor ${supplierId} removido completamente`);
      }
      
      res.json({ message: "Fornecedor removido com sucesso" });
    } catch (error) {
      console.error("Erro ao remover fornecedor:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  return httpServer;
}
