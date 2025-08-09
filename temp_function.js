  const handleComplete = async () => {
    // Validar dados obrigatórios
    if (!selectedPatient || !selectedHospital || !clinicalIndication.trim() || !examImage || !cidCode || !cidDescription) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Preparar o objeto base de dados do pedido
      let orderData = {
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
        const response = await apiRequest(
          "PUT", 
          API_ENDPOINTS.MEDICAL_ORDER_BY_ID(orderId), 
          { ...orderData }
        );
        
        const data = await response.json();
        
        toast({
          title: "Pedido enviado com sucesso",
          description: `Pedido para ${selectedPatient?.fullName} no hospital ${selectedHospital?.name} foi atualizado e enviado para avaliação.`,
        });
        
        queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MEDICAL_ORDERS] });
        navigate("/");
      } else {
        // Senão, criamos um novo pedido com status "em avaliação"
        createOrderMutation.mutate(orderData);
      }
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast({
        title: "Erro ao finalizar pedido",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };