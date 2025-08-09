import { Router } from 'express';
import { db } from '../db';
import { surgeryAppointments, medicalOrders, patients, users, hospitals, medicalOrderProcedures, procedures } from '@shared/schema';
import { insertSurgeryAppointmentSchema } from '@shared/schema';
import { eq, and, desc, asc, inArray, isNull } from 'drizzle-orm';
import { isAuthenticated } from '../auth';

const router = Router();

// GET /api/surgery-appointments - Listar todos os agendamentos (filtrados por médico)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    console.log('📅 GET /api/surgery-appointments - Buscando agendamentos para usuário:', userId);
    
    // Buscar agendamentos do médico logado
    const appointments = await db
      .select()
      .from(surgeryAppointments)
      .where(eq(surgeryAppointments.doctorId, userId))
      .orderBy(desc(surgeryAppointments.scheduledDate), asc(surgeryAppointments.scheduledTime));

    console.log('📊 Agendamentos encontrados:', appointments.length);
    console.log('📋 Detalhes dos agendamentos:', appointments.map(a => ({
      id: a.id,
      scheduledDate: a.scheduledDate,
      scheduledTime: a.scheduledTime,
      surgeryType: a.surgeryType,
      status: a.status
    })));

    res.json(appointments);
  } catch (error) {
    console.error('❌ Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/surgery-appointments/available-orders - Buscar pedidos médicos disponíveis para agendamento
router.get('/available-orders', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    console.log('✅ Buscando pedidos disponíveis para usuário:', userId);

    // Buscar pedidos médicos do usuário logado que estão em status apropriado para agendamento
    // Status adequados: aguardando_envio (8), aceito (3)
    const orders = await db
      .select({
        id: medicalOrders.id,
        patientId: medicalOrders.patientId,
        patientName: patients.fullName,
        patientPhone: patients.phone,
        hospitalId: medicalOrders.hospitalId,
        hospitalName: hospitals.name,
        procedureType: medicalOrders.procedureType,
        procedureLaterality: medicalOrders.procedureLaterality,
        statusId: medicalOrders.statusId,
        createdAt: medicalOrders.createdAt,
        procedureDate: medicalOrders.procedureDate
      })
      .from(medicalOrders)
      .leftJoin(patients, eq(medicalOrders.patientId, patients.id))
      .leftJoin(hospitals, eq(medicalOrders.hospitalId, hospitals.id))
      .where(and(
        eq(medicalOrders.userId, userId),
        inArray(medicalOrders.statusId, [3, 8]) // aceito ou aguardando_envio
      ))
      .orderBy(desc(medicalOrders.createdAt));

    console.log('Pedidos encontrados no banco:', orders.length);
    console.log('📋 Dados dos pedidos do banco:', JSON.stringify(orders, null, 2));

    res.json(orders);
  } catch (error) {
    console.error('Erro ao buscar pedidos disponíveis:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/surgery-appointments/:id - Buscar um agendamento específico
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const userId = req.user!.id;

    const appointment = await db
      .select({
        id: surgeryAppointments.id,
        medicalOrderId: surgeryAppointments.medicalOrderId,
        patientId: surgeryAppointments.patientId,
        doctorId: surgeryAppointments.doctorId,
        hospitalId: surgeryAppointments.hospitalId,
        scheduledDate: surgeryAppointments.scheduledDate,
        scheduledTime: surgeryAppointments.scheduledTime,
        estimatedDuration: surgeryAppointments.estimatedDuration,
        surgeryType: surgeryAppointments.surgeryType,
        status: surgeryAppointments.status,
        surgeryRoom: surgeryAppointments.surgeryRoom,
        surgicalTeam: surgeryAppointments.surgicalTeam,
        preOperativeNotes: surgeryAppointments.preOperativeNotes,
        postOperativeNotes: surgeryAppointments.postOperativeNotes,
        actualStartTime: surgeryAppointments.actualStartTime,
        actualEndTime: surgeryAppointments.actualEndTime,
        actualDuration: surgeryAppointments.actualDuration,
        priority: surgeryAppointments.priority,
        notes: surgeryAppointments.notes,
        cancellationReason: surgeryAppointments.cancellationReason,
        createdAt: surgeryAppointments.createdAt,
        updatedAt: surgeryAppointments.updatedAt,
        // Informações do pedido médico
        medicalOrderTitle: medicalOrders.id,
        medicalOrderProcedureType: medicalOrders.procedureType,
        medicalOrderComplexity: medicalOrders.complexity,
        // Informações do paciente
        patientName: patients.fullName,
        patientPhone: patients.phone,
        patientCns: patients.cns,
        // Informações do hospital
        hospitalName: hospitals.name,
        hospitalCnes: hospitals.cnes,
        // Informações do médico
        doctorName: users.name,
        doctorCrm: users.crm,
      })
      .from(surgeryAppointments)
      .innerJoin(medicalOrders, eq(surgeryAppointments.medicalOrderId, medicalOrders.id))
      .innerJoin(patients, eq(surgeryAppointments.patientId, patients.id))
      .innerJoin(users, eq(surgeryAppointments.doctorId, users.id))
      .leftJoin(hospitals, eq(surgeryAppointments.hospitalId, hospitals.id))
      .where(and(
        eq(surgeryAppointments.id, appointmentId),
        eq(surgeryAppointments.doctorId, userId)
      ))
      .limit(1);

    if (!appointment.length) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json(appointment[0]);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/surgery-appointments - Criar novo agendamento
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validar dados de entrada
    const validatedData = insertSurgeryAppointmentSchema.parse({
      ...req.body,
      doctorId: userId,
      createdBy: userId
    });

    // Verificar se o pedido médico existe e pertence ao médico
    const medicalOrder = await db
      .select({ id: medicalOrders.id, patientId: medicalOrders.patientId })
      .from(medicalOrders)
      .where(and(
        eq(medicalOrders.id, validatedData.medicalOrderId),
        eq(medicalOrders.userId, userId)
      ))
      .limit(1);

    if (!medicalOrder.length) {
      return res.status(404).json({ error: 'Pedido médico não encontrado ou não pertence ao médico' });
    }

    // Permitir múltiplos agendamentos para facilitar testes

    // Criar novo agendamento
    const [newAppointment] = await db
      .insert(surgeryAppointments)
      .values({
        ...validatedData,
        patientId: medicalOrder[0].patientId,
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/surgery-appointments/:id - Atualizar agendamento existente
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const userId = req.user!.id;

    console.log('🔄 PUT /api/surgery-appointments/:id - Dados recebidos:', { 
      appointmentId, 
      userId, 
      body: req.body 
    });

    // Verificar se o agendamento existe e pertence ao médico
    const existingAppointment = await db
      .select({ id: surgeryAppointments.id })
      .from(surgeryAppointments)
      .where(and(
        eq(surgeryAppointments.id, appointmentId),
        eq(surgeryAppointments.doctorId, userId)
      ))
      .limit(1);

    console.log('🔍 Existing appointment found:', existingAppointment.length > 0);

    if (!existingAppointment.length) {
      console.log('❌ Agendamento não encontrado');
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Validar e atualizar dados
    const validatedData = insertSurgeryAppointmentSchema.partial().parse({
      ...req.body,
      updatedAt: new Date()
    });

    console.log('✅ Dados validados:', validatedData);

    const [updatedAppointment] = await db
      .update(surgeryAppointments)
      .set(validatedData)
      .where(eq(surgeryAppointments.id, appointmentId))
      .returning();

    console.log('✅ Agendamento atualizado com sucesso:', updatedAppointment);

    res.json(updatedAppointment);
  } catch (error) {
    console.error('❌ Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/surgery-appointments/by-medical-order/:medicalOrderId - Buscar agendamento por pedido médico
router.get('/by-medical-order/:medicalOrderId', isAuthenticated, async (req, res) => {
  try {
    const medicalOrderId = parseInt(req.params.medicalOrderId);
    const userId = req.user!.id;

    console.log('🔍 Buscando agendamento para pedido médico:', medicalOrderId, 'usuário:', userId);

    // Buscar agendamento mais recente para o pedido médico (em caso de reagendamentos)
    const appointment = await db
      .select({
        id: surgeryAppointments.id,
        medicalOrderId: surgeryAppointments.medicalOrderId,
        scheduledDate: surgeryAppointments.scheduledDate,
        scheduledTime: surgeryAppointments.scheduledTime,
        estimatedDuration: surgeryAppointments.estimatedDuration,
        surgeryType: surgeryAppointments.surgeryType,
        status: surgeryAppointments.status,
        surgeryRoom: surgeryAppointments.surgeryRoom,
        priority: surgeryAppointments.priority,
        notes: surgeryAppointments.notes,
        createdAt: surgeryAppointments.createdAt,
        updatedAt: surgeryAppointments.updatedAt,
      })
      .from(surgeryAppointments)
      .where(and(
        eq(surgeryAppointments.medicalOrderId, medicalOrderId),
        eq(surgeryAppointments.doctorId, userId)
      ))
      .orderBy(desc(surgeryAppointments.createdAt)) // Mais recente primeiro
      .limit(1);

    console.log('📋 Agendamento encontrado:', appointment);

    if (appointment.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado para este pedido médico' });
    }

    res.json(appointment[0]);
  } catch (error) {
    console.error('❌ Erro ao buscar agendamento por pedido médico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/surgery-appointments/:id - Excluir agendamento
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Verificar se o agendamento existe e pertence ao médico
    const existingAppointment = await db
      .select({ id: surgeryAppointments.id })
      .from(surgeryAppointments)
      .where(and(
        eq(surgeryAppointments.id, appointmentId),
        eq(surgeryAppointments.doctorId, userId)
      ))
      .limit(1);

    if (!existingAppointment.length) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Excluir agendamento
    await db
      .delete(surgeryAppointments)
      .where(eq(surgeryAppointments.id, appointmentId));

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/surgery-appointments/estimated-duration/:orderId - Calcular duração estimada baseada nos procedimentos CBHPM
router.get('/estimated-duration/:orderId', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'ID de pedido inválido' });
    }

    console.log(`🕒 Calculando duração estimada para pedido ${orderId}`);

    // Buscar procedimentos CBHPM do pedido com informações de duração
    const procedures = await db
      .select({
        code: procedures.code,
        description: procedures.description,
        porte: procedures.porte,
        isMain: medicalOrderProcedures.isMain
      })
      .from(medicalOrderProcedures)
      .innerJoin(procedures, eq(medicalOrderProcedures.procedureId, procedures.id))
      .where(eq(medicalOrderProcedures.orderId, orderId))
      .orderBy(desc(medicalOrderProcedures.isMain));

    if (procedures.length === 0) {
      console.log(`⚠️ Nenhum procedimento encontrado para pedido ${orderId}`);
      return res.json({ estimatedDuration: 60 }); // Duração padrão de 60 minutos
    }

    // Calcular duração baseada no porte dos procedimentos
    let totalDuration = 0;
    
    procedures.forEach((proc, index) => {
      let procedureDuration = 60; // Duração base padrão

      // Mapear porte para duração estimada (baseado na complexidade médica)
      const porte = proc.porte?.toLowerCase() || '';
      
      if (porte.includes('01') || porte.includes('02') || porte === 'ambulatorial') {
        procedureDuration = 30; // Procedimentos simples
      } else if (porte.includes('03') || porte.includes('04') || porte === 'baixa') {
        procedureDuration = 60; // Procedimentos de baixa complexidade
      } else if (porte.includes('05') || porte.includes('06') || porte.includes('07') || porte === 'media') {
        procedureDuration = 90; // Procedimentos de média complexidade
      } else if (porte.includes('08') || porte.includes('09') || porte.includes('10') || porte === 'alta') {
        procedureDuration = 120; // Procedimentos de alta complexidade
      } else if (porte.includes('11') || porte.includes('12') || porte === 'especial') {
        procedureDuration = 180; // Procedimentos especiais
      }

      // Procedimento principal recebe duração completa, secundários recebem 50%
      if (index === 0 || proc.isMain) {
        totalDuration += procedureDuration;
      } else {
        totalDuration += Math.round(procedureDuration * 0.5);
      }

      console.log(`📋 Procedimento: ${proc.code} (${proc.porte}) - Duração: ${procedureDuration}min (${proc.isMain ? 'Principal' : 'Secundário'})`);
    });

    // Adicionar 15 minutos de margem para preparação
    totalDuration += 15;

    console.log(`⏱️ Duração total estimada: ${totalDuration} minutos`);

    res.json({ 
      estimatedDuration: totalDuration,
      proceduresCount: procedures.length,
      procedures: procedures.map(p => ({
        code: p.code,
        description: p.description,
        porte: p.porte,
        isMain: p.isMain
      }))
    });
  } catch (error) {
    console.error('❌ Erro ao calcular duração estimada:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;