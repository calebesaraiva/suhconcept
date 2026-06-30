import { useState, useEffect } from 'react';
import { Coins, Truck, MapPin, Clock, Key, Check, Info, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useStore } from '../../store/useStore';

const inp: React.CSSProperties = {
  width: '100%', background: '#0d0d0d',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, padding: '10px 12px',
  color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#999',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5,
};
const focIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = 'rgba(255,255,255,0.2)');
const focOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = 'rgba(255,255,255,0.08)');

function Toggle({ on, color = '#a855f7', onChange }: { on: boolean; color?: string; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 3, flexShrink: 0,
        background: on ? `linear-gradient(135deg,${color},#FF2DA0)` : 'rgba(255,255,255,0.08)',
        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.2s' }} />
    </button>
  );
}

function Card({ children, title, icon: Icon, color = '#FF2DA0' }: { children: React.ReactNode; title: string; icon: React.ElementType; color?: string }) {
  return (
    <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <h3 style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <p style={{ fontWeight: 700, color: '#ccc', fontSize: 13 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { showToast } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Cashback
  const [cashbackEnabled, setCashbackEnabled] = useState(true);
  const [cashbackRate, setCashbackRate] = useState(5);
  const [cashbackExpiry, setCashbackExpiry] = useState(90);

  // Shipping
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [freeShipPromo, setFreeShipPromo] = useState(false);
  const [freeShipThreshold, setFreeShipThreshold] = useState(599.99);
  const [whatsapp, setWhatsapp] = useState('');
  const [melhorEnvioEnabled, setMelhorEnvioEnabled] = useState(true);
  const [melhorEnvioCepOrigem, setMelhorEnvioCepOrigem] = useState('65900000');
  const [melhorEnvioServiceIds, setMelhorEnvioServiceIds] = useState('');
  const [melhorEnvioAccessToken, setMelhorEnvioAccessToken] = useState('');
  const [melhorEnvioEnvironment, setMelhorEnvioEnvironment] = useState<'production' | 'sandbox'>('production');
  const [melhorEnvioAppName, setMelhorEnvioAppName] = useState('SUH CONCEPT');
  const [melhorEnvioAppEmail, setMelhorEnvioAppEmail] = useState('suporte@suhconcept.com');
  const [correiosPesoGramas, setCorreiosPesoGramas] = useState(500);
  const [correiosComprimentoCm, setCorreiosComprimentoCm] = useState(24);
  const [correiosLarguraCm, setCorreiosLarguraCm] = useState(18);
  const [correiosAlturaCm, setCorreiosAlturaCm] = useState(8);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [storeAddress, setStoreAddress] = useState('');
  const [storeHours, setStoreHours] = useState('Seg–Sáb: 9h–19h · Dom: 10h–14h');
  const [pickupDays, setPickupDays] = useState(2);

  // Payments
  const [pixKey, setPixKey] = useState('');
  const [pixEnabled, setPixEnabled] = useState(true);
  const [pixDiscount, setPixDiscount] = useState(5);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [maxInstallments, setMaxInstallments] = useState(12);
  const [interestFreeInstallments, setInterestFreeInstallments] = useState(3);
  const [pagbankEnabled, setPagbankEnabled] = useState(true);
  const [pagbankEnvironment, setPagbankEnvironment] = useState<'production' | 'sandbox'>('production');
  const [pagbankToken, setPagbankToken] = useState('');
  const [storeDisplayName, setStoreDisplayName] = useState('SUH CONCEPT');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');

  useEffect(() => {
    api.dashboard.getSettings().then(s => {
      if (s.cashbackEnabled !== undefined)   setCashbackEnabled(s.cashbackEnabled === 'true');
      if (s.cashbackRate)                    setCashbackRate(Number(s.cashbackRate));
      if (s.cashbackExpiry)                  setCashbackExpiry(Number(s.cashbackExpiry));
      if (s.deliveryEnabled !== undefined)   setDeliveryEnabled(s.deliveryEnabled === 'true');
      if (s.freeShipPromo !== undefined)     setFreeShipPromo(s.freeShipPromo === 'true');
      if (s.freeShipThreshold)               setFreeShipThreshold(Number(s.freeShipThreshold));
      if (s.whatsapp)                        setWhatsapp(s.whatsapp);
      if (s.melhorEnvioEnabled !== undefined) setMelhorEnvioEnabled(s.melhorEnvioEnabled === 'true');
      else if (s.correiosEnabled !== undefined) setMelhorEnvioEnabled(s.correiosEnabled === 'true');
      if (s.melhorEnvioCepOrigem)            setMelhorEnvioCepOrigem(s.melhorEnvioCepOrigem);
      else if (s.correiosCepOrigem)          setMelhorEnvioCepOrigem(s.correiosCepOrigem);
      if (s.melhorEnvioServiceIds !== undefined) setMelhorEnvioServiceIds(s.melhorEnvioServiceIds);
      else if (s.correiosServiceCodes)       setMelhorEnvioServiceIds(s.correiosServiceCodes);
      if (s.melhorEnvioAccessToken)          setMelhorEnvioAccessToken(s.melhorEnvioAccessToken);
      else if (s.correiosToken)              setMelhorEnvioAccessToken(s.correiosToken);
      if (s.melhorEnvioEnvironment === 'sandbox' || s.melhorEnvioEnvironment === 'production') setMelhorEnvioEnvironment(s.melhorEnvioEnvironment);
      if (s.melhorEnvioAppName)              setMelhorEnvioAppName(s.melhorEnvioAppName);
      if (s.melhorEnvioAppEmail)             setMelhorEnvioAppEmail(s.melhorEnvioAppEmail);
      if (s.correiosPesoGramas)              setCorreiosPesoGramas(Number(s.correiosPesoGramas));
      if (s.correiosComprimentoCm)           setCorreiosComprimentoCm(Number(s.correiosComprimentoCm));
      if (s.correiosLarguraCm)               setCorreiosLarguraCm(Number(s.correiosLarguraCm));
      if (s.correiosAlturaCm)                setCorreiosAlturaCm(Number(s.correiosAlturaCm));
      if (s.pickupEnabled !== undefined)     setPickupEnabled(s.pickupEnabled === 'true');
      if (s.storeAddress)                    setStoreAddress(s.storeAddress);
      if (s.storeHours)                      setStoreHours(s.storeHours);
      if (s.pickupDays)                      setPickupDays(Number(s.pickupDays));
      if (s.pixKey)                          setPixKey(s.pixKey);
      if (s.pixEnabled !== undefined)        setPixEnabled(s.pixEnabled === 'true');
      if (s.pixDiscount)                     setPixDiscount(Number(s.pixDiscount));
      if (s.cardEnabled !== undefined)       setCardEnabled(s.cardEnabled === 'true');
      if (s.maxInstallments)                 setMaxInstallments(Number(s.maxInstallments));
      if (s.interestFreeInstallments)        setInterestFreeInstallments(Number(s.interestFreeInstallments));
      if (s.pagbankEnabled !== undefined)    setPagbankEnabled(s.pagbankEnabled === 'true');
      if (s.pagbankEnvironment === 'sandbox' || s.pagbankEnvironment === 'production') setPagbankEnvironment(s.pagbankEnvironment);
      if (s.pagbankToken)                    setPagbankToken(s.pagbankToken);
      if (s.storeDisplayName)                setStoreDisplayName(s.storeDisplayName);
      if (s.smtpHost)                        setSmtpHost(s.smtpHost);
      if (s.smtpPort)                        setSmtpPort(Number(s.smtpPort));
      if (s.smtpSecure !== undefined)        setSmtpSecure(s.smtpSecure === 'true');
      if (s.smtpUser)                        setSmtpUser(s.smtpUser);
      if (s.smtpPass)                        setSmtpPass(s.smtpPass);
      if (s.smtpFromEmail)                   setSmtpFromEmail(s.smtpFromEmail);
      if (s.smtpFromName)                    setSmtpFromName(s.smtpFromName);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.dashboard.saveSettings({
        cashbackEnabled: String(cashbackEnabled),
        cashbackRate: String(cashbackRate),
        cashbackExpiry: String(cashbackExpiry),
        deliveryEnabled: String(deliveryEnabled),
        freeShipPromo: String(freeShipPromo),
        freeShipThreshold: String(freeShipThreshold),
        whatsapp,
        melhorEnvioEnabled: String(melhorEnvioEnabled),
        melhorEnvioCepOrigem,
        melhorEnvioServiceIds,
        melhorEnvioAccessToken,
        melhorEnvioEnvironment,
        melhorEnvioAppName,
        melhorEnvioAppEmail,
        correiosPesoGramas: String(correiosPesoGramas),
        correiosComprimentoCm: String(correiosComprimentoCm),
        correiosLarguraCm: String(correiosLarguraCm),
        correiosAlturaCm: String(correiosAlturaCm),
        pickupEnabled: String(pickupEnabled),
        storeAddress,
        storeHours,
        pickupDays: String(pickupDays),
        pixKey,
        pixEnabled: String(pixEnabled),
        pixDiscount: String(pixDiscount),
        cardEnabled: String(cardEnabled),
        maxInstallments: String(maxInstallments),
        interestFreeInstallments: String(interestFreeInstallments),
        pagbankEnabled: String(pagbankEnabled),
        pagbankEnvironment,
        pagbankToken,
        storeDisplayName,
        smtpHost,
        smtpPort: String(smtpPort),
        smtpSecure: String(smtpSecure),
        smtpUser,
        smtpPass,
        smtpFromEmail,
        smtpFromName,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      showToast('Configurações salvas!');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#555' }}>
      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Carregando configurações...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Configurações</h1>
          <p style={{ fontSize: 13, color: '#999' }}>Cashback, entrega, pagamentos e loja</p>
        </div>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10,
            background: saved ? 'rgba(34,197,94,0.12)' : 'linear-gradient(135deg,#a855f7,#FF2DA0)',
            color: saved ? '#22C55E' : '#fff', fontWeight: 800, fontSize: 13,
            border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.25s', opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={15} />}
          {saved ? 'SALVO!' : saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
        </button>
      </div>

      {/* Cashback */}
      <Card title="Cashback" icon={Coins} color="#a855f7">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Row label="Ativar cashback" sub="Crédito automático na carteira do cliente">
            <Toggle on={cashbackEnabled} onChange={setCashbackEnabled} />
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, opacity: cashbackEnabled ? 1 : 0.4, pointerEvents: cashbackEnabled ? 'auto' : 'none' }}>
            <div>
              <label style={lbl}>Taxa de cashback (%)</label>
              <input type="number" style={inp} value={cashbackRate} onChange={e => setCashbackRate(Number(e.target.value))} min={0} max={30} step={0.5} onFocus={focIn} onBlur={focOut} />
            </div>
            <div>
              <label style={lbl}>Validade dos créditos (dias)</label>
              <input type="number" style={inp} value={cashbackExpiry} onChange={e => setCashbackExpiry(Number(e.target.value))} min={1} onFocus={focIn} onBlur={focOut} />
            </div>
          </div>
          {cashbackEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <Info size={13} style={{ color: '#a855f7', flexShrink: 0 }} />
              <p style={{ fontSize: 11.5, color: '#a855f7' }}>Clientes ganham <strong>{cashbackRate}%</strong> a cada compra, válido por {cashbackExpiry} dias.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Entrega */}
      <Card title="Entrega e Retirada" icon={Truck} color="#3b82f6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Entrega a domicílio */}
          <Row label="Entrega a domicílio" sub="Habilitar opção de entrega no checkout">
            <Toggle on={deliveryEnabled} color="#3b82f6" onChange={setDeliveryEnabled} />
          </Row>

          {deliveryEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px', borderRadius: 10, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)' }}>

              {/* Frete grátis promoção */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: 700, color: freeShipPromo ? '#22c55e' : '#ccc', fontSize: 13 }}>
                    🎉 Frete grátis para todos (promoção)
                  </p>
                  <p style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                    Quando ativo, nenhum cliente paga frete — independente do valor
                  </p>
                </div>
                <Toggle on={freeShipPromo} color="#22c55e" onChange={setFreeShipPromo} />
              </div>

              {freeShipPromo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <Info size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
                  <p style={{ fontSize: 11.5, color: '#22c55e' }}>Promoção de frete grátis <strong>ativa</strong>. Todos os pedidos com entrega não pagam frete.</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, opacity: freeShipPromo ? 0.4 : 1, pointerEvents: freeShipPromo ? 'none' : 'auto' }}>
                <div>
                  <label style={lbl}>Frete grátis acima de (R$)</label>
                  <input type="number" style={inp} value={freeShipThreshold} onChange={e => setFreeShipThreshold(Number(e.target.value))} min={0} onFocus={focIn} onBlur={focOut} />
                </div>
                <div>
                  <label style={lbl}>WhatsApp da loja</label>
                  <input style={inp} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(99) 99999-9999" onFocus={focIn} onBlur={focOut} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'rgba(216,168,74,0.06)', border: '1px solid rgba(216,168,74,0.16)' }}>
                <div>
                  <p style={{ fontWeight: 700, color: melhorEnvioEnabled ? '#d8a84a' : '#ccc', fontSize: 13 }}>Cálculo automático · Melhor Envio</p>
                  <p style={{ fontSize: 11, color: '#777', marginTop: 2 }}>Cota valor e prazo pelo CEP antes do checkout</p>
                </div>
                <Toggle on={melhorEnvioEnabled} color="#d8a84a" onChange={setMelhorEnvioEnabled} />
              </div>

              {melhorEnvioEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={lbl}>CEP de origem</label>
                    <input style={inp} value={melhorEnvioCepOrigem} onChange={e => setMelhorEnvioCepOrigem(e.target.value)} placeholder="65900000" onFocus={focIn} onBlur={focOut} />
                  </div>
                  <div>
                    <label style={lbl}>Ambiente</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={melhorEnvioEnvironment} onChange={e => setMelhorEnvioEnvironment(e.target.value as 'production' | 'sandbox')} onFocus={focIn} onBlur={focOut}>
                      <option value="production" style={{ background: '#111' }}>Produção</option>
                      <option value="sandbox" style={{ background: '#111' }}>Sandbox</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>Access Token Melhor Envio</label>
                    <input type="password" style={inp} value={melhorEnvioAccessToken} onChange={e => setMelhorEnvioAccessToken(e.target.value)} placeholder="Cole aqui o bearer token OAuth do Melhor Envio" onFocus={focIn} onBlur={focOut} />
                  </div>
                  <div>
                    <label style={lbl}>Nome no User-Agent</label>
                    <input style={inp} value={melhorEnvioAppName} onChange={e => setMelhorEnvioAppName(e.target.value)} placeholder="SUH CONCEPT" onFocus={focIn} onBlur={focOut} />
                  </div>
                  <div>
                    <label style={lbl}>E-mail técnico no User-Agent</label>
                    <input style={inp} value={melhorEnvioAppEmail} onChange={e => setMelhorEnvioAppEmail(e.target.value)} placeholder="suporte@suhconcept.com" onFocus={focIn} onBlur={focOut} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>IDs de serviços do Melhor Envio</label>
                    <input style={inp} value={melhorEnvioServiceIds} onChange={e => setMelhorEnvioServiceIds(e.target.value)} placeholder="Opcional. Ex.: 1,2,17" onFocus={focIn} onBlur={focOut} />
                  </div>
                  <div>
                    <label style={lbl}>Peso padrão (g)</label>
                    <input type="number" style={inp} value={correiosPesoGramas} onChange={e => setCorreiosPesoGramas(Number(e.target.value))} min={1} onFocus={focIn} onBlur={focOut} />
                  </div>
                  <div>
                    <label style={lbl}>Medidas base C x L x A (cm)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <input type="number" style={inp} value={correiosComprimentoCm} onChange={e => setCorreiosComprimentoCm(Number(e.target.value))} min={16} onFocus={focIn} onBlur={focOut} />
                      <input type="number" style={inp} value={correiosLarguraCm} onChange={e => setCorreiosLarguraCm(Number(e.target.value))} min={11} onFocus={focIn} onBlur={focOut} />
                      <input type="number" style={inp} value={correiosAlturaCm} onChange={e => setCorreiosAlturaCm(Number(e.target.value))} min={2} onFocus={focIn} onBlur={focOut} />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <Info size={13} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11.5, color: '#3b82f6', lineHeight: 1.6 }}>
                  O Melhor Envio usa OAuth 2.0. Com token ativo, o frete entra automaticamente no total e no checkout. Se o token estiver vazio ou expirado, a loja continua com atendimento manual como segurança.
                </p>
              </div>
            </div>
          )}

          {/* Retirada */}
          <Row label="Retirada na loja" sub="Habilitar opção de retirar na loja física">
            <Toggle on={pickupEnabled} color="#a855f7" onChange={setPickupEnabled} />
          </Row>

          {pickupEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px', borderRadius: 10, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <label style={lbl}><MapPin size={10} style={{ display: 'inline', marginRight: 4 }} />Endereço da loja</label>
                <input style={inp} value={storeAddress} onChange={e => setStoreAddress(e.target.value)} placeholder="Rua, número — Bairro, Cidade – UF, CEP" onFocus={focIn} onBlur={focOut} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}><Clock size={10} style={{ display: 'inline', marginRight: 4 }} />Horário de funcionamento</label>
                  <input style={inp} value={storeHours} onChange={e => setStoreHours(e.target.value)} onFocus={focIn} onBlur={focOut} />
                </div>
                <div>
                  <label style={lbl}>Prazo de retirada (dias úteis)</label>
                  <input type="number" style={inp} value={pickupDays} onChange={e => setPickupDays(Number(e.target.value))} min={0} onFocus={focIn} onBlur={focOut} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Pagamentos */}
      <Card title="Meios de Pagamento" icon={Key} color="#FF2DA0">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ padding: '16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pixEnabled ? 14 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12L12 4L20 12L12 20L4 12Z" stroke="#22C55E" strokeWidth="2"/></svg>
                </div>
                <p style={{ fontWeight: 700, color: '#ccc', fontSize: 13 }}>PIX</p>
              </div>
              <Toggle on={pixEnabled} color="#22c55e" onChange={setPixEnabled} />
            </div>
            {pixEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Chave PIX</label>
                  <input style={inp} value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave" onFocus={focIn} onBlur={focOut} />
                </div>
                <div>
                  <label style={lbl}>Desconto PIX (%)</label>
                  <input type="number" style={inp} value={pixDiscount} onChange={e => setPixDiscount(Number(e.target.value))} min={0} max={50} onFocus={focIn} onBlur={focOut} />
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: cardEnabled ? 14 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,45,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="10" viewBox="0 0 24 16" fill="none"><rect width="24" height="16" rx="3" stroke="#FF2DA0" strokeWidth="1.5"/><rect x="0" y="4" width="24" height="3" fill="#FF2DA0" opacity="0.4"/></svg>
                </div>
                <p style={{ fontWeight: 700, color: '#ccc', fontSize: 13 }}>Cartão de Crédito/Débito</p>
              </div>
              <Toggle on={cardEnabled} color="#FF2DA0" onChange={setCardEnabled} />
            </div>
            {cardEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Máximo de parcelas</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={maxInstallments} onChange={e => setMaxInstallments(Number(e.target.value))} onFocus={focIn} onBlur={focOut}>
                    {[1,2,3,4,5,6,8,10,12].map(n => (
                      <option key={n} value={n} style={{ background: '#111' }}>{n}x</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Parcelas sem juros</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={interestFreeInstallments} onChange={e => setInterestFreeInstallments(Number(e.target.value))} onFocus={focIn} onBlur={focOut}>
                    {Array.from({ length: maxInstallments }, (_, idx) => idx + 1).map(n => (
                      <option key={n} value={n} style={{ background: '#111' }}>{n}x sem juros</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pagbankEnabled ? 14 : 0 }}>
              <div>
                <p style={{ fontWeight: 700, color: '#ccc', fontSize: 13 }}>PagBank / PagSeguro</p>
                <p style={{ fontSize: 11, color: '#777', marginTop: 2 }}>Checkout oficial com PIX, cartão e webhook automático</p>
              </div>
              <Toggle on={pagbankEnabled} color="#2563eb" onChange={setPagbankEnabled} />
            </div>
            {pagbankEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={lbl}>Ambiente</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={pagbankEnvironment} onChange={e => setPagbankEnvironment(e.target.value as 'production' | 'sandbox')} onFocus={focIn} onBlur={focOut}>
                      <option value="production" style={{ background: '#111' }}>Produção</option>
                      <option value="sandbox" style={{ background: '#111' }}>Sandbox</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Nome na cobrança</label>
                    <input style={inp} value={storeDisplayName} onChange={e => setStoreDisplayName(e.target.value)} maxLength={17} placeholder="SUH CONCEPT" onFocus={focIn} onBlur={focOut} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Token PagBank</label>
                  <input type="password" style={inp} value={pagbankToken} onChange={e => setPagbankToken(e.target.value)} placeholder="Bearer token da conta" onFocus={focIn} onBlur={focOut} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}>
                  <Info size={13} style={{ color: '#60a5fa', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 11.5, color: '#60a5fa', lineHeight: 1.6 }}>
                    URL do webhook para cadastrar no PagBank: <strong>https://suhconcept.com/api/payments/pagbank/webhook</strong>. Em pedidos com frete manual, o pagamento online só fica disponível quando o total já estiver fechado.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card title="Notificações por E-mail" icon={Info} color="#8b5cf6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '14px 16px', borderRadius: 10, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontWeight: 700, color: '#ccc', fontSize: 13, marginBottom: 6 }}>Aviso automático quando o pedido sair para entrega</p>
            <p style={{ fontSize: 11.5, color: '#777', lineHeight: 1.6 }}>
              O cliente recebe um e-mail profissional assim que você mudar o pedido para <strong>Saiu para entrega</strong> no painel.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Servidor SMTP</label>
              <input style={inp} value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.seudominio.com" onFocus={focIn} onBlur={focOut} />
            </div>
            <div>
              <label style={lbl}>Porta SMTP</label>
              <input type="number" style={inp} value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} placeholder="587" onFocus={focIn} onBlur={focOut} />
            </div>
            <div>
              <label style={lbl}>Usuário SMTP</label>
              <input style={inp} value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="notificacoes@seudominio.com" onFocus={focIn} onBlur={focOut} />
            </div>
            <div>
              <label style={lbl}>Senha SMTP</label>
              <input type="password" style={inp} value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="Senha do e-mail" onFocus={focIn} onBlur={focOut} />
            </div>
            <div>
              <label style={lbl}>E-mail remetente</label>
              <input style={inp} value={smtpFromEmail} onChange={e => setSmtpFromEmail(e.target.value)} placeholder="pedidos@seudominio.com" onFocus={focIn} onBlur={focOut} />
            </div>
            <div>
              <label style={lbl}>Nome remetente</label>
              <input style={inp} value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} placeholder="SUH CONCEPT" onFocus={focIn} onBlur={focOut} />
            </div>
          </div>

          <Row label="Conexão segura (SSL/TLS)" sub="Ative normalmente para porta 465. Em 587 costuma ficar desligado.">
            <Toggle on={smtpSecure} color="#8b5cf6" onChange={setSmtpSecure} />
          </Row>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <Info size={13} style={{ color: '#c4b5fd', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11.5, color: '#ddd6fe', lineHeight: 1.6 }}>
              Exemplo profissional: remetente <strong>pedidos@seudominio.com</strong> com nome <strong>SUH CONCEPT</strong>. Depois de salvar, o envio acontece automaticamente ao marcar <strong>Saiu para entrega</strong>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
