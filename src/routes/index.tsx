import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Car, ClipboardList, ShieldCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => <Index />,
});

function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-8">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Análise e Migração Concluída</h1>
        <p className="text-xl text-muted-foreground">
          O projeto do Google Script foi analisado e transformado em um novo módulo: 
          <span className="font-bold text-foreground"> Revisão Toyota Seminovos</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        <Card className="text-left">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 uppercase">
              <Car className="h-4 w-4 text-primary" /> Banco de Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Tabela <code className="bg-muted px-1 rounded">toyota_revisoes</code> criada com todos os campos do GAS.</p>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 uppercase">
              <ShieldCheck className="h-4 w-4 text-primary" /> Perfis de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Novos perfis (Gestora, Mecânico, Vendedor) integrados ao sistema de permissões.</p>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 uppercase">
              <ClipboardList className="h-4 w-4 text-primary" /> Fluxo de Trabalho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Status dinâmicos implementados: Aguardando Aprovação, OS Aberta, Execução e Finalizado.</p>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 uppercase">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Interface
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Dashboard de revisões e formulário de nova solicitação já disponíveis.</p>
          </CardContent>
        </Card>
      </div>

      <Button size="lg" onClick={() => navigate({ to: '/toyota/revisoes' } as any)} className="gap-2 px-8">
        Acessar Novo Módulo <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
