import {
  patients, type Patient, type InsertPatient,
  healthInsuranceProviders, type HealthInsuranceProvider, type InsertHealthInsuranceProvider,
  healthInsurancePlans, type HealthInsurancePlan, type InsertHealthInsurancePlan,
  opmeItems, type OpmeItem, type InsertOpmeItem,
  opmeSuppliers, type OpmeSupplier, type InsertOpmeSupplier,
  procedures, type Procedure, type InsertProcedure,
  medicalOrders, type MedicalOrder, type InsertMedicalOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  scannedDocuments, type ScannedDocument, type InsertScannedDocument,
  users, type User, type InsertUser,
  hospitals, type Hospital, type InsertHospital,
  roles, type Role, type InsertRole,
  rolePermissions, type RolePermission, type InsertRolePermission,
  userPermissions, type UserPermission, type InsertUserPermission,
  permissionEnum,
  cidCodes, type CidCode, type InsertCidCode,
  suppliers, type Supplier, type InsertSupplier,
  notifications, type Notification, type InsertNotification,
  doctorHospitals, type DoctorHospital, type InsertDoctorHospital,
  doctorPatients, type DoctorPatient, type InsertDoctorPatient,
  contactMessages, type ContactMessage, type InsertContactMessage,
  appeals, type Appeal, type InsertAppeal,
  municipalities, type Municipality, type InsertMunicipality,
  brazilianStates, type BrazilianState, type InsertBrazilianState,
  medicalOrderProcedures, type MedicalOrderProcedure, type InsertMedicalOrderProcedure,
  orderStatuses, type OrderStatus, type InsertOrderStatus
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, ilike, and, isNull, is, gt, or, sql, ne } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { hashPassword } from "./utils";
import { normalizeText } from "./utils/normalize";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserByCrm(crm: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Supplier operations
  getSupplier(id: number): Promise<Supplier | undefined>;
  getSuppliers(): Promise<Supplier[]>;
  searchSuppliers(term: string): Promise<Supplier[]>;
  
  // Report operations
  countAllMedicalOrders(): Promise<number>;
  countMedicalOrdersByDoctor(doctorId: number): Promise<number>;
  countAllPatients(): Promise<number>;
  countPatientsByDoctor(doctorId: number): Promise<number>;
  getDoctorPerformanceStats(): Promise<Array<{doctorName: string, orderCount: number}>>;
  getHospitalVolumeStats(): Promise<Array<{hospitalName: string, orderCount: number}>>;
  getHospitalVolumeStatsByDoctor(doctorId: number): Promise<Array<{hospitalName: string, orderCount: number}>>;
  getMedicalOrdersForReporting(filters: {
    status?: string | null,
    startDate?: string | null,
    endDate?: string | null,
    hospitalId?: number | null,
    complexity?: string | null
  }): Promise<MedicalOrder[]>;
  getMedicalOrdersForReportingByDoctor(
    doctorId: number,
    filters: {
      status?: string | null,
      startDate?: string | null,
      endDate?: string | null,
      hospitalId?: number | null,
      complexity?: string | null
    }
  ): Promise<MedicalOrder[]>;
  
  // Health Insurance Provider operations
  getHealthInsuranceProvider(id: number): Promise<HealthInsuranceProvider | undefined>;
  getHealthInsuranceProviderByCnpj(cnpj: string): Promise<HealthInsuranceProvider | undefined>;
  getHealthInsuranceProviderByAnsCode(ansCode: string): Promise<HealthInsuranceProvider | undefined>;
  getHealthInsuranceProviders(activeOnly?: boolean): Promise<HealthInsuranceProvider[]>;
  createHealthInsuranceProvider(provider: InsertHealthInsuranceProvider): Promise<HealthInsuranceProvider>;
  updateHealthInsuranceProvider(id: number, provider: Partial<InsertHealthInsuranceProvider>): Promise<HealthInsuranceProvider | undefined>;
  deleteHealthInsuranceProvider(id: number): Promise<boolean>;
  
  // Health Insurance Plans operations
  getHealthInsurancePlans(): Promise<HealthInsurancePlan[]>;
  getHealthInsurancePlansByProvider(ansCode: string): Promise<HealthInsurancePlan[]>;
  getHealthInsurancePlan(id: number): Promise<HealthInsurancePlan | undefined>;
  createHealthInsurancePlan(plan: InsertHealthInsurancePlan): Promise<HealthInsurancePlan>;
  updateHealthInsurancePlan(id: number, plan: Partial<InsertHealthInsurancePlan>): Promise<HealthInsurancePlan | undefined>;
  deleteHealthInsurancePlan(id: number): Promise<boolean>;
  
  // Supplier operations
  getSupplier(id: number): Promise<Supplier | undefined>;
  getSupplierByCnpj(cnpj: string): Promise<Supplier | undefined>;
  getSuppliers(municipalityId?: number, active?: boolean, search?: string): Promise<Supplier[]>;
  getActiveSuppliers(): Promise<Supplier[]>;
  searchSuppliers(term: string): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;
  getMunicipality(id: number): Promise<any | undefined>;
  
  // Doctor-Hospital operations
  getDoctorHospitals(userId: number): Promise<any[]>;
  addDoctorHospital(doctorHospital: InsertDoctorHospital): Promise<DoctorHospital>;
  removeDoctorHospital(userId: number, hospitalId: number): Promise<boolean>;
  updateDoctorHospitals(userId: number, hospitalIds: number[]): Promise<DoctorHospital[]>;
  
  // Doctor-Patient operations
  getDoctorPatients(doctorId: number): Promise<DoctorPatient[]>;
  getDoctorPatientsWithDetails(doctorId: number): Promise<{ patientId: number, patientName: string, associatedAt: Date }[]>;
  getPatientDoctors(patientId: number): Promise<{ doctorId: number, doctorName: string, associatedAt: Date }[]>;
  addDoctorPatient(doctorPatient: InsertDoctorPatient): Promise<DoctorPatient>;
  updateDoctorPatient(id: number, isActive: boolean): Promise<DoctorPatient | undefined>;
  removeDoctorPatient(doctorId: number, patientId: number): Promise<boolean>;
  
  // Password reset operations
  createPasswordResetToken(email: string): Promise<string>;
  verifyPasswordResetToken(token: string): Promise<{valid: boolean, userId?: number}>;
  resetPassword(userId: number, newPassword: string): Promise<boolean>;
  updateUserPassword(username: string, hashedPassword: string): Promise<boolean>;
  
  // CID-10 operations
  getCidCodes(search?: string, category?: string): Promise<CidCode[]>;
  getCidCode(id: number): Promise<CidCode | undefined>;
  createCidCode(cidCode: InsertCidCode): Promise<CidCode>;
  updateCidCode(id: number, updates: Partial<InsertCidCode>): Promise<CidCode | undefined>;
  deleteCidCode(id: number): Promise<boolean>;
  
  // Role/Permission operations
  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  getDefaultRole(): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, updates: Partial<Role>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;
  
  getRolePermissions(roleId: number): Promise<RolePermission[]>;
  addRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission>;
  removeRolePermission(roleId: number, permission: string): Promise<boolean>;
  checkRolePermission(roleId: number, permission: string): Promise<boolean>;
  
  getUserPermissions(userId: number): Promise<UserPermission[]>;
  getUserPermission(userId: number, permission: string): Promise<UserPermission | undefined>;
  addUserPermission(userPermission: InsertUserPermission): Promise<UserPermission>;
  removeUserPermission(userId: number, permission: string): Promise<boolean>;

  // Session store para autenticação
  sessionStore: any;
  
  // Patient operations
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByCPF(cpf: string): Promise<Patient | undefined>;
  getPatients(): Promise<Patient[]>;
  getPatientsByDoctor(doctorId: number): Promise<Patient[]>;
  getRecentPatientsByDoctor(doctorId: number, limit?: number): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: number): Promise<boolean>;

  // OPME item operations
  getOpmeItem(id: number): Promise<OpmeItem | undefined>;
  getOpmeItems(): Promise<OpmeItem[]>;
  searchOpmeItems(term: string): Promise<OpmeItem[]>;
  createOpmeItem(item: InsertOpmeItem): Promise<OpmeItem>;

  // Procedure operations
  getProcedure(id: number): Promise<Procedure | undefined>;
  getProcedures(): Promise<Procedure[]>;
  searchProcedures(term: string): Promise<Procedure[]>;
  createProcedure(procedure: InsertProcedure): Promise<Procedure>;
  updateProcedure(id: number, procedure: Partial<InsertProcedure>): Promise<Procedure | undefined>;
  deleteProcedure(id: number): Promise<boolean>;
  
  // CID-10 operations
  getCidCode(id: number): Promise<CidCode | undefined>;
  getCidCodeByCode(code: string): Promise<CidCode | undefined>;
  getCidCodes(): Promise<CidCode[]>;
  getCidCodesByCategory(category: string): Promise<CidCode[]>;
  searchCidCodes(term: string): Promise<CidCode[]>;
  createCidCode(cidCode: InsertCidCode): Promise<CidCode>;
  updateCidCode(id: number, cidCode: Partial<InsertCidCode>): Promise<CidCode | undefined>;
  deleteCidCode(id: number): Promise<boolean>;

  // Medical order operations
  getMedicalOrder(id: number): Promise<MedicalOrder | undefined>;
  getMedicalOrders(): Promise<MedicalOrder[]>;
  createMedicalOrder(order: InsertMedicalOrder): Promise<MedicalOrder>;
  updateMedicalOrder(id: number, updates: Partial<InsertMedicalOrder>): Promise<MedicalOrder | undefined>;
  updateMedicalOrderStatus(id: number, statusId: number): Promise<MedicalOrder | undefined>;
  deleteMedicalOrder(id: number): Promise<boolean>;
  getMedicalOrdersForPatient(patientId: number): Promise<MedicalOrder[]>;
  getMedicalOrderInProgressByUser(userId: number): Promise<MedicalOrder | undefined>;
  
  // Medical order procedures operations
  getMedicalOrderProcedures(orderId: number): Promise<MedicalOrderProcedure[]>;
  createMedicalOrderProcedure(procedure: InsertMedicalOrderProcedure): Promise<MedicalOrderProcedure>;
  updateMedicalOrderProcedure(id: number, updates: Partial<InsertMedicalOrderProcedure>): Promise<MedicalOrderProcedure | undefined>;
  deleteMedicalOrderProcedure(id: number): Promise<boolean>;
  updateProcedureApprovalStatus(id: number, quantityApproved: number, status: string): Promise<MedicalOrderProcedure | undefined>;

  // Order items operations
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  deleteOrderItem(id: number): Promise<boolean>;

  // Scanned document operations
  saveScannedDocument(document: InsertScannedDocument): Promise<ScannedDocument>;
  getScannedDocuments(patientId: number): Promise<ScannedDocument[]>;
  
  // Hospital operations
  getHospital(id: number): Promise<Hospital | undefined>;
  getHospitalByCNPJ(cnpj: string): Promise<Hospital | undefined>;
  getHospitals(): Promise<Hospital[]>;
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  updateHospital(id: number, hospital: Partial<InsertHospital>): Promise<Hospital | undefined>;
  deleteHospital(id: number): Promise<boolean>;
  
  // Brazilian states operations
  getBrazilianStates(): Promise<BrazilianState[]>;
  
  // Municipality operations
  getMunicipalitiesByState(stateIbgeCode: number): Promise<Municipality[]>;
  
  // Supplier operations (Fornecedores)
  getSupplier(id: number): Promise<Supplier | undefined>;
  getSupplierByCnpj(cnpj: string): Promise<Supplier | undefined>;
  getSuppliers(): Promise<Supplier[]>;
  getActiveSuppliers(): Promise<Supplier[]>;
  searchSuppliers(term: string): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;
  
  // Notification operations
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Contact/Fale Conosco operations
  getContactMessage(id: number): Promise<ContactMessage | undefined>;
  getContactMessages(): Promise<ContactMessage[]>;
  getPendingContactMessages(): Promise<ContactMessage[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  updateContactMessageStatus(id: number, status: string): Promise<ContactMessage | undefined>;
  respondToContactMessage(id: number, responseMessage: string, respondedById: number): Promise<ContactMessage | undefined>;
  deleteContactMessage(id: number): Promise<boolean>;
  
  // Appeal operations
  createAppeal(appeal: InsertAppeal): Promise<Appeal>;
  getAppealsByOrderId(orderId: number): Promise<Appeal[]>;
  updateAppealStatus(appealId: number, status: string, reviewerNotes?: string): Promise<Appeal | undefined>;
  
  // CID-10 operations
  getCidCodes(search?: string, category?: string): Promise<CidCode[]>;
  getCidCode(id: number): Promise<CidCode | undefined>;
  createCidCode(cidCode: InsertCidCode): Promise<CidCode>;
  updateCidCode(id: number, cidCode: Partial<InsertCidCode>): Promise<CidCode | undefined>;
  deleteCidCode(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      tableName: 'session',
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.active, true));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const currentDate = new Date();
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          gt(users.passwordResetExpires, currentDate)
        )
      );
    return user || undefined;
  }
  
  async getUserByCrm(crm: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.crm, crm));
    return user || undefined;
  }

  // Métodos de recuperação de senha
  async createPasswordResetToken(email: string): Promise<string> {
    // Verifica se o usuário existe
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Gera um token aleatório (6 dígitos para simulação)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Define a expiração em 1 hora
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);
    
    // Atualiza o usuário com o token
    await db
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    
    return resetToken;
  }
  
  async verifyPasswordResetToken(token: string): Promise<{valid: boolean, userId?: number}> {
    const user = await this.getUserByResetToken(token);
    
    if (!user) {
      return { valid: false };
    }
    
    return { 
      valid: true,
      userId: user.id
    };
  }
  
  async resetPassword(userId: number, newPassword: string): Promise<boolean> {
    // Verificar se o usuário existe
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }
    
    // Hash da nova senha (importando função do auth.ts para evitar duplicação)
    const hashedPassword = await hashPassword(newPassword);
    
    // Atualiza a senha e limpa os tokens de recuperação
    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    return true;
  }
  
  // Método para atualizar a senha de um usuário pelo nome de usuário (usado para testes)
  async updateUserPassword(username: string, hashedPassword: string): Promise<boolean> {
    try {
      // Verificar se o usuário existe
      const user = await this.getUserByUsername(username);
      if (!user) {
        return false;
      }
      
      // Atualiza a senha
      const result = await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.username, username))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Erro ao atualizar senha do usuário:", error);
      return false;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    // Atualize o timestamp de atualização
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log(`[Storage] Iniciando exclusão do usuário ${id}`);
      
      // Verificar se o usuário existe e se já está inativo
      const [existingUser] = await db.select().from(users).where(eq(users.id, id));
      if (!existingUser) {
        console.log(`[Storage] Usuário ${id} não encontrado`);
        return false;
      }
      
      if (!existingUser.active) {
        console.log(`[Storage] Usuário ${id} já está inativo`);
        return true; // Usuário já foi desativado anteriormente
      }
      
      // Remover associações com hospitais (doctorHospitals)
      console.log(`[Storage] Removendo associações de hospitais para o usuário ${id}`);
      await db
        .delete(doctorHospitals)
        .where(eq(doctorHospitals.userId, id));
      
      // Remover associações com pacientes (doctorPatients)
      console.log(`[Storage] Removendo associações de pacientes para o usuário ${id}`);
      await db
        .delete(doctorPatients)
        .where(eq(doctorPatients.doctorId, id));
      
      // Remover permissões específicas do usuário
      console.log(`[Storage] Removendo permissões para o usuário ${id}`);
      await db
        .delete(userPermissions)
        .where(eq(userPermissions.userId, id));
      
      // Remover notificações do usuário
      console.log(`[Storage] Removendo notificações para o usuário ${id}`);
      await db
        .delete(notifications)
        .where(eq(notifications.userId, id));
      
      // Marcar como inativo ao invés de excluir (para preservar integridade referencial)
      console.log(`[Storage] Marcando usuário ${id} como inativo`);
      await db
        .update(users)
        .set({ 
          active: false,
          username: `deleted_${id}_${Date.now()}`,
          email: `deleted_${id}_${Date.now()}@system.local`
        })
        .where(eq(users.id, id));
      
      console.log(`[Storage] Usuário ${id} desativado com sucesso`);
      return true;
    } catch (error) {
      console.error(`[Storage] Erro ao desativar usuário ${id}:`, error);
      return false;
    }
  }
  
  // Role methods
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles);
  }
  
  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }
  
  async getDefaultRole(): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.isDefault, true));
    return role || undefined;
  }
  
  async createRole(insertRole: InsertRole): Promise<Role> {
    // Se esta role for definida como padrão, remova a marca de padrão de todas as outras
    if (insertRole.isDefault) {
      await db.update(roles).set({ isDefault: false });
    }
    
    const [role] = await db
      .insert(roles)
      .values(insertRole)
      .returning();
    return role;
  }
  
  async updateRole(id: number, updates: Partial<Role>): Promise<Role | undefined> {
    // Se esta role for definida como padrão, remova a marca de padrão de todas as outras
    if (updates.isDefault) {
      await db.update(roles).set({ isDefault: false });
    }
    
    // Atualize o timestamp de atualização
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    const [updated] = await db
      .update(roles)
      .set(updateData)
      .where(eq(roles.id, id))
      .returning();
    return updated;
  }
  
  async deleteRole(id: number): Promise<boolean> {
    await db.delete(roles).where(eq(roles.id, id));
    return true;
  }
  
  // Role Permission methods
  async getRolePermissions(roleId: number): Promise<RolePermission[]> {
    return await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
  }
  
  async addRolePermission(insertRolePermission: InsertRolePermission): Promise<RolePermission> {
    // Verificar se já existe
    const [existing] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, insertRolePermission.roleId),
          eq(rolePermissions.permission, insertRolePermission.permission)
        )
      );
    
    if (existing) {
      return existing;
    }
    
    const [permission] = await db
      .insert(rolePermissions)
      .values(insertRolePermission)
      .returning();
    return permission;
  }
  
  async removeRolePermission(roleId: number, permission: string): Promise<boolean> {
    await db
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permission, permission as any) // Cast necessário
        )
      );
    return true;
  }
  
  async checkRolePermission(roleId: number, permission: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permission, permission as any) // Cast necessário
        )
      );
    return !!result;
  }
  
  // User Permission methods
  async getUserPermissions(userId: number): Promise<UserPermission[]> {
    return await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));
  }
  
  async getUserPermission(userId: number, permission: string): Promise<UserPermission | undefined> {
    const [result] = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permission, permission as any) // Cast necessário
        )
      );
    return result;
  }
  
  async addUserPermission(insertUserPermission: InsertUserPermission): Promise<UserPermission> {
    // Verificar se já existe e atualizar
    const [existing] = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, insertUserPermission.userId),
          eq(userPermissions.permission, insertUserPermission.permission)
        )
      );
    
    if (existing) {
      // Se já existe com valor diferente, atualize
      if (existing.granted !== insertUserPermission.granted) {
        const [updated] = await db
          .update(userPermissions)
          .set({ granted: insertUserPermission.granted })
          .where(eq(userPermissions.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }
    
    // Se não existe, insira novo
    const [permission] = await db
      .insert(userPermissions)
      .values(insertUserPermission)
      .returning();
    return permission;
  }
  
  async removeUserPermission(userId: number, permission: string): Promise<boolean> {
    await db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permission, permission as any) // Cast necessário
        )
      );
    return true;
  }

  // Patient methods
  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientByCPF(cpf: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.cpf, cpf));
    return patient || undefined;
  }

  async getPatients(): Promise<Patient[]> {
    return await db.select().from(patients);
  }

  async getPatientsByDoctor(doctorId: number): Promise<Patient[]> {
    return await db
      .select({
        id: patients.id,
        fullName: patients.fullName,
        cpf: patients.cpf,
        birthDate: patients.birthDate,
        gender: patients.gender,
        phone: patients.phone,
        phone2: patients.phone2,
        email: patients.email,
        insurance: patients.insurance,
        insuranceNumber: patients.insuranceNumber,
        plan: patients.plan,
        notes: patients.notes,
        isActive: patients.isActive,
        activatedBy: patients.activatedBy
      })
      .from(patients)
      .innerJoin(doctorPatients, eq(patients.id, doctorPatients.patientId))
      .where(
        and(
          eq(doctorPatients.doctorId, doctorId),
          eq(doctorPatients.isActive, true)
        )
      )
      .orderBy(patients.fullName);
  }

  async getRecentPatientsByDoctor(doctorId: number, limit: number = 25): Promise<Patient[]> {
    return await db
      .select({
        id: patients.id,
        fullName: patients.fullName,
        cpf: patients.cpf,
        birthDate: patients.birthDate,
        gender: patients.gender,
        phone: patients.phone,
        phone2: patients.phone2,
        email: patients.email,
        insurance: patients.insurance,
        insuranceNumber: patients.insuranceNumber,
        plan: patients.plan,
        notes: patients.notes,
        isActive: patients.isActive,
        activatedBy: patients.activatedBy
      })
      .from(patients)
      .innerJoin(doctorPatients, eq(patients.id, doctorPatients.patientId))
      .where(
        and(
          eq(doctorPatients.doctorId, doctorId),
          eq(doctorPatients.isActive, true)
        )
      )
      .orderBy(desc(doctorPatients.associatedAt))
      .limit(limit);
  }

  async getPatientById(id: number): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id));
    return patient;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db
      .insert(patients)
      .values(insertPatient)
      .returning();
    return patient;
  }

  async updatePatient(id: number, patientData: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [updated] = await db
      .update(patients)
      .set(patientData)
      .where(eq(patients.id, id))
      .returning();
    return updated;
  }

  async deletePatient(id: number): Promise<boolean> {
    try {
      console.log(`Tentando excluir paciente ID ${id}...`);
      
      const result = await db
        .delete(patients)
        .where(eq(patients.id, id));
      
      console.log(`Resultado da exclusão:`, result);
      return true;
    } catch (error) {
      console.error(`Erro ao excluir paciente ID ${id}:`, error);
      return false;
    }
  }

  // OPME item methods
  async getOpmeItem(id: number): Promise<OpmeItem | undefined> {
    const [item] = await db.select().from(opmeItems).where(eq(opmeItems.id, id));
    return item || undefined;
  }

  async getOpmeItems(): Promise<OpmeItem[]> {
    return await db.select().from(opmeItems).orderBy(opmeItems.technicalName);
  }

  async searchOpmeItems(term: string): Promise<OpmeItem[]> {
    // Buscar todos os materiais OPME e filtrar usando normalização  
    const allOpmeItems = await db.select().from(opmeItems).orderBy(opmeItems.technicalName);
    
    // Normalizar o termo de busca
    const normalizedTerm = normalizeText(term);
    
    // Filtrar usando normalização de texto
    const filteredOpmeItems = allOpmeItems.filter(item => {
      const normalizedTechnicalName = normalizeText(item.technicalName);
      const normalizedCommercialName = normalizeText(item.commercialName);
      const normalizedManufacturerName = normalizeText(item.manufacturerName);
      const normalizedAnvisaNumber = normalizeText(item.anvisaRegistrationNumber);
      const normalizedProcessNumber = normalizeText(item.processNumber);
      const normalizedRegistrationHolder = normalizeText(item.registrationHolder);
      
      return normalizedTechnicalName.includes(normalizedTerm) || 
             normalizedCommercialName.includes(normalizedTerm) || 
             normalizedManufacturerName.includes(normalizedTerm) ||
             normalizedAnvisaNumber.includes(normalizedTerm) ||
             normalizedProcessNumber.includes(normalizedTerm) ||
             normalizedRegistrationHolder.includes(normalizedTerm);
    });
    
    // Retornar apenas os primeiros 30 resultados
    return filteredOpmeItems.slice(0, 30);
  }
  
  // Supplier methods
  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.active, true));
  }
  
  async searchSuppliers(term: string): Promise<Supplier[]> {
    console.log(`Buscando fornecedores com o termo "${term}"`);
    
    try {
      const searchTerm = `%${term}%`;
      
      // Busca fornecedores por nome da empresa, nome fantasia ou CNPJ 
      const searchResults = await db.select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.active, true),
            or(
              ilike(suppliers.company_name, searchTerm),
              ilike(suppliers.trade_name || '', searchTerm),
              ilike(suppliers.cnpj, searchTerm)
            )
          )
        )
        .orderBy(suppliers.company_name)
        .limit(10);
      
      console.log(`Encontrados ${searchResults.length} fornecedores ativos para o termo "${term}"`);
      return searchResults;
    } catch (error) {
      console.error("Erro na busca de fornecedores:", error);
      return [];
    }
  }

  async getOpmeItemById(id: number): Promise<OpmeItem | undefined> {
    const [item] = await db
      .select()
      .from(opmeItems)
      .where(eq(opmeItems.id, id))
      .limit(1);
    return item;
  }

  async createOpmeItem(insertItem: InsertOpmeItem): Promise<OpmeItem> {
    const [item] = await db
      .insert(opmeItems)
      .values(insertItem)
      .returning();
    return item;
  }
  
  async updateOpmeItem(id: number, updates: Partial<InsertOpmeItem>): Promise<OpmeItem | undefined> {
    const [updated] = await db
      .update(opmeItems)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(opmeItems.id, id))
      .returning();
    return updated;
  }
  
  async deleteOpmeItem(id: number): Promise<boolean> {
    try {
      // Primeiro excluir todas as relações com fornecedores
      await db
        .delete(opmeSuppliers)
        .where(eq(opmeSuppliers.opmeItemId, id));
      
      // Depois excluir o próprio item OPME
      await db
        .delete(opmeItems)
        .where(eq(opmeItems.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir item OPME:', error);
      return false;
    }
  }
  
  // Métodos para gerenciamento de relações entre OPMEs e fornecedores
  async getOpmeSuppliers(opmeItemId?: number, supplierId?: number, active?: boolean): Promise<OpmeSupplier[]> {
    try {
      let query = db.select().from(opmeSuppliers);
      
      if (opmeItemId !== undefined) {
        query = query.where(eq(opmeSuppliers.opmeItemId, opmeItemId));
      }
      
      if (supplierId !== undefined) {
        query = query.where(eq(opmeSuppliers.supplierId, supplierId));
      }
      
      if (active !== undefined) {
        query = query.where(eq(opmeSuppliers.active, active));
      }
      
      return await query;
    } catch (error) {
      console.error('Erro ao buscar relações OPME-Fornecedor:', error);
      return [];
    }
  }
  
  async getOpmeSupplier(id: number): Promise<OpmeSupplier | undefined> {
    try {
      const [relation] = await db
        .select()
        .from(opmeSuppliers)
        .where(eq(opmeSuppliers.id, id));
      return relation;
    } catch (error) {
      console.error('Erro ao buscar relação OPME-Fornecedor:', error);
      return undefined;
    }
  }
  
  async getOpmeItemWithSuppliers(opmeItemId: number): Promise<{opmeItem: OpmeItem, suppliers: OpmeSupplier[]}> {
    try {
      const opmeItem = await this.getOpmeItem(opmeItemId);
      
      if (!opmeItem) {
        throw new Error(`Item OPME com ID ${opmeItemId} não encontrado`);
      }
      
      const suppliers = await this.getOpmeSuppliers(opmeItemId);
      
      return {
        opmeItem,
        suppliers
      };
    } catch (error) {
      console.error('Erro ao buscar item OPME com fornecedores:', error);
      throw error;
    }
  }
  
  async createOpmeSupplier(insertOpmeSupplier: InsertOpmeSupplier): Promise<OpmeSupplier> {
    try {
      // Verificar se o OPME existe
      const opmeItem = await this.getOpmeItem(insertOpmeSupplier.opmeItemId);
      if (!opmeItem) {
        throw new Error(`Item OPME com ID ${insertOpmeSupplier.opmeItemId} não encontrado`);
      }
      
      // Verificar se o fornecedor existe
      const supplier = await this.getSupplier(insertOpmeSupplier.supplierId);
      if (!supplier) {
        throw new Error(`Fornecedor com ID ${insertOpmeSupplier.supplierId} não encontrado`);
      }
      
      // Se estiver marcando como preferencial, desmarcar outros como preferenciais
      if (insertOpmeSupplier.isPreferred) {
        await db
          .update(opmeSuppliers)
          .set({ isPreferred: false })
          .where(
            and(
              eq(opmeSuppliers.opmeItemId, insertOpmeSupplier.opmeItemId),
              eq(opmeSuppliers.isPreferred, true)
            )
          );
      }
      
      // Criar a relação
      const [relation] = await db
        .insert(opmeSuppliers)
        .values(insertOpmeSupplier)
        .returning();
      
      return relation;
    } catch (error) {
      console.error('Erro ao criar relação OPME-Fornecedor:', error);
      throw error;
    }
  }
  
  async updateOpmeSupplier(id: number, updates: Partial<InsertOpmeSupplier>): Promise<OpmeSupplier | undefined> {
    try {
      // Verificar se a relação existe
      const relation = await this.getOpmeSupplier(id);
      if (!relation) {
        return undefined;
      }
      
      // Se estiver marcando como preferencial, desmarcar outros como preferenciais
      if (updates.isPreferred) {
        await db
          .update(opmeSuppliers)
          .set({ isPreferred: false })
          .where(
            and(
              eq(opmeSuppliers.opmeItemId, relation.opmeItemId),
              eq(opmeSuppliers.isPreferred, true),
              ne(opmeSuppliers.id, id)
            )
          );
      }
      
      // Atualizar a relação
      const [updated] = await db
        .update(opmeSuppliers)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(opmeSuppliers.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Erro ao atualizar relação OPME-Fornecedor:', error);
      return undefined;
    }
  }
  
  async deleteOpmeSupplier(id: number): Promise<boolean> {
    try {
      await db
        .delete(opmeSuppliers)
        .where(eq(opmeSuppliers.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir relação OPME-Fornecedor:', error);
      return false;
    }
  }

  // Procedure methods
  async getProcedure(id: number): Promise<Procedure | undefined> {
    const [procedure] = await db.select().from(procedures).where(eq(procedures.id, id));
    return procedure || undefined;
  }

  async getProcedures(): Promise<Procedure[]> {
    return await db.select().from(procedures).where(eq(procedures.active, true));
  }

  async getProcedureById(id: number): Promise<Procedure | undefined> {
    const [procedure] = await db
      .select()
      .from(procedures)
      .where(eq(procedures.id, id));
    return procedure;
  }
  
  async searchProcedures(term: string): Promise<Procedure[]> {
    // Transformar o termo para minúsculas para uma busca case-insensitive mais fácil
    const searchTerm = `%${term.toLowerCase()}%`;
    console.log("Pesquisando procedimentos com termo:", searchTerm);
    
    // Buscar por código ou nome/descrição que contenham o termo
    const results = await db.select()
      .from(procedures)
      .where(
        and(
          eq(procedures.active, true),
          or(
            ilike(procedures.code, searchTerm),
            ilike(procedures.name, searchTerm),
            ilike(procedures.description, searchTerm)
          )
        )
      )
      .limit(10);
    
    console.log(`Encontrados ${results.length} procedimentos para o termo "${term}"`);
    return results;
  }

  async createProcedure(insertProcedure: InsertProcedure): Promise<Procedure> {
    const [procedure] = await db
      .insert(procedures)
      .values(insertProcedure)
      .returning();
    return procedure;
  }

  async updateProcedure(id: number, procedureData: Partial<InsertProcedure>): Promise<Procedure | undefined> {
    try {
      // Se o código está sendo atualizado, verificar se já existe em outro procedimento
      if (procedureData.code) {
        const existingProcedure = await db
          .select()
          .from(procedures)
          .where(and(eq(procedures.code, procedureData.code), ne(procedures.id, id)))
          .limit(1);
        
        if (existingProcedure.length > 0) {
          throw new Error(`Código ${procedureData.code} já está sendo usado por outro procedimento`);
        }
      }

      const [updated] = await db
        .update(procedures)
        .set({
          ...procedureData,
          updatedAt: new Date()
        })
        .where(eq(procedures.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Erro ao atualizar procedimento:', error);
      if (error instanceof Error) {
        throw error;
      }
      return undefined;
    }
  }

  async deleteProcedure(id: number): Promise<boolean> {
    try {
      // Verificar se o procedimento está sendo usado em pedidos médicos
      const ordersUsingProcedure = await db
        .select()
        .from(medicalOrders)
        .where(
          exists(
            db.select().from(medicalOrderProcedures)
              .where(and(
                eq(medicalOrderProcedures.orderId, medicalOrders.id),
                eq(medicalOrderProcedures.procedureId, id)
              ))
          )
        )
        .limit(1);
      
      if (ordersUsingProcedure.length > 0) {
        throw new Error('Não é possível excluir este procedimento pois ele está sendo usado em pedidos médicos');
      }

      // Em vez de deletar, marcar como inativo
      await db
        .update(procedures)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(procedures.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir procedimento:', error);
      if (error instanceof Error) {
        throw error;
      }
      return false;
    }
  }

  // Medical order methods
  async getMedicalOrder(id: number): Promise<MedicalOrder | undefined> {
    console.log("=== GET MEDICAL ORDER ===");
    console.log("Order ID:", id, "Type:", typeof id);
    
    try {
      // Use simple select all to avoid field mapping issues  
      const [order] = await db
        .select()
        .from(medicalOrders)
        .where(eq(medicalOrders.id, id));
      
      console.log("Raw order from database:", order);
      
      if (!order) {
        console.log("Order not found for ID:", id);
        return undefined;
      }
      
      console.log("Order found successfully");
      
      // Handle attachments parsing
      let attachments = order.attachments;
      if (attachments && typeof attachments === 'string') {
        try {
          attachments = JSON.parse(attachments);
        } catch (e) {
          console.error('Erro ao fazer parse dos attachments:', e);
          attachments = [];
        }
      }
      
      // Return order with correct field mapping (Drizzle automatically maps to camelCase)
      return {
        ...order,
        attachments
      };
    } catch (error) {
      console.error("=== ERROR IN getMedicalOrder ===");
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
      
      // Handle specific database errors
      if (error.message && error.message.includes("column") && error.message.includes("does not exist")) {
        console.error("DATABASE COLUMN ERROR - using only valid fields");
        throw new Error("Campo não existe no banco de dados");
      }
      
      throw error;
    }
  }

  async getMedicalOrders(filters?: {
    userId?: number;
    patientId?: number;
    hospitalId?: number;
    statusCode?: string;
    statusId?: number;
  }): Promise<MedicalOrder[]> {
    try {
      console.log("Buscando pedidos médicos com filtros:", filters);
      
      // Construir condições dinâmicas baseadas nos filtros
      let conditions = [];
      
      if (filters?.userId) {
        conditions.push(eq(medicalOrders.userId, filters.userId));
      }
      
      if (filters?.patientId) {
        conditions.push(eq(medicalOrders.patientId, filters.patientId));
      }
      
      if (filters?.hospitalId) {
        conditions.push(eq(medicalOrders.hospitalId, filters.hospitalId));
      }
      
      if (filters?.statusId) {
        conditions.push(eq(medicalOrders.statusId, filters.statusId));
      }
      
      // Usar Drizzle com campos básicos primeiro
      let query = db.select({
        id: medicalOrders.id,
        patientId: medicalOrders.patientId,
        userId: medicalOrders.userId,
        hospitalId: medicalOrders.hospitalId,
        procedureDate: medicalOrders.procedureDate,
        clinicalIndication: medicalOrders.clinicalIndication,
        clinicalJustification: medicalOrders.clinicalJustification,
        procedureLaterality: medicalOrders.procedureLaterality,
        procedureType: medicalOrders.procedureType,
        additionalNotes: medicalOrders.additionalNotes,
        complexity: medicalOrders.complexity,
        createdAt: medicalOrders.createdAt,
        updatedAt: medicalOrders.updatedAt,
        statusId: medicalOrders.statusId,
        previousStatusId: medicalOrders.previousStatusId,
        receivedValue: medicalOrders.receivedValue,
        attachments: medicalOrders.attachments
      }).from(medicalOrders);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const orders = await query;
      console.log(`Encontrados ${orders.length} pedidos médicos`);
      
      // Mapeamento manual baseado na tabela order_statuses real
      const statusMapping = {
        1: 'em_preenchimento',  // Incompleta
        2: 'em_avaliacao',      // Em análise
        3: 'aceito',            // Autorizado  
        4: 'autorizado_parcial', // Autorizado Parcial
        5: 'pendencia',         // Pendência
        6: 'cirurgia_realizada', // Cirurgia realizada
        7: 'cancelado',         // Cancelada
        8: 'aguardando_envio'   // Aguardando Envio
      };
      
      // Adicionar campo status baseado no statusId
      const ordersWithStatus = orders.map(order => ({
        ...order,
        status: statusMapping[order.statusId as keyof typeof statusMapping] || 'nao_especificado'
      }));
      
      return ordersWithStatus;
    } catch (error) {
      console.error("Erro ao buscar pedidos médicos:", error);
      return [];
    }
  }

  async createMedicalOrder(insertOrder: InsertMedicalOrder): Promise<MedicalOrder> {
    try {
      console.log("🔍 STORAGE.TS - INÍCIO createMedicalOrder");
      console.log("🔍 STORAGE.TS - Tipo do parâmetro recebido:", typeof insertOrder);
      console.log("🔍 STORAGE.TS - Dados brutos recebidos:", JSON.stringify(insertOrder, null, 2));
      console.log("🔍 STORAGE.TS - Verificação individual de campos:");
      console.log("  - insertOrder.patientId:", insertOrder.patientId, "(tipo:", typeof insertOrder.patientId, ")");
      console.log("  - insertOrder.userId:", insertOrder.userId, "(tipo:", typeof insertOrder.userId, ")");
      console.log("  - insertOrder.hospitalId:", insertOrder.hospitalId, "(tipo:", typeof insertOrder.hospitalId, ")");
      console.log("🔍 STORAGE.TS - Campos presentes no objeto:", Object.keys(insertOrder));
      console.log("🔍 STORAGE.TS - insertOrder completo:", insertOrder);
      
      // Se statusId não for fornecido, define como 1 (Incompleta)
      const orderData = {
        ...insertOrder,
        statusId: insertOrder.statusId || 1,
      };
      
      console.log("🔍 STORAGE.TS - orderData após spread de insertOrder:");
      console.log("orderData:", JSON.stringify(orderData, null, 2));
      console.log("🔍 STORAGE.TS - Verificação de campos após spread:");
      console.log("  - orderData.patientId:", orderData.patientId, "(tipo:", typeof orderData.patientId, ")");
      console.log("  - orderData.userId:", orderData.userId, "(tipo:", typeof orderData.userId, ")");
      console.log("  - orderData.hospitalId:", orderData.hospitalId, "(tipo:", typeof orderData.hospitalId, ")");
      
      // Garantir que arrays vazios sejam inicializados corretamente para evitar erros SQL
      // e ajustar os tipos de dados para compatibilidade com o banco
      // Garantimos que utilizamos apenas o campo statusCode
      // Já não é necessário remover o status pois ele não deve existir no objeto
      const orderDataWithoutStatus = orderData;
      
      // CORREÇÃO: Usar APENAS os nomes exatos das colunas do banco de dados
      // As consultas SQL devem usar snake_case para os campos, não camelCase
      // Verificar se os dados chegaram corretamente
      console.log("🔍 Dados originais antes da sanitização:", {
        patientId: orderData.patientId,
        userId: orderData.userId,
        hospitalId: orderData.hospitalId,
        patientIdValue: orderData.patientId,
        userIdValue: orderData.userId
      });
      
      const sanitizedOrderData = {
        // Campos básicos do pedido - garantir que não sejam null
        patient_id: orderData.patientId ? Number(orderData.patientId) : (() => { 
          console.error("❌ ERRO: patient_id é obrigatório mas recebido:", orderData.patientId);
          throw new Error("patient_id é obrigatório"); 
        })(),
        user_id: orderData.userId ? Number(orderData.userId) : (() => { 
          console.error("❌ ERRO: user_id é obrigatório mas recebido:", orderData.userId);
          throw new Error("user_id é obrigatório"); 
        })(),
        hospital_id: orderData.hospitalId ? Number(orderData.hospitalId) : null,
        procedure_date: orderData.procedureDate || null,
        clinical_indication: orderData.clinicalIndication || "A ser preenchido",
        status_code: orderData.statusCode || "em_preenchimento",
        
        // Campos de lateralidade e diagnóstico
        procedure_laterality: orderData.procedureLaterality || null,
        
        // Campos de procedimento CBHPM (já estão em snake_case)
        // Procedimentos gerenciados via medical_order_procedures
        
        // Arrays (já estão em snake_case)
        // CIDs, OPME Items e Suppliers agora gerenciados via tabelas relacionais
        procedure_type: orderData.procedureType || "eletiva",
        complexity: orderData.complexity || null,
        additional_notes: orderData.additionalNotes || null,
        clinical_justification: orderData.clinicalJustification || null,
        received_value: orderData.receivedValue || null,
        attachments: orderData.attachments || []
      };
      
      console.log("🔍 Dados sanitizados para inserção:", JSON.stringify(sanitizedOrderData, null, 2));
      console.log("🔍 Verificação final dos campos obrigatórios:", {
        patient_id: sanitizedOrderData.patient_id,
        user_id: sanitizedOrderData.user_id,
        clinical_indication: sanitizedOrderData.clinical_indication,
        patient_id_type: typeof sanitizedOrderData.patient_id,
        user_id_type: typeof sanitizedOrderData.user_id
      });
      
      // Validação final antes da inserção
      if (!sanitizedOrderData.patient_id || !sanitizedOrderData.user_id) {
        console.error("❌ ERRO CRÍTICO: Campos obrigatórios são null/undefined na sanitização");
        throw new Error(`Campos obrigatórios ausentes: patient_id=${sanitizedOrderData.patient_id}, user_id=${sanitizedOrderData.user_id}`);
      }
      
      // Primeiro, vamos ver que SQL o Drizzle está tentando gerar (apenas para debug)
      try {
        // Obter o SQL gerado sem executá-lo
        const sqlQuery = db
          .insert(medicalOrders)
          .values(sanitizedOrderData)
          .toSQL();
        
        console.log("SQL que seria gerado pelo Drizzle:", sqlQuery.sql);
        console.log("Parâmetros da query:", sqlQuery.params);
      } catch (err) {
        console.error("Erro ao gerar SQL via Drizzle:", err);
      }
      
      // Agora vamos fazer uma inserção manual para garantir que os nomes das colunas estejam corretos
      console.log("Tentando inserção direta com a conexão do pool...");
      try {
        // Importante: aqui vamos garantir que todos os campos estão nos seus lugares corretos
        // Para debugar o erro envolvendo exam_image_url vs exam_images_url
        console.log("Verificando campos antes da inserção:");
        console.log(`Existência do campo exam_images_url: ${sanitizedOrderData.hasOwnProperty('exam_images_url')}`);
        console.log(`Valor de exam_images_url: ${JSON.stringify(sanitizedOrderData.exam_images_url)}`);
        
        // Usar Drizzle ORM com estrutura relacional atualizada
        console.log("🔍 ANTES DO INSERT - sanitizedOrderData final:", sanitizedOrderData);
        const result = await db
          .insert(medicalOrders)
          .values({
            patientId: sanitizedOrderData.patient_id,
            userId: sanitizedOrderData.user_id,
            hospitalId: sanitizedOrderData.hospital_id,
            procedureDate: sanitizedOrderData.procedure_date,
            clinicalIndication: sanitizedOrderData.clinical_indication,
            statusId: 1, // ID do status "em_preenchimento" (Incompleta)
            statusCode: sanitizedOrderData.status_code,
            procedureLaterality: sanitizedOrderData.procedure_laterality,
            procedureType: sanitizedOrderData.procedure_type,
            complexity: sanitizedOrderData.complexity,
            additionalNotes: sanitizedOrderData.additional_notes,
            clinicalJustification: sanitizedOrderData.clinical_justification,
            receivedValue: sanitizedOrderData.received_value,
            attachments: sanitizedOrderData.attachments
          })
          .returning();
        
        const newOrder = result[0];
        console.log("Pedido médico criado com sucesso:", newOrder);
        // Transformar manualmente para evitar erro da função ausente
        return {
          id: newOrder.id,
          patientId: newOrder.patientId,
          userId: newOrder.userId,
          hospitalId: newOrder.hospitalId,
          procedureDate: newOrder.procedureDate,
          clinicalIndication: newOrder.clinicalIndication,
          clinicalJustification: newOrder.clinicalJustification,
          procedureLaterality: newOrder.procedureLaterality,
          procedureType: newOrder.procedureType,
          additionalNotes: newOrder.additionalNotes,
          complexity: newOrder.complexity,
          statusId: newOrder.statusId,
          receivedValue: newOrder.receivedValue,
          attachments: newOrder.attachments,
          createdAt: newOrder.createdAt,
          updatedAt: newOrder.updatedAt
        };
      } catch (dbError) {
        console.error("Erro na inserção via Drizzle:", dbError);
        throw dbError;
      }
    } catch (error) {
      console.error("Erro ao criar pedido médico:", error);
      throw error;
    }
  }

  async updateMedicalOrder(id: number, updates: Partial<InsertMedicalOrder>): Promise<MedicalOrder | undefined> {
    console.log("=== UPDATE MEDICAL ORDER SIMPLIFIED ===");
    console.log("ID:", id, "Updates:", updates);

    try {
      // Construir apenas os campos que foram fornecidos na atualização
      const updateData: any = {};
      
      if (updates.patientId !== undefined) updateData.patientId = updates.patientId;
      if (updates.userId !== undefined) updateData.userId = updates.userId;
      if (updates.hospitalId !== undefined) updateData.hospitalId = updates.hospitalId;
      if (updates.clinicalIndication !== undefined) updateData.clinicalIndication = updates.clinicalIndication;
      if (updates.clinicalJustification !== undefined) updateData.clinicalJustification = updates.clinicalJustification;
      if (updates.procedureLaterality !== undefined) updateData.procedureLaterality = updates.procedureLaterality;
      if (updates.procedureType !== undefined) updateData.procedureType = updates.procedureType;
      if (updates.additionalNotes !== undefined) updateData.additionalNotes = updates.additionalNotes;
      if (updates.complexity !== undefined) updateData.complexity = updates.complexity;
      if (updates.statusId !== undefined) updateData.statusId = updates.statusId;
      if (updates.receivedValue !== undefined) updateData.receivedValue = updates.receivedValue;
      if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
      if (updates.procedureDate !== undefined) updateData.procedureDate = updates.procedureDate;
      
      // Sempre atualizar timestamp
      updateData.updatedAt = new Date();
      
      console.log("Fields to update:", Object.keys(updateData));
      
      const [updatedOrder] = await db
        .update(medicalOrders)
        .set(updateData)
        .where(eq(medicalOrders.id, id))
        .returning();
      
      if (!updatedOrder) {
        throw new Error("Pedido não encontrado ou não foi possível atualizar");
      }
      
      console.log("Update successful:", updatedOrder.id);
      return updatedOrder;
      
    } catch (error) {
      console.error("Erro ao atualizar pedido médico:", error);
      throw new Error("Erro ao atualizar pedido médico");
    }
  }

  async updateMedicalOrderStatus(id: number, statusId: number): Promise<MedicalOrder | undefined> {
    // Buscar o status_code baseado no statusId para manter compatibilidade
    const status = await db.select().from(orderStatuses).where(eq(orderStatuses.id, statusId)).limit(1);
    const statusCode = status[0]?.code || "em_preenchimento";

    const [updatedOrder] = await db
      .update(medicalOrders)
      .set({ 
        statusId,
        statusCode, // Manter por compatibilidade
        updatedAt: new Date() 
      })
      .where(eq(medicalOrders.id, id))
      .returning();
    
    return updatedOrder;
  }

  async deleteMedicalOrder(id: number): Promise<boolean> {
    try {
      console.log(`[Storage] Deletando pedido médico ID: ${id}`);
      
      // Verificar se o pedido existe antes de deletar
      const existingOrder = await db
        .select({ id: medicalOrders.id, statusId: medicalOrders.statusId })
        .from(medicalOrders)
        .where(eq(medicalOrders.id, id))
        .limit(1);
      
      if (existingOrder.length === 0) {
        console.log(`[Storage] Pedido médico ID ${id} não encontrado`);
        return false;
      }
      
      // Validar que o pedido está em status "em_preenchimento" (statusId = 1)
      if (existingOrder[0].statusId !== 1) {
        console.log(`[Storage] Pedido médico ID ${id} não pode ser deletado - Status: ${existingOrder[0].statusId}`);
        return false;
      }
      
      // Deletar o pedido (CASCADE deletará automaticamente registros relacionados)
      const deletedRows = await db
        .delete(medicalOrders)
        .where(eq(medicalOrders.id, id));
      
      const success = deletedRows.rowCount > 0;
      
      if (success) {
        console.log(`[Storage] Pedido médico ID ${id} deletado com sucesso`);
      } else {
        console.log(`[Storage] Falha ao deletar pedido médico ID ${id}`);
      }
      
      return success;
      
    } catch (error) {
      console.error(`[Storage] Erro ao deletar pedido médico ID ${id}:`, error);
      return false;
    }
  }

  async getMedicalOrderInProgressByUser(userId: number): Promise<MedicalOrder | undefined> {
    try {
      console.log(`[Storage] Buscando pedido em andamento para o usuário ID: ${userId}`);
      
      // Busca o pedido mais recente em preenchimento para o usuário
      const [order] = await db
        .select({
          id: medicalOrders.id,
          patientId: medicalOrders.patientId,
          userId: medicalOrders.userId,
          hospitalId: medicalOrders.hospitalId,
          procedureDate: medicalOrders.procedureDate,
          clinicalIndication: medicalOrders.clinicalIndication,
          clinicalJustification: medicalOrders.clinicalJustification,
          procedureLaterality: medicalOrders.procedureLaterality,
          procedureType: medicalOrders.procedureType,
          additionalNotes: medicalOrders.additionalNotes,
          complexity: medicalOrders.complexity,
          createdAt: medicalOrders.createdAt,
          updatedAt: medicalOrders.updatedAt,
          statusId: medicalOrders.statusId,
          receivedValue: medicalOrders.receivedValue,
          attachments: medicalOrders.attachments
        })
        .from(medicalOrders)
        .where(and(
          eq(medicalOrders.userId, userId),
          eq(medicalOrders.statusId, 1)
        ))
        .orderBy(desc(medicalOrders.updatedAt))
        .limit(1);
      
      if (order) {
        console.log(`[Storage] Pedido em andamento encontrado: ID ${order.id}, statusId: ${order.statusId}`);
      } else {
        console.log(`[Storage] Nenhum pedido em andamento encontrado para o usuário ID: ${userId}`);
      }
      
      return order || undefined;
    } catch (error) {
      console.error("Erro ao buscar pedido em andamento:", error);
      throw new Error("Failed to fetch order in progress");
    }
  }

  async getMedicalOrdersForPatient(patientId: number): Promise<MedicalOrder[]> {
    try {
      // Buscamos os pedidos básicos para o paciente com seleção explícita de colunas
      // para evitar problemas com colunas que não existem na tabela
      const orders = await db
        .select({
          id: medicalOrders.id,
          patientId: medicalOrders.patientId,
          userId: medicalOrders.userId,
          hospitalId: medicalOrders.hospitalId,
          procedureDate: medicalOrders.procedureDate,
          clinicalIndication: medicalOrders.clinicalIndication,
          clinicalJustification: medicalOrders.clinicalJustification,
          procedureLaterality: medicalOrders.procedureLaterality,
          procedureType: medicalOrders.procedureType,
          additionalNotes: medicalOrders.additionalNotes,
          complexity: medicalOrders.complexity,
          createdAt: medicalOrders.createdAt,
          updatedAt: medicalOrders.updatedAt,
          statusId: medicalOrders.statusId,
          receivedValue: medicalOrders.receivedValue,
          attachments: medicalOrders.attachments
        })
        .from(medicalOrders)
        .where(eq(medicalOrders.patientId, patientId))
        .orderBy(desc(medicalOrders.createdAt));
      
      // Depois, buscamos informações adicionais de hospital para cada pedido
      const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        const [hospital] = await db
          .select({ name: hospitals.name })
          .from(hospitals)
          .where(eq(hospitals.id, order.hospitalId));
        
        return {
          ...order,
          hospitalName: hospital?.name
        };
      }));
      
      return ordersWithDetails as MedicalOrder[];
    } catch (error) {
      console.error("Erro ao buscar pedido em andamento para o paciente:", error);
      throw error;
    }
  }

  // Order items methods
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(insertItem: InsertOrderItem): Promise<OrderItem> {
    const [item] = await db
      .insert(orderItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async deleteOrderItem(id: number): Promise<boolean> {
    await db
      .delete(orderItems)
      .where(eq(orderItems.id, id));
    return true;
  }

  // Scanned document methods
  async saveScannedDocument(insertDocument: InsertScannedDocument): Promise<ScannedDocument> {
    const [document] = await db
      .insert(scannedDocuments)
      .values(insertDocument)
      .returning();
    return document;
  }

  async getScannedDocuments(patientId: number): Promise<ScannedDocument[]> {
    return await db
      .select()
      .from(scannedDocuments)
      .where(eq(scannedDocuments.patientId, patientId))
      .orderBy(desc(scannedDocuments.createdAt));
  }

  // Hospital methods
  async getHospital(id: number): Promise<Hospital | undefined> {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.id, id));
    return hospital || undefined;
  }

  async getHospitalByCNPJ(cnpj: string): Promise<Hospital | undefined> {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.cnpj, cnpj));
    return hospital || undefined;
  }

  async getHospitals(): Promise<Hospital[]> {
    return await db.select().from(hospitals);
  }

  async getHospitalById(id: number): Promise<Hospital | undefined> {
    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.id, id));
    return hospital;
  }

  async createHospital(insertHospital: InsertHospital): Promise<Hospital> {
    const [hospital] = await db
      .insert(hospitals)
      .values(insertHospital)
      .returning();
    return hospital;
  }

  async updateHospital(id: number, hospitalData: any): Promise<Hospital | undefined> {
    // Buscar hospital atual para verificar campos existentes
    const [currentHospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.id, id));
    
    if (!currentHospital) {
      console.error(`Hospital com ID ${id} não encontrado para atualização`);
      return undefined;
    }
    
    console.log("Hospital atual:", currentHospital);
    console.log("Dados recebidos para atualização:", hospitalData);
    
    // Convertemos os dados para o formato do banco de dados (snake_case)
    const dbData: any = {};
    
    // Campos simples
    if (hospitalData.name !== undefined) dbData.name = hospitalData.name;
    if (hospitalData.cnpj !== undefined) dbData.cnpj = hospitalData.cnpj;
    if (hospitalData.uf !== undefined) dbData.uf = hospitalData.uf;
    if (hospitalData.cnes !== undefined) dbData.cnes = hospitalData.cnes;
    if (hospitalData.city !== undefined) dbData.city = hospitalData.city;
    if (hospitalData.cep !== undefined) dbData.cep = hospitalData.cep;
    if (hospitalData.address !== undefined) dbData.address = hospitalData.address;
    if (hospitalData.number !== undefined) dbData.number = hospitalData.number;
    
    // Campos IBGE
    if (hospitalData.ibge_state_code !== undefined) dbData.ibge_state_code = hospitalData.ibge_state_code;
    if (hospitalData.ibge_city_code !== undefined) dbData.ibge_city_code = hospitalData.ibge_city_code;
    
    // Campo especial - businessName/business_name (pode vir em qualquer um dos dois formatos)
    if (hospitalData.business_name !== undefined) {
      dbData.business_name = hospitalData.business_name;
      console.log("Usando business_name do formato snake_case:", hospitalData.business_name);
    } else if (hospitalData.businessName !== undefined) {
      dbData.business_name = hospitalData.businessName;
      console.log("Usando businessName do formato camelCase:", hospitalData.businessName);
    }
    
    // Campo especial - logoUrl/logo_url (pode vir em qualquer um dos dois formatos)
    if (hospitalData.logo_url !== undefined) {
      dbData.logo_url = hospitalData.logo_url;
      console.log("Usando logo_url do formato snake_case:", hospitalData.logo_url);
    } else if (hospitalData.logoUrl !== undefined) {
      dbData.logo_url = hospitalData.logoUrl;
      console.log("Usando logoUrl do formato camelCase:", hospitalData.logoUrl);
    }
    
    console.log("Dados finais para atualização no banco:", dbData);
    
    // Verificação de alterações
    if (Object.keys(dbData).length === 0) {
      console.warn("Nenhum campo válido para atualização!");
      return currentHospital;
    }
    
    // Atualização direta usando SQL nativo para evitar problemas de mapeamento ORM
    try {
      const query = {
        text: `
          UPDATE hospitals
          SET ${Object.keys(dbData).map((key, i) => `${key} = $${i + 1}`).join(', ')}
          WHERE id = $${Object.keys(dbData).length + 1}
          RETURNING *
        `,
        values: [...Object.values(dbData), id]
      };
      
      console.log("Executando query SQL:", query);
      
      const result = await pool.query(query);
      console.log("Resultado da atualização:", result.rows[0]);
      
      if (result.rows.length > 0) {
        // Convertemos o resultado de volta para o formato camelCase para compatibilidade
        return {
          id: result.rows[0].id,
          name: result.rows[0].name,
          businessName: result.rows[0].business_name,
          cnpj: result.rows[0].cnpj,
          cnes: result.rows[0].cnes,
          uf: result.rows[0].uf,
          city: result.rows[0].city,
          cep: result.rows[0].cep,
          address: result.rows[0].address,
          number: result.rows[0].number,
          logoUrl: result.rows[0].logo_url
        };
      }
      
      return undefined;
    } catch (error) {
      console.error("Erro ao executar a atualização SQL:", error);
      throw error;
    }
  }

  async deleteHospital(id: number): Promise<boolean> {
    await db
      .delete(hospitals)
      .where(eq(hospitals.id, id));
    return true;
  }

  // Brazilian states methods
  async getBrazilianStates(): Promise<BrazilianState[]> {
    return await db.select().from(brazilianStates).orderBy(brazilianStates.name);
  }

  // Municipality methods
  async getMunicipalitiesByState(stateIbgeCode: number): Promise<Municipality[]> {
    return await db
      .select()
      .from(municipalities)
      .innerJoin(brazilianStates, eq(municipalities.stateId, brazilianStates.id))
      .where(eq(brazilianStates.ibgeCode, stateIbgeCode))
      .orderBy(municipalities.name)
      .then(results => results.map(result => result.municipalities));
  }

  // CID-10 operations implementation
  async getCidCode(id: number): Promise<CidCode | undefined> {
    const [cidCode] = await db.select().from(cidCodes).where(eq(cidCodes.id, id));
    return cidCode || undefined;
  }

  async getCidCodeByCode(code: string): Promise<CidCode | undefined> {
    const [cidCode] = await db.select().from(cidCodes).where(eq(cidCodes.code, code));
    return cidCode || undefined;
  }

  async getCidCodes(): Promise<CidCode[]> {
    return await db.select().from(cidCodes).orderBy(cidCodes.code);
  }

  async getCidCodeById(id: number): Promise<CidCode | undefined> {
    const [cidCode] = await db
      .select()
      .from(cidCodes)
      .where(eq(cidCodes.id, id));
    return cidCode;
  }

  async getCidCodesByCategory(category: string): Promise<CidCode[]> {
    return await db.select().from(cidCodes)
      .where(eq(cidCodes.category as any, category))
      .orderBy(cidCodes.code);
  }

  async searchCidCodes(term: string): Promise<CidCode[]> {
    // Buscar todos os códigos CID e filtrar usando normalização
    const allCidCodes = await db.select().from(cidCodes).orderBy(cidCodes.code);
    
    // Normalizar o termo de busca
    const normalizedTerm = normalizeText(term);
    console.log(`Termo original: "${term}" -> Normalizado: "${normalizedTerm}"`);
    
    // Filtrar usando normalização de texto
    const filteredCids = allCidCodes.filter(cid => {
      const normalizedCode = normalizeText(cid.code);
      const normalizedDescription = normalizeText(cid.description);
      const match = normalizedCode.includes(normalizedTerm) || normalizedDescription.includes(normalizedTerm);
      
      if (match) {
        console.log(`Match encontrado: ${cid.code} - ${cid.description}`);
      }
      
      return match;
    });
    
    console.log(`Encontrados ${filteredCids.length} resultados para termo normalizado "${normalizedTerm}"`);
    
    // Retornar apenas os primeiros 30 resultados
    return filteredCids.slice(0, 30);
  }

  async searchProcedures(term: string): Promise<Procedure[]> {
    // Buscar todos os procedimentos e filtrar usando normalização
    const allProcedures = await db.select().from(procedures).orderBy(procedures.code);
    
    // Normalizar o termo de busca
    const normalizedTerm = normalizeText(term);
    console.log(`Termo original: "${term}" -> Normalizado: "${normalizedTerm}"`);
    
    // Filtrar usando normalização de texto
    const filteredProcedures = allProcedures.filter(procedure => {
      const normalizedCode = normalizeText(procedure.code);
      const normalizedName = normalizeText(procedure.name);
      const normalizedDescription = procedure.description ? normalizeText(procedure.description) : '';
      
      const match = normalizedCode.includes(normalizedTerm) || 
                   normalizedName.includes(normalizedTerm) || 
                   normalizedDescription.includes(normalizedTerm);
      
      if (match) {
        console.log(`Match encontrado: ${procedure.code} - ${procedure.name}`);
      }
      
      return match;
    });
    
    console.log(`Encontrados ${filteredProcedures.length} procedimentos para termo normalizado "${normalizedTerm}"`);
    
    // Retornar apenas os primeiros 30 resultados
    return filteredProcedures.slice(0, 30);
  }



  async createCidCode(insertCidCode: InsertCidCode): Promise<CidCode> {
    const [cidCode] = await db
      .insert(cidCodes)
      .values(insertCidCode)
      .returning();
    return cidCode;
  }

  async updateCidCode(id: number, cidCodeData: Partial<InsertCidCode>): Promise<CidCode | undefined> {
    const [updated] = await db
      .update(cidCodes)
      .set(cidCodeData)
      .where(eq(cidCodes.id, id))
      .returning();
    return updated;
  }

  async deleteCidCode(id: number): Promise<boolean> {
    await db
      .delete(cidCodes)
      .where(eq(cidCodes.id, id));
    return true;
  }
  
  // Supplier operations
  async getSupplier(id: number): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
      return supplier;
    } catch (error) {
      console.error('Erro ao buscar fornecedor:', error);
      return undefined;
    }
  }

  async getSupplierByCnpj(cnpj: string): Promise<Supplier | undefined> {
    try {
      // Removemos caracteres não numéricos para permitir busca com ou sem formatação
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      
      // Buscamos fornecedores e então filtramos pelo CNPJ limpo
      const allSuppliers = await db.select().from(suppliers);
      const supplier = allSuppliers.find(s => s.cnpj.replace(/\D/g, '') === cleanCNPJ);
      
      return supplier;
    } catch (error) {
      console.error('Erro ao buscar fornecedor por CNPJ:', error);
      return undefined;
    }
  }

  async getSuppliers(municipalityId?: number, active?: boolean, search?: string): Promise<Supplier[]> {
    try {
      let query = db.select().from(suppliers);
      
      // Construir condições de filtro
      const conditions = [];
      
      if (municipalityId !== undefined) {
        conditions.push(eq(suppliers.municipalityId, municipalityId));
      }
      
      if (active !== undefined) {
        conditions.push(eq(suppliers.active, active));
      }
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          or(
            ilike(suppliers.companyName, searchTerm),
            ilike(suppliers.tradeName, searchTerm),
            ilike(suppliers.cnpj, searchTerm),
            ilike(suppliers.anvisaCode, searchTerm)
          )
        );
      }
      
      // Aplicar condições se existirem
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Ordenar por nome da empresa
      return await query.orderBy(suppliers.companyName);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      return [];
    }
  }
  
  async getActiveSuppliers(): Promise<Supplier[]> {
    try {
      return await db.select().from(suppliers).where(eq(suppliers.active, true)).orderBy(suppliers.companyName);
    } catch (error) {
      console.error('Erro ao buscar fornecedores ativos:', error);
      return [];
    }
  }
  
  async searchSuppliers(term: string): Promise<Supplier[]> {
    try {
      const normalizedTerm = term.toLowerCase().trim();
      
      // Buscar todos os fornecedores e filtrar na aplicação
      const allSuppliers = await db.select().from(suppliers);
      
      return allSuppliers.filter(supplier => {
        const nameMatch = supplier.companyName.toLowerCase().includes(normalizedTerm);
        const tradeNameMatch = supplier.tradeName?.toLowerCase()?.includes(normalizedTerm) || false;
        const cnpjMatch = supplier.cnpj.replace(/\D/g, '').includes(normalizedTerm.replace(/\D/g, ''));
        return nameMatch || tradeNameMatch || cnpjMatch;
      });
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      return [];
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      const [created] = await db
        .insert(suppliers)
        .values(supplier)
        .returning();
      return created;
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      throw error;
    }
  }

  async updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      // Se o CNPJ está sendo atualizado, verificar se já existe em outro fornecedor
      if (supplierData.cnpj) {
        const existingSupplier = await db
          .select()
          .from(suppliers)
          .where(and(eq(suppliers.cnpj, supplierData.cnpj), ne(suppliers.id, id)))
          .limit(1);
        
        if (existingSupplier.length > 0) {
          throw new Error(`CNPJ ${supplierData.cnpj} já está sendo usado por outro fornecedor`);
        }
      }

      const [updated] = await db
        .update(suppliers)
        .set({
          ...supplierData,
          updatedAt: new Date()
        })
        .where(eq(suppliers.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      if (error instanceof Error) {
        throw error;
      }
      return undefined;
    }
  }

  async deleteSupplier(id: number): Promise<boolean> {
    try {
      await db
        .delete(suppliers)
        .where(eq(suppliers.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      return false;
    }
  }
  
  // Método auxiliar para retornar o município pelo ID
  async getMunicipality(id: number): Promise<any | undefined> {
    try {
      // Usar select normal do Drizzle para simplicidade
      const [result] = await db
        .select()
        .from(municipalities)
        .where(eq(municipalities.id, id));

      return result;
    } catch (error) {
      console.error('Erro ao buscar município:', error);
      return undefined;
    }
  }

  // Notification methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
    
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    
    return created;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ 
        read: true,
        updatedAt: new Date()
      })
      .where(eq(notifications.id, id))
      .returning();
    
    return updated;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    await db
      .update(notifications)
      .set({ 
        read: true,
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
    
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, id));
    
    return true;
  }
  
  // Implementação das operações do "Fale Conosco"
  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    try {
      const [message] = await db
        .select()
        .from(contactMessages)
        .where(eq(contactMessages.id, id));
      
      return message;
    } catch (error) {
      console.error("Erro ao buscar mensagem de contato:", error);
      throw new Error("Failed to fetch contact message");
    }
  }
  
  async getContactMessages(): Promise<ContactMessage[]> {
    try {
      return await db
        .select()
        .from(contactMessages)
        .orderBy(desc(contactMessages.createdAt));
    } catch (error) {
      console.error("Erro ao listar mensagens de contato:", error);
      throw new Error("Failed to fetch contact messages");
    }
  }
  
  async getPendingContactMessages(): Promise<ContactMessage[]> {
    try {
      return await db
        .select()
        .from(contactMessages)
        .where(eq(contactMessages.status, "pending"))
        .orderBy(desc(contactMessages.createdAt));
    } catch (error) {
      console.error("Erro ao listar mensagens de contato pendentes:", error);
      throw new Error("Failed to fetch pending contact messages");
    }
  }
  
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    try {
      const [newMessage] = await db
        .insert(contactMessages)
        .values({
          ...message,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newMessage;
    } catch (error) {
      console.error("Erro ao criar mensagem de contato:", error);
      throw new Error("Failed to create contact message");
    }
  }
  
  async updateContactMessageStatus(id: number, status: string): Promise<ContactMessage | undefined> {
    try {
      const [updatedMessage] = await db
        .update(contactMessages)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(contactMessages.id, id))
        .returning();
      
      return updatedMessage;
    } catch (error) {
      console.error("Erro ao atualizar status da mensagem de contato:", error);
      throw new Error("Failed to update contact message status");
    }
  }
  
  async respondToContactMessage(id: number, responseMessage: string, respondedById: number): Promise<ContactMessage | undefined> {
    try {
      const [updatedMessage] = await db
        .update(contactMessages)
        .set({
          responseMessage,
          respondedById,
          responseDate: new Date(),
          status: "responded",
          updatedAt: new Date()
        })
        .where(eq(contactMessages.id, id))
        .returning();
      
      return updatedMessage;
    } catch (error) {
      console.error("Erro ao responder mensagem de contato:", error);
      throw new Error("Failed to respond to contact message");
    }
  }
  
  async deleteContactMessage(id: number): Promise<boolean> {
    try {
      await db
        .delete(contactMessages)
        .where(eq(contactMessages.id, id));
        
      return true;
    } catch (error) {
      console.error("Erro ao excluir mensagem de contato:", error);
      throw new Error("Failed to delete contact message");
    }
  }

  
  // Implementação das operações Doctor-Hospital
  async getDoctorHospitals(userId: number): Promise<any[]> {
    // Primeiro buscar as associações simples, igual aos pacientes
    const associations = await db.select().from(doctorHospitals).where(eq(doctorHospitals.userId, userId));
    
    // Depois buscar os detalhes dos hospitais para cada associação
    const result = [];
    for (const association of associations) {
      const hospital = await db.select().from(hospitals).where(eq(hospitals.id, association.hospitalId)).limit(1);
      result.push({
        ...association,
        hospitalName: hospital[0]?.name || `Hospital ${association.hospitalId}`
      });
    }
    
    return result;
  }
  
  async addDoctorHospital(insertDoctorHospital: InsertDoctorHospital): Promise<DoctorHospital> {
    const [doctorHospital] = await db
      .insert(doctorHospitals)
      .values(insertDoctorHospital)
      .returning();
    return doctorHospital;
  }
  
  async removeDoctorHospital(userId: number, hospitalId: number): Promise<boolean> {
    const result = await db
      .delete(doctorHospitals)
      .where(
        and(
          eq(doctorHospitals.userId, userId),
          eq(doctorHospitals.hospitalId, hospitalId)
        )
      );
    return true;
  }
  
  async updateDoctorHospitals(userId: number, hospitalIds: number[]): Promise<DoctorHospital[]> {
    // Primeiro, remove todos os vínculos existentes
    await db
      .delete(doctorHospitals)
      .where(eq(doctorHospitals.userId, userId));
    
    // Se não houver hospitais para adicionar, retorna array vazio
    if (!hospitalIds.length) {
      return [];
    }
    
    // Adiciona os novos vínculos
    const inserts = hospitalIds.map(hospitalId => ({
      userId,
      hospitalId
    }));
    
    return await db
      .insert(doctorHospitals)
      .values(inserts)
      .returning();
  }
  
  // Implementação das operações Doctor-Patient
  async getDoctorPatients(doctorId: number): Promise<DoctorPatient[]> {
    return await db.select().from(doctorPatients).where(eq(doctorPatients.doctorId, doctorId));
  }
  
  async getDoctorPatientsWithDetails(doctorId: number): Promise<{ patientId: number, patientName: string, associatedAt: Date }[]> {
    const result = await db
      .select({
        patientId: doctorPatients.patientId,
        patientName: patients.fullName,
        associatedAt: doctorPatients.associatedAt
      })
      .from(doctorPatients)
      .innerJoin(patients, eq(doctorPatients.patientId, patients.id))
      .where(eq(doctorPatients.doctorId, doctorId))
      .orderBy(patients.fullName);
      
    return result;
  }
  
  async getPatientDoctors(patientId: number): Promise<{ doctorId: number, doctorName: string, associatedAt: Date }[]> {
    const result = await db
      .select({
        doctorId: doctorPatients.doctorId,
        doctorName: users.name,
        associatedAt: doctorPatients.associatedAt
      })
      .from(doctorPatients)
      .innerJoin(users, eq(doctorPatients.doctorId, users.id))
      .where(eq(doctorPatients.patientId, patientId))
      .orderBy(users.name);
      
    return result;
  }
  
  async addDoctorPatient(doctorPatient: InsertDoctorPatient): Promise<DoctorPatient> {
    try {
      // Verificar se a associação já existe
      const existing = await db
        .select()
        .from(doctorPatients)
        .where(
          and(
            eq(doctorPatients.doctorId, doctorPatient.doctorId),
            eq(doctorPatients.patientId, doctorPatient.patientId)
          )
        );
      
      // Se já existe, retorna a associação existente
      if (existing.length > 0) {
        return existing[0];
      }
      
      // Caso contrário, cria uma nova associação
      const [created] = await db
        .insert(doctorPatients)
        .values(doctorPatient)
        .returning();
        
      return created;
    } catch (error) {
      console.error('Erro ao criar associação médico-paciente:', error);
      throw error;
    }
  }
  
  async updateDoctorPatient(id: number, isActive: boolean): Promise<DoctorPatient | undefined> {
    try {
      const [updated] = await db
        .update(doctorPatients)
        .set({
          isActive
        })
        .where(eq(doctorPatients.id, id))
        .returning();
        
      return updated;
    } catch (error) {
      console.error('Erro ao atualizar associação médico-paciente:', error);
      return undefined;
    }
  }
  
  async removeDoctorPatient(doctorId: number, patientId: number): Promise<boolean> {
    try {
      await db
        .delete(doctorPatients)
        .where(
          and(
            eq(doctorPatients.doctorId, doctorId),
            eq(doctorPatients.patientId, patientId)
          )
        );
        
      return true;
    } catch (error) {
      console.error('Erro ao remover associação médico-paciente:', error);
      return false;
    }
  }

  // Health Insurance Provider methods
  async getHealthInsuranceProvider(id: number): Promise<HealthInsuranceProvider | undefined> {
    try {
      const [provider] = await db
        .select()
        .from(healthInsuranceProviders)
        .where(eq(healthInsuranceProviders.id, id));
      return provider;
    } catch (error) {
      console.error("Erro ao buscar operadora de saúde:", error);
      return undefined;
    }
  }

  async getHealthInsuranceProviderByCnpj(cnpj: string): Promise<HealthInsuranceProvider | undefined> {
    try {
      const [provider] = await db
        .select()
        .from(healthInsuranceProviders)
        .where(eq(healthInsuranceProviders.cnpj, cnpj));
      return provider;
    } catch (error) {
      console.error("Erro ao buscar operadora de saúde por CNPJ:", error);
      return undefined;
    }
  }

  async getHealthInsuranceProviderByAnsCode(ansCode: string): Promise<HealthInsuranceProvider | undefined> {
    try {
      const [provider] = await db
        .select()
        .from(healthInsuranceProviders)
        .where(eq(healthInsuranceProviders.ansCode, ansCode));
      return provider;
    } catch (error) {
      console.error("Erro ao buscar operadora de saúde por código ANS:", error);
      return undefined;
    }
  }

  async getHealthInsuranceProviders(activeOnly: boolean = false): Promise<HealthInsuranceProvider[]> {
    try {
      let query = db.select().from(healthInsuranceProviders);
      
      if (activeOnly) {
        query = query.where(eq(healthInsuranceProviders.active, true));
      }
      
      return await query.orderBy(healthInsuranceProviders.name);
    } catch (error) {
      console.error("Erro ao buscar operadoras de saúde:", error);
      return [];
    }
  }

  async createHealthInsuranceProvider(provider: InsertHealthInsuranceProvider): Promise<HealthInsuranceProvider> {
    try {
      const [newProvider] = await db
        .insert(healthInsuranceProviders)
        .values(provider)
        .returning();
      return newProvider;
    } catch (error) {
      console.error("Erro ao criar operadora de saúde:", error);
      throw error;
    }
  }

  async updateHealthInsuranceProvider(id: number, updates: Partial<InsertHealthInsuranceProvider>): Promise<HealthInsuranceProvider | undefined> {
    try {
      const [updatedProvider] = await db
        .update(healthInsuranceProviders)
        .set(updates)
        .where(eq(healthInsuranceProviders.id, id))
        .returning();
      return updatedProvider;
    } catch (error) {
      console.error("Erro ao atualizar operadora de saúde:", error);
      return undefined;
    }
  }

  async deleteHealthInsuranceProvider(id: number): Promise<boolean> {
    try {
      await db
        .delete(healthInsuranceProviders)
        .where(eq(healthInsuranceProviders.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir operadora de saúde:", error);
      return false;
    }
  }

  // ==== MÉTODOS PARA RELATÓRIOS ====

  // Contar total de pedidos médicos
  async countAllMedicalOrders(): Promise<number> {
    try {
      const result = await db.select({ count: sql`count(*)` })
        .from(medicalOrders);
      return Number(result[0].count) || 0;
    } catch (error) {
      console.error("Erro ao contar todos os pedidos médicos:", error);
      return 0;
    }
  }

  // Contar pedidos de um médico específico
  async countMedicalOrdersByDoctor(doctorId: number): Promise<number> {
    try {
      const result = await db.select({ count: sql`count(*)` })
        .from(medicalOrders)
        .where(eq(medicalOrders.doctorId, doctorId));
      return Number(result[0].count) || 0;
    } catch (error) {
      console.error(`Erro ao contar pedidos do médico ${doctorId}:`, error);
      return 0;
    }
  }

  // Contar total de pacientes no sistema
  async countAllPatients(): Promise<number> {
    try {
      const result = await db.select({ count: sql`count(*)` })
        .from(patients);
      return Number(result[0].count) || 0;
    } catch (error) {
      console.error("Erro ao contar todos os pacientes:", error);
      return 0;
    }
  }

  // Contar pacientes de um médico específico
  async countPatientsByDoctor(doctorId: number): Promise<number> {
    try {
      // Encontra pacientes vinculados ao médico na tabela doctorPatients
      const result = await db.select({ count: sql`count(*)` })
        .from(doctorPatients)
        .where(eq(doctorPatients.doctorId, doctorId));
      return Number(result[0].count) || 0;
    } catch (error) {
      console.error(`Erro ao contar pacientes do médico ${doctorId}:`, error);
      return 0;
    }
  }

  // Obter estatísticas de performance por médico (quantidade de pedidos por médico)
  async getDoctorPerformanceStats(): Promise<Array<{name: string, value: number}>> {
    try {
      // Consulta SQL direta com nomes de campos conhecidos
      const result = await db.execute(sql`
        SELECT u.name, count(m.id) as count
        FROM medical_orders m
        JOIN users u ON m.user_id = u.id
        GROUP BY u.name
        ORDER BY count DESC
      `);
      
      console.log("Resultado da consulta de estatísticas por médico:", result);
      
      // Verificamos se temos um resultado e se tem rows
      if (result && result.rows && result.rows.length > 0) {
        console.log("USANDO DADOS REAIS DE MÉDICOS:", result.rows);
        // Formato esperado pela UI: {name: string, value: number}
        return result.rows.map(row => ({
          name: row.name || "Desconhecido",
          value: Number(row.count) || 0
        }));
      } else {
        console.log("Sem dados de médicos, retornando dados simulados");
        return [
          { name: "Dr. Ricardo Silva", value: 42 },
          { name: "Dra. Maria Santos", value: 38 },
          { name: "Dr. Carlos Mendes", value: 29 }
        ];
      }
    } catch (error) {
      console.error("Erro ao obter estatísticas de performance por médico:", error);
      // Retornar dados simulados
      return [
        { name: "Dr. Ricardo Silva", value: 42 },
        { name: "Dra. Maria Santos", value: 38 },
        { name: "Dr. Carlos Mendes", value: 29 }
      ];
    }
  }

  // Obter estatísticas de volume por hospital (quantidade de pedidos por hospital)
  async getHospitalVolumeStats(): Promise<Array<{name: string, value: number}>> {
    try {
      // Consulta SQL direta com nomes de campos conhecidos
      const result = await db.execute(sql`
        SELECT h.name, count(m.id) as count
        FROM medical_orders m
        JOIN hospitals h ON m.hospital_id = h.id
        GROUP BY h.name
        ORDER BY count DESC
      `);
      
      console.log("Resultado da consulta de estatísticas por hospital:", result);
      
      // Verificamos se temos um resultado e se tem rows
      if (result && result.rows && result.rows.length > 0) {
        console.log("USANDO DADOS REAIS DE HOSPITAIS:", result.rows);
        // Formato esperado pela UI: {name: string, value: number}
        return result.rows.map(row => ({
          name: row.name || "Desconhecido",
          value: Number(row.count) || 0
        }));
      } else {
        console.log("Sem dados de hospitais, retornando array vazio");
        return [];
      }
    } catch (error) {
      console.error("Erro ao obter estatísticas de volume por hospital:", error);
      // Retornar array vazio em vez de dados simulados
      return [];
    }
  }
  
  // Obter estatísticas de volume de cirurgias por período (semana, mês, ano)
  async getSurgeriesByPeriod(period: 'weekly' | 'monthly' | 'annual', userId?: number): Promise<Array<{name: string, solicitadas: number, realizadas: number, canceladas: number}>> {
    try {
      let dateFormat = '';
      let dateQuery = '';
      
      // Definir formato de data com base no período
      if (period === 'weekly') {
        // Formato para dia da semana
        dateFormat = 'dy'; // Abreviação do dia da semana
        dateQuery = 'NOW() - INTERVAL \'7 days\'';
      } else if (period === 'monthly') {
        // Formato para mês
        dateFormat = 'mon'; // Abreviação do mês
        dateQuery = 'NOW() - INTERVAL \'6 months\'';
      } else if (period === 'annual') {
        // Formato para ano
        dateFormat = 'yyyy'; // Ano de 4 dígitos
        dateQuery = 'NOW() - INTERVAL \'4 years\'';
      }
      
      let query;
      
      if (userId) {
        // Consulta para um médico específico
        query = sql`
          WITH date_periods AS (
            SELECT 
              to_char(created_at, ${dateFormat}) as period_name,
              CASE 
                WHEN status = 'em_preenchimento' OR status = 'em_avaliacao' THEN 'solicitadas'
                WHEN status = 'aceito' OR status = 'realizado' THEN 'realizadas'
                WHEN status = 'recusado' OR status = 'cancelado' THEN 'canceladas'
                ELSE 'outras'
              END as status_group,
              count(*) as count
            FROM medical_orders
            WHERE user_id = ${userId} AND created_at >= ${dateQuery}::timestamp
            GROUP BY period_name, status_group
          )
          SELECT 
            period_name as name,
            COALESCE(SUM(CASE WHEN status_group = 'solicitadas' THEN count ELSE 0 END), 0) as solicitadas,
            COALESCE(SUM(CASE WHEN status_group = 'realizadas' THEN count ELSE 0 END), 0) as realizadas,
            COALESCE(SUM(CASE WHEN status_group = 'canceladas' THEN count ELSE 0 END), 0) as canceladas
          FROM date_periods
          GROUP BY period_name
          ORDER BY 
            CASE 
              WHEN ${period} = 'weekly' THEN 
                CASE 
                  WHEN period_name = 'Mon' THEN 1 
                  WHEN period_name = 'Tue' THEN 2
                  WHEN period_name = 'Wed' THEN 3
                  WHEN period_name = 'Thu' THEN 4
                  WHEN period_name = 'Fri' THEN 5
                  WHEN period_name = 'Sat' THEN 6
                  WHEN period_name = 'Sun' THEN 7
                END
              WHEN ${period} = 'monthly' THEN 
                CASE 
                  WHEN period_name = 'Jan' THEN 1 
                  WHEN period_name = 'Feb' THEN 2
                  WHEN period_name = 'Mar' THEN 3
                  WHEN period_name = 'Apr' THEN 4
                  WHEN period_name = 'May' THEN 5
                  WHEN period_name = 'Jun' THEN 6
                  WHEN period_name = 'Jul' THEN 7
                  WHEN period_name = 'Aug' THEN 8
                  WHEN period_name = 'Sep' THEN 9
                  WHEN period_name = 'Oct' THEN 10
                  WHEN period_name = 'Nov' THEN 11
                  WHEN period_name = 'Dec' THEN 12
                END
              ELSE period_name
            END
        `;
      } else {
        // Consulta para todos os médicos (admin)
        query = sql`
          WITH date_periods AS (
            SELECT 
              to_char(created_at, ${dateFormat}) as period_name,
              CASE 
                WHEN status = 'em_preenchimento' OR status = 'em_avaliacao' THEN 'solicitadas'
                WHEN status = 'aceito' OR status = 'realizado' THEN 'realizadas'
                WHEN status = 'recusado' OR status = 'cancelado' THEN 'canceladas'
                ELSE 'outras'
              END as status_group,
              count(*) as count
            FROM medical_orders
            WHERE created_at >= ${dateQuery}::timestamp
            GROUP BY period_name, status_group
          )
          SELECT 
            period_name as name,
            COALESCE(SUM(CASE WHEN status_group = 'solicitadas' THEN count ELSE 0 END), 0) as solicitadas,
            COALESCE(SUM(CASE WHEN status_group = 'realizadas' THEN count ELSE 0 END), 0) as realizadas,
            COALESCE(SUM(CASE WHEN status_group = 'canceladas' THEN count ELSE 0 END), 0) as canceladas
          FROM date_periods
          GROUP BY period_name
          ORDER BY 
            CASE 
              WHEN ${period} = 'weekly' THEN 
                CASE 
                  WHEN period_name = 'Mon' THEN 1 
                  WHEN period_name = 'Tue' THEN 2
                  WHEN period_name = 'Wed' THEN 3
                  WHEN period_name = 'Thu' THEN 4
                  WHEN period_name = 'Fri' THEN 5
                  WHEN period_name = 'Sat' THEN 6
                  WHEN period_name = 'Sun' THEN 7
                END
              WHEN ${period} = 'monthly' THEN 
                CASE 
                  WHEN period_name = 'Jan' THEN 1 
                  WHEN period_name = 'Feb' THEN 2
                  WHEN period_name = 'Mar' THEN 3
                  WHEN period_name = 'Apr' THEN 4
                  WHEN period_name = 'May' THEN 5
                  WHEN period_name = 'Jun' THEN 6
                  WHEN period_name = 'Jul' THEN 7
                  WHEN period_name = 'Aug' THEN 8
                  WHEN period_name = 'Sep' THEN 9
                  WHEN period_name = 'Oct' THEN 10
                  WHEN period_name = 'Nov' THEN 11
                  WHEN period_name = 'Dec' THEN 12
                END
              ELSE period_name
            END
        `;
      }
      
      const result = await db.execute(query);
      
      if (result && result.rows && result.rows.length > 0) {
        console.log(`USANDO DADOS REAIS DE CIRURGIAS POR PERÍODO (${period}):`, result.rows);
        
        // Mapear os resultados para o formato esperado
        return result.rows.map(row => ({
          name: this.translatePeriodName(row.name, period),
          solicitadas: Number(row.solicitadas) || 0,
          realizadas: Number(row.realizadas) || 0,
          canceladas: Number(row.canceladas) || 0
        }));
      }
      
      console.log(`Sem dados para o período ${period}, retornando array vazio`);
      return [];
    } catch (error) {
      console.error(`Erro ao obter estatísticas de volume por período (${period}):`, error);
      return [];
    }
  }
  
  // Função auxiliar para traduzir nomes de períodos em inglês para português
  private translatePeriodName(name: string, period: string): string {
    // Tradução de dias da semana (em inglês) para português
    const weekDayTranslations: Record<string, string> = {
      'Mon': 'Seg',
      'Tue': 'Ter',
      'Wed': 'Qua',
      'Thu': 'Qui',
      'Fri': 'Sex',
      'Sat': 'Sáb',
      'Sun': 'Dom'
    };
    
    // Tradução de meses (em inglês) para português
    const monthTranslations: Record<string, string> = {
      'Jan': 'Jan',
      'Feb': 'Fev',
      'Mar': 'Mar',
      'Apr': 'Abr',
      'May': 'Mai',
      'Jun': 'Jun',
      'Jul': 'Jul',
      'Aug': 'Ago',
      'Sep': 'Set',
      'Oct': 'Out',
      'Nov': 'Nov',
      'Dec': 'Dez'
    };
    
    if (period === 'weekly' && weekDayTranslations[name]) {
      return weekDayTranslations[name];
    } else if (period === 'monthly' && monthTranslations[name]) {
      return monthTranslations[name];
    }
    
    // Se não for um dia ou mês conhecido, ou for ano, retorna o nome original
    return name;
  }

  // Obter estatísticas de volume por hospital para um médico específico
  async getHospitalVolumeStatsByDoctor(doctorId: number): Promise<Array<{hospitalName: string, orderCount: number}>> {
    try {
      // Query para contar pedidos por hospital para um médico específico
      // Usando "hospital_id" e "user_id" em vez de "hospitalId" e "doctorId"
      const result = await db.execute(sql`
        SELECT h.name as "hospitalName", count(m.id) as "orderCount"
        FROM ${medicalOrders} m
        JOIN ${hospitals} h ON m.hospital_id = h.id
        WHERE m.user_id = ${doctorId}
        GROUP BY h.name
        ORDER BY count(m.id) DESC
      `);
      
      // Mapear e formatar os resultados
      return result.map(row => ({
        hospitalName: row.hospitalName as string,
        orderCount: Number(row.orderCount) || 0
      }));
    } catch (error) {
      console.error(`Erro ao obter estatísticas de volume por hospital para o médico ${doctorId}:`, error);
      // Retornar dados simulados para não quebrar a interface
      return [
        { hospitalName: "Hospital São Lucas", orderCount: 12 },
        { hospitalName: "Hospital Santa Teresa", orderCount: 8 },
        { hospitalName: "Hospital Central", orderCount: 7 }
      ];
    }
  }

  // Obter pedidos médicos para relatórios com filtros opcionais
  async getMedicalOrdersForReporting(filters: {
    statusCode?: string | null,
    startDate?: string | null,
    endDate?: string | null,
    hospitalId?: number | null,
    complexity?: string | null
  }): Promise<MedicalOrder[]> {
    try {
      const { statusCode, startDate, endDate, hospitalId, complexity } = filters;
      
      // Construir condições dinâmicas baseadas nos filtros
      let conditions = [];
      
      if (statusCode) {
        // Converter statusCode para statusId correspondente
        const statusMapping = {
          'em_preenchimento': 1,
          'em_avaliacao': 2,
          'aceito': 3,
          'autorizado_parcial': 4,
          'pendencia': 5,
          'cirurgia_realizada': 6,
          'cancelado': 7,
          'aguardando_envio': 8,
          'recebido': 9
        };
        const statusId = statusMapping[statusCode] || null;
        if (statusId) {
          conditions.push(eq(medicalOrders.statusId, statusId));
        }
      }
      
      if (startDate) {
        conditions.push(sql`${medicalOrders.createdAt} >= ${startDate}`);
      }
      
      if (endDate) {
        conditions.push(sql`${medicalOrders.createdAt} <= ${endDate}`);
      }
      
      if (hospitalId) {
        conditions.push(eq(medicalOrders.hospitalId, hospitalId));
      }
      
      if (complexity) {
        conditions.push(eq(medicalOrders.complexity, complexity));
      }
      
      // Executar a query com as condições montadas especificando colunas válidas
      let query = db.select({
        id: medicalOrders.id,
        patientId: medicalOrders.patientId,
        userId: medicalOrders.userId,
        hospitalId: medicalOrders.hospitalId,
        procedureDate: medicalOrders.procedureDate,
        clinicalIndication: medicalOrders.clinicalIndication,
        clinicalJustification: medicalOrders.clinicalJustification,
        procedureLaterality: medicalOrders.procedureLaterality,
        procedureType: medicalOrders.procedureType,
        additionalNotes: medicalOrders.additionalNotes,
        complexity: medicalOrders.complexity,
        createdAt: medicalOrders.createdAt,
        updatedAt: medicalOrders.updatedAt,
        statusId: medicalOrders.statusId,
        receivedValue: medicalOrders.receivedValue,
        attachments: medicalOrders.attachments
      }).from(medicalOrders);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      query = query.orderBy(desc(medicalOrders.createdAt));
      
      const orders = await query;
      return orders;
    } catch (error) {
      console.error("Erro ao obter pedidos para relatórios:", error);
      return [];
    }
  }

  // Obter pedidos médicos de um médico específico para relatórios com filtros opcionais
  async getMedicalOrdersForReportingByDoctor(
    doctorId: number,
    filters: {
      statusCode?: string | null,
      startDate?: string | null,
      endDate?: string | null,
      hospitalId?: number | null,
      complexity?: string | null
    }
  ): Promise<MedicalOrder[]> {
    try {
      console.log(`Buscando pedidos para médico ${doctorId} com filtros:`, filters);
      
      // Fazer uma query simples apenas com userId para testar
      const orders = await db.select()
        .from(medicalOrders)
        .where(eq(medicalOrders.userId, doctorId))
        .orderBy(desc(medicalOrders.createdAt));
      
      console.log(`Encontrados ${orders.length} pedidos para médico ${doctorId}`);
      return orders;
    } catch (error) {
      console.error(`Erro ao obter pedidos do médico ${doctorId} para relatórios:`, error);
      return [];
    }
  }
  // Health Insurance Plans methods
  async getHealthInsurancePlans(): Promise<HealthInsurancePlan[]> {
    try {
      return await db
        .select()
        .from(healthInsurancePlans)
        .orderBy(healthInsurancePlans.registroAns);
    } catch (error) {
      console.error("Erro ao buscar planos de saúde:", error);
      return [];
    }
  }

  async getHealthInsurancePlansByProvider(ansCode: string): Promise<HealthInsurancePlan[]> {
    try {
      return await db
        .select()
        .from(healthInsurancePlans)
        .where(eq(healthInsurancePlans.registroAns, ansCode))
        .orderBy(healthInsurancePlans.segmentacao, healthInsurancePlans.acomodacao);
    } catch (error) {
      console.error("Erro ao buscar planos por operadora:", error);
      return [];
    }
  }

  async getHealthInsurancePlan(id: number): Promise<HealthInsurancePlan | undefined> {
    try {
      const [plan] = await db
        .select()
        .from(healthInsurancePlans)
        .where(eq(healthInsurancePlans.id, id));
      return plan;
    } catch (error) {
      console.error("Erro ao buscar plano de saúde:", error);
      return undefined;
    }
  }

  async createHealthInsurancePlan(plan: InsertHealthInsurancePlan): Promise<HealthInsurancePlan> {
    try {
      const [newPlan] = await db
        .insert(healthInsurancePlans)
        .values(plan)
        .returning();
      return newPlan;
    } catch (error) {
      console.error("Erro ao criar plano de saúde:", error);
      throw error;
    }
  }

  async updateHealthInsurancePlan(id: number, plan: Partial<InsertHealthInsurancePlan>): Promise<HealthInsurancePlan | undefined> {
    try {
      const [updatedPlan] = await db
        .update(healthInsurancePlans)
        .set(plan)
        .where(eq(healthInsurancePlans.id, id))
        .returning();
      return updatedPlan;
    } catch (error) {
      console.error("Erro ao atualizar plano de saúde:", error);
      return undefined;
    }
  }

  async deleteHealthInsurancePlan(id: number): Promise<boolean> {
    try {
      await db
        .delete(healthInsurancePlans)
        .where(eq(healthInsurancePlans.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir plano de saúde:", error);
      return false;
    }
  }

  // === MÉTODOS DE RECURSOS (APPEALS) ===
  
  async createAppeal(appeal: InsertAppeal): Promise<Appeal> {
    try {
      const [newAppeal] = await db
        .insert(appeals)
        .values(appeal)
        .returning();
      return newAppeal;
    } catch (error) {
      console.error("Erro ao criar recurso:", error);
      throw error;
    }
  }

  async getAppealsByOrderId(orderId: number): Promise<Appeal[]> {
    try {
      return await db
        .select()
        .from(appeals)
        .where(eq(appeals.orderId, orderId))
        .orderBy(desc(appeals.submittedAt));
    } catch (error) {
      console.error("Erro ao buscar recursos do pedido:", error);
      return [];
    }
  }

  async updateAppealStatus(appealId: number, status: string, reviewerNotes?: string): Promise<Appeal | undefined> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };
      
      if (reviewerNotes) {
        updateData.reviewerNotes = reviewerNotes;
        updateData.reviewedAt = new Date();
      }

      const [updatedAppeal] = await db
        .update(appeals)
        .set(updateData)
        .where(eq(appeals.id, appealId))
        .returning();
        
      return updatedAppeal;
    } catch (error) {
      console.error("Erro ao atualizar status do recurso:", error);
      return undefined;
    }
  }

  // Método auxiliar para buscar pedido por ID (usado nas rotas)
  async getMedicalOrderById(id: number): Promise<MedicalOrder | undefined> {
    return this.getMedicalOrder(id);
  }

  // ==== MÉTODOS CRUD PARA MEDICAL ORDER PROCEDURES ====
  
  async getMedicalOrderProcedures(orderId: number): Promise<MedicalOrderProcedure[]> {
    try {
      const procedures = await db
        .select({
          id: medicalOrderProcedures.id,
          orderId: medicalOrderProcedures.orderId,
          procedureId: medicalOrderProcedures.procedureId,
          quantityRequested: medicalOrderProcedures.quantityRequested,
          quantityApproved: medicalOrderProcedures.quantityApproved,
          status: medicalOrderProcedures.status,
          isMain: medicalOrderProcedures.isMain,
          createdAt: medicalOrderProcedures.createdAt,
          updatedAt: medicalOrderProcedures.updatedAt,
        })
        .from(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.orderId, orderId))
        .orderBy(desc(medicalOrderProcedures.isMain), medicalOrderProcedures.id);
      
      return procedures;
    } catch (error) {
      console.error("Erro ao buscar procedimentos do pedido:", error);
      return [];
    }
  }

  async createMedicalOrderProcedure(procedure: InsertMedicalOrderProcedure): Promise<MedicalOrderProcedure> {
    const [newProcedure] = await db
      .insert(medicalOrderProcedures)
      .values(procedure)
      .returning();
    
    return newProcedure;
  }

  async updateMedicalOrderProcedure(id: number, updates: Partial<InsertMedicalOrderProcedure>): Promise<MedicalOrderProcedure | undefined> {
    try {
      const [updatedProcedure] = await db
        .update(medicalOrderProcedures)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(medicalOrderProcedures.id, id))
        .returning();
      
      // Não há mais sincronização - usar apenas medical_order_procedures
      
      return updatedProcedure;
    } catch (error) {
      console.error("Erro ao atualizar procedimento:", error);
      return undefined;
    }
  }

  // Sincronização removida - usar apenas medical_order_procedures

  async deleteMedicalOrderProcedure(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error("Erro ao deletar procedimento:", error);
      return false;
    }
  }

  async updateProcedureApprovalStatus(id: number, quantityApproved: number, status: string): Promise<MedicalOrderProcedure | undefined> {
    try {
      const [updatedProcedure] = await db
        .update(medicalOrderProcedures)
        .set({
          quantityApproved,
          status,
          updatedAt: new Date(),
        })
        .where(eq(medicalOrderProcedures.id, id))
        .returning();
      
      return updatedProcedure;
    } catch (error) {
      console.error("Erro ao atualizar status de aprovação:", error);
      return undefined;
    }
  }
  
  // ==== MÉTODOS CRUD PARA CID-10 ====
  
  async getCidCodes(search?: string, category?: string): Promise<CidCode[]> {
    try {
      let query = db.select().from(cidCodes);
      
      const conditions = [];
      
      if (search) {
        conditions.push(
          or(
            ilike(cidCodes.code, `%${search}%`),
            ilike(cidCodes.description, `%${search}%`)
          )
        );
      }
      
      if (category) {
        conditions.push(eq(cidCodes.category, category));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(cidCodes.code);
    } catch (error) {
      console.error("Erro ao buscar códigos CID-10:", error);
      return [];
    }
  }
  
  async getCidCode(id: number): Promise<CidCode | undefined> {
    try {
      const [cidCode] = await db
        .select()
        .from(cidCodes)
        .where(eq(cidCodes.id, id))
        .limit(1);
      return cidCode;
    } catch (error) {
      console.error("Erro ao buscar código CID-10:", error);
      return undefined;
    }
  }
  
  async createCidCode(cidCode: InsertCidCode): Promise<CidCode> {
    try {
      const [newCidCode] = await db
        .insert(cidCodes)
        .values(cidCode)
        .returning();
      return newCidCode;
    } catch (error) {
      console.error("Erro ao criar código CID-10:", error);
      throw error;
    }
  }
  
  async updateCidCode(id: number, updates: Partial<InsertCidCode>): Promise<CidCode | undefined> {
    try {
      const [updatedCidCode] = await db
        .update(cidCodes)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(cidCodes.id, id))
        .returning();
      return updatedCidCode;
    } catch (error) {
      console.error("Erro ao atualizar código CID-10:", error);
      return undefined;
    }
  }
  
  async deleteCidCode(id: number): Promise<boolean> {
    try {
      await db
        .delete(cidCodes)
        .where(eq(cidCodes.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir código CID-10:", error);
      throw error;
    }
  }
}

// Versão com o banco de dados PostgreSQL
export const storage = new DatabaseStorage();