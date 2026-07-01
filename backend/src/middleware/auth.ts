import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isMasterRole, normalizeRole } from '../lib/roles';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'suh-secret-2026') as AuthRequest['user'];
    req.user = payload ? { ...payload, role: normalizeRole(payload.role) } : undefined;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Garante que o usuário autenticado é admin (rotas do painel administrativo)
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!isMasterRole(req.user?.role)) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador' });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const allowedRoles = roles.map(normalizeRole);
    const currentRole = normalizeRole(req.user?.role);
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar esta área' });
    }
    next();
  };
}
