import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { isStaffRole, normalizeRole } from '../lib/roles';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'suh-secret-2026';

function signUser(user: { id: string; email: string; role: string }) {
  return jwt.sign({ id: user.id, email: user.email, role: normalizeRole(user.role) }, SECRET, { expiresIn: '7d' });
}

function sanitizeUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email, role: normalizeRole(user.role) };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Informe um nome válido' });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'Já existe uma conta com esse e-mail' });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role: 'customer',
      },
    });

    await prisma.customer.upsert({
      where: { email: cleanEmail },
      update: { name: cleanName },
      create: {
        name: cleanName,
        email: cleanEmail,
        status: 'ativo',
      },
    });

    const token = signUser(user);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    if (!user.active) return res.status(403).json({ error: 'Seu acesso ao painel está desativado no momento' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = signUser(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token required' });
    const payload = jwt.verify(token, SECRET) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!user.active && isStaffRole(user.role)) {
      return res.status(403).json({ error: 'Seu acesso ao painel está desativado no momento' });
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: normalizeRole(user.role) });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

router.get('/providers', (_req, res) => {
  res.json([
    {
      provider: 'google',
      enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      label: 'Google',
    },
    {
      provider: 'apple',
      enabled: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
      label: 'iCloud / Apple',
    },
  ]);
});

router.get('/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    const email = String(req.user?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerEmail: email },
          { customer: { email } },
        ],
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Erro ao carregar seus pedidos' });
  }
});

export default router;
