// Script para testar preservação de attachments
const orderId = 192;

console.log('🧪 TESTE: Verificando preservação de attachments');

// 1. Verificar attachments antes da operação
fetch(`/api/medical-orders/${orderId}`, { credentials: 'include' })
  .then(response => response.json())
  .then(data => {
    console.log('📋 ANTES - Attachments:', data.attachments?.length || 0);
    console.log('📋 ANTES - Detalhes:', data.attachments);
    
    // 2. Simular operação saveProgress (atualizar campo simples)
    const updateData = {
      additionalNotes: "Teste de preservação - " + new Date().toISOString(),
      statusId: 1,
      attachments: data.attachments || [] // Preservar attachments
    };
    
    console.log('🔄 TESTE: Enviando dados com attachments preservados');
    
    return fetch(`/api/medical-orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData)
    });
  })
  .then(response => response.json())
  .then(data => {
    console.log('📋 DEPOIS - Attachments:', data.attachments?.length || 0);
    console.log('📋 DEPOIS - Detalhes:', data.attachments);
    
    // 3. Verificar novamente no banco
    return fetch(`/api/medical-orders/${orderId}`, { credentials: 'include' });
  })
  .then(response => response.json())
  .then(data => {
    console.log('📋 VERIFICAÇÃO FINAL - Attachments:', data.attachments?.length || 0);
    console.log('📋 VERIFICAÇÃO FINAL - Detalhes:', data.attachments);
    
    if (data.attachments && data.attachments.length > 0) {
      console.log('✅ SUCESSO: Attachments preservados com sucesso!');
    } else {
      console.log('❌ FALHA: Attachments foram perdidos!');
    }
  })
  .catch(error => {
    console.error('❌ ERRO no teste:', error);
  });