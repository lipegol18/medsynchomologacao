// Script para listar todos os pacientes armazenados
const fs = require('fs');
const path = require('path');

// Função para buscar os pacientes cadastrados através da API
async function listPatients() {
  try {
    // Fazer requisição para a API de pacientes
    const response = await fetch('http://localhost:5000/api/patients', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar pacientes: ${response.status}`);
    }
    
    const patients = await response.json();
    console.log('\n=== PACIENTES CADASTRADOS ===');
    console.log('Total de pacientes:', patients.length);
    console.log('\nDETALHES:');
    
    patients.forEach((patient, index) => {
      console.log(`\n--- Paciente ${index + 1} ---`);
      console.log(`ID: ${patient.id}`);
      console.log(`Nome: ${patient.fullName}`);
      console.log(`CPF: ${patient.cpf}`);
      console.log(`Gênero: ${patient.gender}`);
      console.log(`Plano: ${patient.plan || 'Não informado'}`);
      
      // Verificar se é um paciente cadastrado localmente (ambiente de desenvolvimento)
      if (patient.source === 'local_register') {
        console.log('Ambiente: Desenvolvimento (cadastrado localmente)');
      } else {
        console.log('Ambiente: Produção');
      }
      
      console.log(`Ativo: ${patient.isActive ? 'Sim' : 'Não'}`);
      console.log(`Ativado por: ${patient.activatedBy || 'Não informado'}`);
    });
  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
  }
}

// Executar a função
listPatients();
