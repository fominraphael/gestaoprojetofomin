import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, CheckCircle2, FileText, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState } from 'react';

export const Route = createFileRoute('/_authenticated/_toyota/toyota/revisoes')({
  component: ToyotaRevisoesPage,
});

function ToyotaRevisoesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pendentes');

  const { data: revisoes, isLoading } = useQuery({
    queryKey: ['toyota_revisoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('toyota_revisoes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const statusMap: Record<string, { label: string; color: string }> = {
    aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
    aprovado_pos_vendas: { label: 'Aprovado Pós-Vendas', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
    os_aberta: { label: 'OS Aberta', color: 'bg-green-500/10 text-green-600 border-green-200' },
    em_execucao: { label: 'Em Execução', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200' },
    finalizado: { label: 'Finalizado', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
    cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-200' },
  };

  if (isLoading) return <div className="p-8 text-center">Carregando solicitações...</div>;

  return (
    <div className="container-fluid p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revisão Toyota Seminovos</h1>
          <p className="text-muted-foreground">Fluxo de revisão, certificação e pós-vendas</p>
        </div>
        <Button className="gap-2" onClick={() => navigate({ to: '/toyota/revisoes/nova' })}>
          <Plus className="h-4 w-4" /> Nova Solicitação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Aguardando</CardTitle>
            <ClipboardList className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revisoes?.filter(r => r.status === 'aguardando_aprovacao').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Em Execução</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revisoes?.filter(r => r.status === 'em_execucao' || r.status === 'os_aberta').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Finalizados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revisoes?.filter(r => r.status === 'finalizado').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Mês</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revisoes?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 border">
          <TabsTrigger value="pendentes" className="data-[state=active]:bg-background">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovados" className="data-[state=active]:bg-background">Aprovados / OS</TabsTrigger>
          <TabsTrigger value="finalizados" className="data-[state=active]:bg-background">Finalizados</TabsTrigger>
          <TabsTrigger value="todos" className="data-[state=active]:bg-background">Histórico Geral</TabsTrigger>
        </TabsList>

        <Card className="mt-4 border-none shadow-none bg-transparent">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Placa / Modelo</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card">
              {revisoes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma solicitação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                revisoes?.map((rev) => (
                  <TableRow key={rev.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {rev.id?.split('-')[0].toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {rev.created_at ? format(new Date(rev.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {rev.created_at ? format(new Date(rev.created_at), 'HH:mm', { locale: ptBR }) : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">{rev.placa}</span>
                        <span className="text-xs uppercase font-medium">{rev.modelo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {rev.revisao && <Badge variant="secondary" className="text-[10px] uppercase font-black bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Revisão</Badge>}
                        {rev.certificacao && <Badge variant="secondary" className="text-[10px] uppercase font-black bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">Certificação</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] uppercase font-black border-none ${rev.prioridade === 'URGENTE' ? 'bg-red-100 text-red-700' : rev.prioridade === 'ALTA' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                        {rev.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-black text-[10px] uppercase border ${rev.status && statusMap[rev.status] ? statusMap[rev.status].color : ''}`}>
                        {rev.status && statusMap[rev.status] ? statusMap[rev.status].label : rev.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </Tabs>
    </div>
  );
}
