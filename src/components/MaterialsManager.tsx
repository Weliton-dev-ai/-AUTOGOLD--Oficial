import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  DollarSign, 
  Paintbrush, 
  FlaskConical 
} from 'lucide-react';
import { MaterialInsumo } from '../types';
import { DEFAULT_MATERIALS } from '../data/defaultData';
import { formatCurrencyBRL } from '../utils/calculator';

interface MaterialsManagerProps {
  materials: MaterialInsumo[];
  onSaveMaterials: (materials: MaterialInsumo[]) => void;
}

export const MaterialsManager: React.FC<MaterialsManagerProps> = ({
  materials: initialMaterials,
  onSaveMaterials,
}) => {
  const [materials, setMaterials] = useState<MaterialInsumo[]>(initialMaterials);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [editingMatId, setEditingMatId] = useState<string | null>(null);

  // New material modal/form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newCategoria, setNewCategoria] = useState<MaterialInsumo['categoria']>('preparacao');
  const [newEmbalagem, setNewEmbalagem] = useState('Lata 900ml');
  const [newUnidade, setNewUnidade] = useState<'ml' | 'g' | 'un' | 'm'>('ml');
  const [newQtdEmbalagem, setNewQtdEmbalagem] = useState(900);
  const [newPrecoEmbalagem, setNewPrecoEmbalagem] = useState(120);

  const handlePriceChange = (id: string, newPrice: number) => {
    setMaterials(
      materials.map((mat) => {
        if (mat.id === id) {
          return { ...mat, precoEmbalagem: newPrice };
        }
        return mat;
      })
    );
  };

  const handleConsumptionChange = (
    id: string,
    avaria: keyof MaterialInsumo['consumoPadraoPorPeca'],
    value: number
  ) => {
    setMaterials(
      materials.map((mat) => {
        if (mat.id === id) {
          return {
            ...mat,
            consumoPadraoPorPeca: {
              ...mat.consumoPadraoPorPeca,
              [avaria]: value,
            },
          };
        }
        return mat;
      })
    );
  };

  const handleSaveAll = () => {
    onSaveMaterials(materials);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar os preços e consumos de fábrica dos insumos?')) {
      setMaterials([...DEFAULT_MATERIALS]);
      onSaveMaterials([...DEFAULT_MATERIALS]);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleAddNewMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim()) return;

    const newMat: MaterialInsumo = {
      id: `mat_custom_${Date.now()}`,
      nome: newNome.trim(),
      categoria: newCategoria,
      embalagemComercial: newEmbalagem.trim(),
      unidadeBase: newUnidade,
      quantidadeEmbalagem: Number(newQtdEmbalagem) || 1,
      precoEmbalagem: Number(newPrecoEmbalagem) || 0,
      consumoPadraoPorPeca: {
        pequena: Math.round(newQtdEmbalagem * 0.05),
        media: Math.round(newQtdEmbalagem * 0.1),
        grande: Math.round(newQtdEmbalagem * 0.2),
        troca: Math.round(newQtdEmbalagem * 0.2),
        apenas_pintura: Math.round(newQtdEmbalagem * 0.15),
        apenas_funilaria: 0,
      },
    };

    const updated = [...materials, newMat];
    setMaterials(updated);
    onSaveMaterials(updated);
    setShowAddForm(false);
    setNewNome('');
  };

  return (
    <div id="materials-manager-container" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Educational Banner regarding Fractional Material Calculation */}
      <div className="bg-gradient-to-r from-[#0F1B27] via-[#16293D] to-[#0F1B27] border border-blue-500/30 rounded-2xl p-5 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider">
          <FlaskConical className="w-5 h-5 text-blue-400" />
          <span>Lógica de Cálculo Fracionado de Materiais (AutoGold)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          Diferenciação precisa entre o <strong>preço cheio da embalagem comercial</strong> (ex: Lata de Verniz 900ml por R$ 135) 
          e o <strong>consumo real por peça reparada</strong> (ex: 150ml = R$ 22,50). Isso garante que o orçamento 
          reflita o custo exato do insumo gasto, protegendo o lucro da oficina e mantendo o preço justo para o cliente.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 flex items-center gap-2.5 text-emerald-200 text-sm font-medium animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-400" />
          <span>Tabela de insumos e consumos atualizada com sucesso!</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121E2B] border border-[#1E3349] p-4 rounded-2xl">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Insumos Cadastrados ({materials.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3.5 py-2 bg-[#0066FF] hover:bg-[#1A73E8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Insumo</span>
          </button>

          <button
            onClick={handleSaveAll}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-700/30 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Alterações</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-[#0A0A0C] hover:bg-[#162536] text-slate-400 hover:text-white border border-[#223952] font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            title="Restaurar valores de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar Padrões</span>
          </button>
        </div>
      </div>

      {/* Add New Material Inline Modal */}
      {showAddForm && (
        <form
          onSubmit={handleAddNewMaterial}
          className="bg-[#121E2B] border border-blue-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-[#1E3349] pb-3">
            <span className="text-sm font-bold text-blue-400">Cadastrar Novo Insumo de Oficina</span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nome do Insumo *</label>
              <input
                type="text"
                required
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                placeholder="ex: Cola Plástica Especial 3M"
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
              <select
                value={newCategoria}
                onChange={(e) => setNewCategoria(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100"
              >
                <option value="preparacao">Preparação (Primer/Massa/Lixa)</option>
                <option value="pintura">Pintura (Tinta/Verniz)</option>
                <option value="acabamento">Acabamento & Polimento</option>
                <option value="complementar">Complementar (Mascaramento/Diluente)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Descrição da Embalagem</label>
              <input
                type="text"
                value={newEmbalagem}
                onChange={(e) => setNewEmbalagem(e.target.value)}
                placeholder="Lata 900ml, Bisnaga 200g"
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Unidade Base</label>
              <select
                value={newUnidade}
                onChange={(e) => setNewUnidade(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100"
              >
                <option value="ml">Mililitros (ml)</option>
                <option value="g">Gramas (g)</option>
                <option value="un">Unidades (un)</option>
                <option value="m">Metros (m)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Volume/Qtd da Embalagem</label>
              <input
                type="number"
                min="1"
                value={newQtdEmbalagem}
                onChange={(e) => setNewQtdEmbalagem(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Preço Cheio da Embalagem (R$)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={newPrecoEmbalagem}
                onChange={(e) => setNewPrecoEmbalagem(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
          >
            Adicionar Insumo à Tabela
          </button>
        </form>
      )}

      {/* Materials Table Card */}
      <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-[#0A0A0C] text-slate-400 uppercase tracking-wider border-b border-[#1E3349] text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Material / Insumo</th>
                <th className="py-3.5 px-3">Embalagem</th>
                <th className="py-3.5 px-3">Preço Embalagem</th>
                <th className="py-3.5 px-3">Custo Fracionado (Unitário)</th>
                <th className="py-3.5 px-3 text-center">Consumo Médio (Peça Peq / Média / Gde)</th>
                <th className="py-3.5 px-4 text-right">Exemplo Custo Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162536]">
              {materials.map((mat) => {
                const custoUnitario = mat.precoEmbalagem / (mat.quantidadeEmbalagem || 1);
                const custoConsumoMedio = (mat.consumoPadraoPorPeca.media || 0) * custoUnitario;

                return (
                  <tr key={mat.id} className="hover:bg-[#16293D]/50 transition-colors">
                    {/* Material Name & Category */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-100 block">{mat.nome}</span>
                      <span className="text-[10px] text-blue-400 capitalize">{mat.categoria}</span>
                    </td>

                    {/* Commercial Packaging */}
                    <td className="py-3.5 px-3 font-mono text-slate-300">
                      {mat.embalagemComercial} ({mat.quantidadeEmbalagem} {mat.unidadeBase})
                    </td>

                    {/* Retail Package Price (Editable) */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-slate-500 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={mat.precoEmbalagem}
                          onChange={(e) => handlePriceChange(mat.id, Number(e.target.value))}
                          className="w-full px-2 py-1 bg-[#0A0A0C] border border-[#223952] rounded-lg text-slate-100 font-bold focus:outline-none focus:border-[#0066FF]"
                        />
                      </div>
                    </td>

                    {/* Calculated Fractional Cost */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-emerald-400 block">
                        {formatCurrencyBRL(custoUnitario)} / {mat.unidadeBase}
                      </span>
                      <span className="text-[10px] text-slate-500">fracionado exato</span>
                    </td>

                    {/* Consumption per severity level */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center justify-center gap-1.5 text-[11px]">
                        <div className="text-center">
                          <span className="text-[9px] text-slate-500 block uppercase">Peq</span>
                          <input
                            type="number"
                            min="0"
                            value={mat.consumoPadraoPorPeca.pequena}
                            onChange={(e) => handleConsumptionChange(mat.id, 'pequena', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 bg-[#0A0A0C] border border-[#223952] rounded text-center text-slate-200"
                          />
                        </div>
                        <span className="text-slate-600">/</span>
                        <div className="text-center">
                          <span className="text-[9px] text-slate-500 block uppercase">Méd</span>
                          <input
                            type="number"
                            min="0"
                            value={mat.consumoPadraoPorPeca.media}
                            onChange={(e) => handleConsumptionChange(mat.id, 'media', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 bg-[#0A0A0C] border border-[#223952] rounded text-center text-slate-200 font-bold"
                          />
                        </div>
                        <span className="text-slate-600">/</span>
                        <div className="text-center">
                          <span className="text-[9px] text-slate-500 block uppercase">Gde</span>
                          <input
                            type="number"
                            min="0"
                            value={mat.consumoPadraoPorPeca.grande}
                            onChange={(e) => handleConsumptionChange(mat.id, 'grande', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 bg-[#0A0A0C] border border-[#223952] rounded text-center text-slate-200"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{mat.unidadeBase}</span>
                      </div>
                    </td>

                    {/* Average sample cost */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-slate-100 block">
                        {formatCurrencyBRL(custoConsumoMedio)}
                      </span>
                      <span className="text-[10px] text-slate-500">por peça média</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
