import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Recuperar senha</CardTitle>
          <CardDescription>Enviaremos um link para seu email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" />
          </div>
          <Button className="w-full">Enviar link</Button>
          <div className="text-center text-sm">
            <Link href="/login" className="text-muted-foreground hover:underline">Voltar para login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
