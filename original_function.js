  const handleComplete = async () => {
    try {
      if (!selectedPatient || !selectedHospital || !clinicalIndication.trim() || !examImage || !cidCode || !cidDescription) {
        toast({
          title: "Dados incompletos",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }
      
      // Preparar o objeto base de dados do pedido
      let orderData: any = {
        patientId: selectedPatient.id,
        userId: user?.id,
        hospitalId: selectedHospital.id,
        procedureId: procedureId,
        clinicalIndication: clinicalIndication,
        additionalNotes: additionalNotes,
        cidCode: cidCode,
        cidDescription: cidDescription,
        status: ORDER_STATUS_VALUES.EM_AVALIACAO,
        examImageUrl: null,
        medicalReportUrl: null,
        additionalImagesCount: 0,
        additionalImageUrls: []
      };
      
      // Upload da imagem principal do exame
      if (examImage) {
        toast({
          title: "Processando",
          description: "Enviando imagem do exame...",
        });
        
        const uploadResult = await uploadExamImage(examImage);
        orderData.examImageUrl = uploadResult.url;
      }
      
      // Upload do laudo médico (se existir)
      if (medicalReport) {
        toast({
          title: "Processando",
          description: "Enviando laudo médico...",
        });
        
        const reportResult = await uploadMedicalReport(medicalReport);
        orderData.medicalReportUrl = reportResult.url;
      }
      
      // Upload de imagens adicionais (se existirem)
      if (examAdditionalImages.length > 0) {
        toast({
          title: "Processando",
          description: `Enviando ${examAdditionalImages.length} imagens adicionais...`,
        });
        
        const additionalResults = await uploadAdditionalImages(examAdditionalImages);
        orderData.additionalImagesCount = additionalResults.length;
        orderData.additionalImageUrls = additionalResults.map(result => result.url);
      }
    
    // Se já temos um pedido em andamento, atualizamos o status para "em avaliação"
    if (orderId) {
      // Utilizar o endpoint de update com o ID do pedido
      apiRequest(
        "PUT", 
        API_ENDPOINTS.MEDICAL_ORDER_BY_ID(orderId), 
        { ...orderData }
      ).then(response => {
        return response.json();
      }).then(data => {
        toast({
          title: "Pedido enviado com sucesso",
          description: `Pedido para ${selectedPatient?.fullName} no hospital ${selectedHospital?.name} foi atualizado e enviado para avaliação.`,
        });
        queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MEDICAL_ORDERS] });
        navigate("/");
      }).catch(error => {
        toast({
          title: "Erro ao finalizar pedido",
          description: error.message,
          variant: "destructive",
        });
      });
    } else {
      // Caso contrário criamos um novo pedido
      createOrderMutation.mutate(orderData);
    }
  };

  // Função para tratar a seleção de paciente e verificar se há pedidos em andamento
  const handlePatientSelected = async (patient: Patient) => {
    // Verificar se há pedido em andamento para este paciente
    const existingOrder = await fetchPatientOrder(patient.id);
    
    if (existingOrder) {
      // Se há um pedido em andamento, mostrar diálogo de confirmação
      setExistingOrder(existingOrder);
      setExistingOrderDialog(true);
    } else {
      // Se não há pedido em andamento, apenas definir o paciente selecionado
      setSelectedPatient(patient);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-grow overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Novo Pedido Cirúrgico</h2>
            <p className="text-muted-foreground">
              {currentStep === 1 && "Selecione o paciente e o hospital para o pedido cirúrgico"}
              {currentStep === 2 && "Forneça informações do exame e laudo do exame de imagem"}
              {currentStep === 3 && "Informe o código CID e dados para a cirurgia"}
              {currentStep === 4 && "Confirme os dados do pedido cirúrgico"}
            </p>
            {currentStep > 1 && (
              <p className="text-sm text-primary/80 mt-1">
