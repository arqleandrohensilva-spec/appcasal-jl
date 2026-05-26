import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/lib/context';

export const Route = createFileRoute('/')({
  component: Login,
});

function Login() {
  const { setActiveProfile } = useAppContext();
  const navigate = useNavigate();

  const handleSelect = (profile: 'leandro' | 'jonathan') => {
    setActiveProfile(profile);
    navigate({ to: '/app/dashboard' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">FinançasDuo</h1>
          <p className="mt-2 text-gray-600">Bem-vindo de volta, casal!</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-purple-600 transition-colors" onClick={() => handleSelect('leandro')}>
            <CardHeader className="text-center items-center">
              <Avatar className="h-16 w-16 bg-purple-600">
                <AvatarFallback className="text-white font-bold text-2xl">L</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-4">Leandro</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="cursor-pointer hover:border-emerald-600 transition-colors" onClick={() => handleSelect('jonathan')}>
            <CardHeader className="text-center items-center">
              <Avatar className="h-16 w-16 bg-emerald-600">
                <AvatarFallback className="text-white font-bold text-2xl">J</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-4">Jonathan</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-16 border-orange-500 text-orange-600 hover:bg-orange-50"
          onClick={() => { setActiveProfile('casal'); navigate({ to: '/app/dashboard' }); }}
        >
          Ver Diagnóstico do Casal
        </Button>
      </div>
    </div>
  );
}
