import { DEFAULT_MATERIALS, DEFAULT_WORKSHOP_PROFILE, SAMPLE_QUOTES } from '../data/defaultData';
import { MaterialInsumo, Quote, UserAccount, WorkshopProfile } from '../types';

const STORAGE_KEYS = {
  CURRENT_USER: 'fleetautopro_current_user',
  ALL_USERS: 'fleetautopro_accounts',
  KEY_VALIDATIONS: 'fleetautopro_valid_keys',
};

// Chaves padrão para validação de licença única vitalícia Fleet Auto Pro
const DEFAULT_LIFETIME_KEYS = [
  'FLEET-2026-PRO',
  'FLEETAUTO-VITALICIO',
  'FLEET-PRO-MASTER',
  'FLEET-VIP-2026',
];

/**
 * Função de higienização profunda para expurgar completamente qualquer ocorrência de
 * 'CENTRO AUTOMOTIVO AUTOGOL' / 'AUTOGOLD' / 'AUTOGOL' legada gravada no navegador do usuário.
 */
function sanitizeText(value: string): string {
  if (!value) return value;
  return value
    .replace(/CENTRO AUTOMOTIVO AUTO[ -_]?GOL[D]?/gi, 'Fleet Auto Pro')
    .replace(/AUTO[ -_]?GOL[D] CENTRO AUTOMOTIVO/gi, 'Fleet Auto Pro')
    .replace(/AUTO[ -_]?GOL[D]/gi, 'Fleet Auto Pro')
    .replace(/autogol[d]?\.com\.br/gi, 'fleetautopro.com.br');
}

/**
 * Migra e expurga dados salvos no localStorage em sessões anteriores
 */
function cleanLegacyStoredData(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const keysToRemove: string[] = [];
    const keysToSet: [string, string][] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const rawVal = localStorage.getItem(key);
      if (!rawVal) continue;

      let targetKey = key;
      let shouldMigrateKey = false;

      if (key.startsWith('autogold_') || key.startsWith('autogol_')) {
        targetKey = key.replace(/^autogol[d]?_/, 'fleetautopro_');
        shouldMigrateKey = true;
        keysToRemove.push(key);
      }

      if (/autogol/i.test(rawVal)) {
        const cleanedVal = sanitizeText(rawVal);
        keysToSet.push([targetKey, cleanedVal]);
      } else if (shouldMigrateKey) {
        keysToSet.push([targetKey, rawVal]);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
    keysToSet.forEach(([k, v]) => localStorage.setItem(k, v));
  } catch (e) {
    console.error('Erro na higienização de dados legados do armazenamento:', e);
  }
}

// Executa limpeza de dados imediatamente no carregamento da aplicação
cleanLegacyStoredData();

export function getCurrentUser(): UserAccount | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.CURRENT_USER) ||
      localStorage.getItem('autogold_current_user');
    if (!raw) return null;

    const parsed: UserAccount = JSON.parse(raw);
    let changed = false;

    if (parsed.email && /autogol/i.test(parsed.email)) {
      parsed.email = 'oficina@fleetautopro.com.br';
      changed = true;
    }
    if (parsed.nome && /autogol/i.test(parsed.nome)) {
      parsed.nome = 'Oficina Fleet Auto Pro';
      changed = true;
    }

    if (changed || localStorage.getItem('autogold_current_user')) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(parsed));
      localStorage.removeItem('autogold_current_user');
    }

    return parsed;
  } catch (e) {
    console.error('Erro ao ler usuário:', e);
    return null;
  }
}

export function saveCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      const sanitizedUser: UserAccount = {
        ...user,
        email: user.email ? sanitizeText(user.email) : user.email,
        nome: user.nome ? sanitizeText(user.nome) : user.nome,
      };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(sanitizedUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    localStorage.removeItem('autogold_current_user');
  } catch (e) {
    console.error('Erro ao salvar usuário:', e);
  }
}

export function validateLifetimeKey(key: string, email: string): { valid: boolean; message: string } {
  const cleanKey = key.trim().toUpperCase();

  if (!cleanKey) {
    return { valid: false, message: 'Digite uma chave de ativação válida.' };
  }

  // Valida chaves padrão FLEET ou com formato corporativo
  const isValidFormat =
    DEFAULT_LIFETIME_KEYS.includes(cleanKey) ||
    cleanKey.startsWith('FLEET-') ||
    cleanKey.startsWith('FLEETAUTO-') ||
    cleanKey.length >= 8;

  if (isValidFormat) {
    return {
      valid: true,
      message: 'Licença Vitalícia validada com sucesso!',
    };
  }

  return {
    valid: false,
    message: 'Chave de ativação inválida. Verifique o código e tente novamente.',
  };
}

export function getUserWorkshopProfile(email: string): WorkshopProfile {
  try {
    const cleanEmail = email ? email.replace(/@autogol[d]?\.com\.br/gi, '@fleetautopro.com.br') : email;
    const newKey = `fleetautopro_profile_${cleanEmail}`;
    const legacyKey = `autogold_profile_${cleanEmail}`;

    const raw = localStorage.getItem(newKey) || localStorage.getItem(legacyKey);
    if (raw) {
      const parsed = JSON.parse(raw);

      // Expurga qualquer resquício de Centro Automotivo AutoGol / AutoGold
      if (!parsed.nomeOficina || /autogol/i.test(parsed.nomeOficina)) {
        parsed.nomeOficina = DEFAULT_WORKSHOP_PROFILE.nomeOficina;
      }
      if (!parsed.razaoSocial || /autogol/i.test(parsed.razaoSocial)) {
        parsed.razaoSocial = DEFAULT_WORKSHOP_PROFILE.razaoSocial;
      }
      if (!parsed.titularPix || /autogol/i.test(parsed.titularPix)) {
        parsed.titularPix = DEFAULT_WORKSHOP_PROFILE.titularPix;
      }

      const mergedProfile: WorkshopProfile = { ...DEFAULT_WORKSHOP_PROFILE, ...parsed };
      localStorage.setItem(newKey, JSON.stringify(mergedProfile));
      localStorage.removeItem(legacyKey);

      return mergedProfile;
    }
  } catch (e) {
    console.error('Erro ao carregar perfil da oficina:', e);
  }
  return { ...DEFAULT_WORKSHOP_PROFILE };
}

export function saveUserWorkshopProfile(email: string, profile: WorkshopProfile): void {
  try {
    const cleanEmail = email ? email.replace(/@autogol[d]?\.com\.br/gi, '@fleetautopro.com.br') : email;
    const newKey = `fleetautopro_profile_${cleanEmail}`;
    const legacyKey = `autogold_profile_${cleanEmail}`;

    const sanitizedProfile: WorkshopProfile = {
      ...profile,
      nomeOficina: sanitizeText(profile.nomeOficina || DEFAULT_WORKSHOP_PROFILE.nomeOficina),
      razaoSocial: sanitizeText(profile.razaoSocial || DEFAULT_WORKSHOP_PROFILE.razaoSocial),
      titularPix: sanitizeText(profile.titularPix || DEFAULT_WORKSHOP_PROFILE.titularPix),
    };

    localStorage.setItem(newKey, JSON.stringify(sanitizedProfile));
    localStorage.removeItem(legacyKey);
  } catch (e) {
    console.error('Erro ao salvar perfil da oficina:', e);
  }
}

export function getUserMaterials(email: string): MaterialInsumo[] {
  try {
    const cleanEmail = email ? email.replace(/@autogol[d]?\.com\.br/gi, '@fleetautopro.com.br') : email;
    const newKey = `fleetautopro_materials_${cleanEmail}`;
    const legacyKey = `autogold_materials_${cleanEmail}`;

    const raw = localStorage.getItem(newKey) || localStorage.getItem(legacyKey);
    if (raw) {
      const parsed: MaterialInsumo[] = JSON.parse(raw);
      localStorage.setItem(newKey, JSON.stringify(parsed));
      localStorage.removeItem(legacyKey);
      return parsed;
    }
  } catch (e) {
    console.error('Erro ao carregar insumos:', e);
  }
  return [...DEFAULT_MATERIALS];
}

export function saveUserMaterials(email: string, materials: MaterialInsumo[]): void {
  try {
    const cleanEmail = email ? email.replace(/@autogol[d]?\.com\.br/gi, '@fleetautopro.com.br') : email;
    const newKey = `fleetautopro_materials_${cleanEmail}`;
    const legacyKey = `autogold_materials_${cleanEmail}`;

    localStorage.setItem(newKey, JSON.stringify(materials));
    localStorage.removeItem(legacyKey);
  } catch (e) {
    console.error('Erro ao salvar insumos:', e);
  }
}

export function getUserQuotes(email: string): Quote[] {
  try {
    const cleanEmail = email ? email.replace(/@autogol[d]?\.com\.br/gi, '@fleetautopro.com.br') : email;
    const newKey = `fleetautopro_quotes_${cleanEmail}`;
    const legacyKey = `autogold_quotes_${cleanEmail}`;

    const raw = localStorage.getItem(newKey) || localStorage.getItem(legacyKey);
    if (raw) {
      const parsed: Quote[] = JSON.parse(raw);
      let modified = false;

      const enriched = parsed.map((q) => {
        if (q.id === 'quote_sample_1' && (!q.fotosAvarias || q.fotosAvarias.length === 0)) {
          const sample = SAMPLE_QUOTES.find((s) => s.id === 'quote_sample_1');
          if (sample?.fotosAvarias) {
            modified = true;
            return { ...q, fotosAvarias: sample.fotosAvarias };
          }
        }
        return q;
      });

      localStorage.setItem(newKey, JSON.stringify(enriched));
      localStorage.removeItem(legacyKey);
      return enriched;
    }

    // Inicializa com dados de amostra para a primeira experiência do usuário
    localStorage.setItem(newKey, JSON.stringify(SAMPLE_QUOTES));
    return [...SAMPLE_QUOTES];
  } catch (e) {
    console.error('Erro ao carregar orçamentos:', e);
  }
  return [...SAMPLE_QUOTES];
}

export function saveUserQuotes(email: string, quotes: Quote[]): void {
  try {
    const cleanEmail = email ? email.replace(/@autogol[d]?\.com\.br/gi, '@fleetautopro.com.br') : email;
    const newKey = `fleetautopro_quotes_${cleanEmail}`;
    const legacyKey = `autogold_quotes_${cleanEmail}`;

    localStorage.setItem(newKey, JSON.stringify(quotes));
    localStorage.removeItem(legacyKey);
  } catch (e) {
    console.error('Erro ao salvar orçamentos:', e);
  }
}
