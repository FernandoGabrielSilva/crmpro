import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Cadastro desativado</CardTitle>
          <CardDescription>
            As contas de acesso são criadas pelo administrador da empresa em Configurações → Equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Se você precisa de acesso, solicite ao responsável da sua empresa.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
