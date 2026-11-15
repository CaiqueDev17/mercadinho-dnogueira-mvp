import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../regras/auth.service';

/** Só abre as telas depois do PIN. Sem sessão, volta para a entrada. */
export const autenticadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.autenticado()) {
    auth.reiniciarInatividade();
    return true;
  }
  return router.parseUrl('/entrar');
};
