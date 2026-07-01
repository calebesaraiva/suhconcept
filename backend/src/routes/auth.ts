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

function getPublicSiteUrl() {
  return String(process.env.PUBLIC_SITE_URL || 'https://suhconcept.com').trim().replace(/\/+$/, '');
}

function getGoogleRedirectUri() {
  return `${getPublicSiteUrl()}/api/auth/google/callback`;
}

function encodeState(payload: Record<string, string>) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeState(state?: string | null) {
  if (!state) return {};
  try {
    const parsed = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
    return typeof parsed === 'object' && parsed ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

function buildAccountRedirect(params: { token?: string; redirect?: string; error?: string }) {
  const siteUrl = getPublicSiteUrl();
  const hash = new URLSearchParams();

  if (params.token) hash.set('authToken', params.token);
  if (params.redirect) hash.set('authRedirect', params.redirect);
  if (params.error) hash.set('authError', params.error);

  const suffix = hash.toString();
  return `${siteUrl}/conta${suffix ? `#${suffix}` : ''}`;
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

router.get('/google/start', (req, res) => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    return res.redirect(buildAccountRedirect({ error: 'Login com Google ainda não foi configurado.' }));
  }

  const rawRedirect = String(req.query.redirect || '/').trim();
  const redirect = rawRedirect.startsWith('/') ? rawRedirect : '/';
  const state = encodeState({ redirect });

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', getGoogleRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', state);

  res.redirect(url.toString());
});

router.get('/google/callback', async (req, res) => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const state = decodeState(typeof req.query.state === 'string' ? req.query.state : null);
  const redirect = String(state.redirect || '/').trim();

  if (!clientId || !clientSecret) {
    return res.redirect(buildAccountRedirect({ redirect, error: 'Login com Google ainda não foi configurado.' }));
  }

  if (typeof req.query.error === 'string' && req.query.error) {
    return res.redirect(buildAccountRedirect({ redirect, error: 'Login com Google cancelado.' }));
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) {
    return res.redirect(buildAccountRedirect({ redirect, error: 'Nao foi possivel concluir o login com Google.' }));
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: getGoogleRedirectUri(),
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error('Falha ao trocar o codigo do Google por token.');
    }

    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) {
      throw new Error('Token de acesso do Google nao retornado.');
    }

    const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Falha ao consultar o perfil do Google.');
    }

    const googleUser = await userInfoResponse.json() as {
      email?: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
      picture?: string;
      sub?: string;
    };

    const email = String(googleUser.email || '').trim().toLowerCase();
    const name = String(googleUser.name || googleUser.given_name || 'Cliente SUH').trim();

    if (!email || !googleUser.email_verified) {
      throw new Error('A conta do Google precisa ter e-mail verificado.');
    }

    const fallbackPassword = await bcrypt.hash(`google:${googleUser.sub || email}:${SECRET}`, 10);
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: fallbackPassword,
          role: 'customer',
          active: true,
        },
      });
    } else if (!user.active && isStaffRole(user.role)) {
      return res.redirect(buildAccountRedirect({ redirect, error: 'Seu acesso esta desativado no momento.' }));
    } else if (user.name !== name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    await prisma.customer.upsert({
      where: { email },
      update: {
        name,
        avatar: googleUser.picture || undefined,
        status: 'ativo',
      },
      create: {
        name,
        email,
        avatar: googleUser.picture || undefined,
        status: 'ativo',
      },
    });

    const token = signUser(user);
    return res.redirect(buildAccountRedirect({ token, redirect }));
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(buildAccountRedirect({ redirect, error: 'Nao foi possivel concluir o login com Google.' }));
  }
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
