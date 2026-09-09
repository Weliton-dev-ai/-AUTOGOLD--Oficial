import React, { useState } from 'react';
import { 
  Building2, 
  Upload, 
  Save, 
  CreditCard, 
  Percent, 
  Clock, 
  ShieldCheck, 
  Check, 
  Image as ImageIcon,
  Key,
  Wrench,
  DollarSign
} from 'lucide-react';
import { UserAccount, WorkshopProfile } from '../types';

interface WorkshopSettingsProps {
  workshop: WorkshopProfile;
  currentUser: UserAccount;
  onSaveProfile: (profile: WorkshopProfile) => void;
}

export const WorkshopSettings: React.FC<WorkshopSettingsProps> = ({
  workshop: initialProfile,
  currentUser,
  onSaveProfile,
}) => {
  const [profile, setProfile] = useState<WorkshopProfile>(initialProfile);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(initialProfile.logotipoUrl || '');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setProfile({ ...profile, logotipoUrl: result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(profile);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div id="workshop-settings-container" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner with White-label Info & Lifetime License badge */}
      <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0066FF] to-[#003882] flex items-center justify-center text-white shadow-lg border border-blue-400/40">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Painel de Personalização da Oficina (White-Label)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalize o logotipo, chave Pix, taxas de mão de obra e cabeçalho dos seus orçamentos.
            </p>
          </div>
        </div>

        {/* License Badge */}
        <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Licença Vitalícia Ativa ({currentUser.chaveAtivacao || 'PRO'})</span>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 flex items-center gap-2.5 text-emerald-200 text-sm font-medium animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-400" />
          <span>Configurações da oficina salvas com sucesso! Todos os novos orçamentos já utilizarão os dados atualizados.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Visual Identity & Logo */}
        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider border-b border-[#1E3349] pb-3">
            <ImageIcon className="w-4 h-4" />
            <span>1. Logotipo e Identidade da Oficina</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* Logo Preview Box */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 bg-[#0A0A0C] border-2 border-dashed border-[#1E3349] rounded-2xl text-center">
              {logoPreview ? (
                <div className="relative group">
                  <img
                    src={logoPreview}
                    alt="Logo da Oficina"
                    className="max-h-24 max-w-full object-contain rounded-lg shadow"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview('');
                      setProfile({ ...profile, logotipoUrl: '' });
                    }}
                    className="mt-2 text-[11px] text-red-400 hover:underline block"
                  >
                    Remover logo
                  </button>
                </div>
              ) : (
                <div className="space-y-2 py-3 text-slate-500">
                  <Building2 className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">Sem logotipo</p>
                  <p className="text-[10px] text-slate-500">PNG, JPG ou SVG recomendado</p>
                </div>
              )}
            </div>

            {/* Logo File Selector */}
            <div className="sm:col-span-8 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fazer Upload da Imagem do Logotipo
                </label>
                <input
                  id="input-logo-file"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0066FF] file:text-white hover:file:bg-[#1A73E8] cursor-pointer bg-[#0A0A0C] p-2 rounded-xl border border-[#223952]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ou informe uma URL direta da imagem
                </label>
                <input
                  id="input-logo-url"
                  type="url"
                  value={profile.logotipoUrl}
                  onChange={(e) => {
                    setProfile({ ...profile, logotipoUrl: e.target.value });
                    setLogoPreview(e.target.value);
                  }}
                  placeholder="https://suaoficina.com.br/logo.png"
                  className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Header Information */}
        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider border-b border-[#1E3349] pb-3">
            <Building2 className="w-4 h-4" />
            <span>2. Dados do Estabelecimento (Cabeçalho do Orçamento)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Nome Comercial da Oficina *
              </label>
              <input
                id="input-config-nome-oficina"
                type="text"
                required
                value={profile.nomeOficina}
                onChange={(e) => setProfile({ ...profile, nomeOficina: e.target.value })}
                placeholder="ex: AutoGold Centro Automotivo"
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 font-semibold focus:outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Telefone WhatsApp (Para Envio e Contato) *
              </label>
              <input
                id="input-config-whatsapp"
                type="text"
                required
                value={profile.telefoneWhatsApp}
                onChange={(e) => setProfile({ ...profile, telefoneWhatsApp: e.target.value })}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 focus:outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Razão Social / CNPJ (Opcional)
              </label>
              <input
                type="text"
                value={profile.cnpj || ''}
                onChange={(e) => setProfile({ ...profile, cnpj: e.target.value })}
                placeholder="34.567.890/0001-12"
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 focus:outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Telefone Fixo da Oficina (Opcional)
              </label>
              <input
                type="text"
                value={profile.telefoneFixo || ''}
                onChange={(e) => setProfile({ ...profile, telefoneFixo: e.target.value })}
                placeholder="(11) 3456-7890"
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 focus:outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                value={profile.endereco}
                onChange={(e) => setProfile({ ...profile, endereco: e.target.value })}
                placeholder="Av. dos Bandeirantes, 1420"
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 focus:outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Cidade e Estado (UF)
              </label>
              <input
                type="text"
                value={profile.cidadeUf}
                onChange={(e) => setProfile({ ...profile, cidadeUf: e.target.value })}
                placeholder="São Paulo - SP"
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 focus:outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Pix Data for 50% Signal Payment */}
        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider border-b border-[#1E3349] pb-3">
            <CreditCard className="w-4 h-4" />
            <span>3. Chave Pix para Recebimento do Sinal de 50%</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Tipo da Chave Pix *
              </label>
              <select
                id="select-tipo-chave-pix"
                value={profile.tipoChavePix}
                onChange={(e) => setProfile({ ...profile, tipoChavePix: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 focus:outline-none focus:border-[#0066FF] cursor-pointer"
              >
                <option value="cnpj">CNPJ</option>
                <option value="cpf">CPF</option>
                <option value="telefone">Celular / WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="aleatoria">Chave Aleatória (EVP)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Chave Pix *
              </label>
              <input
                id="input-config-chave-pix"
                type="text"
                required
                value={profile.chavePix}
                onChange={(e) => setProfile({ ...profile, chavePix: e.target.value })}
                placeholder="34.567.890/0001-12 ou chave"
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-blue-500/40 rounded-xl text-yellow-400 font-mono font-bold focus:outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Nome do Titular da Conta Pix *
              </label>
              <input
                id="input-config-titular-pix"
                type="text"
                required
                value={profile.titularPix}
                onChange={(e) => setProfile({ ...profile, titularPix: e.target.value })}
                placeholder="AutoGold Oficina Especializada"
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 focus:outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Rates, Margin & Terms */}
        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider border-b border-[#1E3349] pb-3">
            <Percent className="w-4 h-4" />
            <span>4. Margem de Lucro e Custos de Mão de Obra</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Margem de Lucro Padrão (%)
              </label>
              <div className="relative">
                <input
                  id="input-config-margem-lucro"
                  type="number"
                  min="0"
                  max="100"
                  value={profile.margemLucroPadrao}
                  onChange={(e) => setProfile({ ...profile, margemLucroPadrao: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 font-bold focus:outline-none focus:border-[#0066FF]"
                />
                <span className="absolute right-3.5 top-2.5 font-bold text-slate-500">%</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Valor Hora Funilaria (R$/h)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-500">R$</span>
                <input
                  id="input-config-hora-funilaria"
                  type="number"
                  min="0"
                  value={profile.valorHoraFunilaria}
                  onChange={(e) => setProfile({ ...profile, valorHoraFunilaria: Number(e.target.value) })}
                  className="w-full pl-10 pr-3 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 font-bold focus:outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Valor Hora Pintura (R$/h)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-500">R$</span>
                <input
                  id="input-config-hora-pintura"
                  type="number"
                  min="0"
                  value={profile.valorHoraPintura}
                  onChange={(e) => setProfile({ ...profile, valorHoraPintura: Number(e.target.value) })}
                  className="w-full pl-10 pr-3 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 font-bold focus:outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Texto Padrão de Garantia no Orçamento
            </label>
            <textarea
              id="textarea-config-garantia"
              rows={2}
              value={profile.textoGarantia}
              onChange={(e) => setProfile({ ...profile, textoGarantia: e.target.value })}
              className="w-full px-3.5 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-200 text-xs focus:outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          id="btn-salvar-config-oficina"
          type="submit"
          className="w-full py-4 px-6 bg-gradient-to-r from-[#0066FF] to-[#004DB3] hover:from-[#1A73E8] hover:to-[#0066FF] text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-[0.99]"
        >
          <Save className="w-5 h-5" />
          <span>Salvar Todas as Configurações da Oficina</span>
        </button>
      </form>
    </div>
  );
};
