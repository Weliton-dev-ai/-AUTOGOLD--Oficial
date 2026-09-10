import { DEFAULT_MATERIALS, DEFAULT_WORKSHOP_PROFILE, SAMPLE_QUOTES } from '../data/defaultData';
import { MaterialInsumo, Quote, UserAccount, WorkshopProfile } from '../types';

const STORAGE_KEYS = {
  CURRENT_USER: 'autogold_current_user',
  ALL_USERS: 'autogold_accounts',
  KEY_VALIDATIONS: 'autogold_valid_keys',
};

// Chaves padrão para validação de licença única vitalícia
const DEFAULT_LIFETIME_KEYS = [
  'GOLD-2026-PRO',
  'AUTOGOLD-VITALICIO',
  'OFICINA-GOLD-PRO',
  'FUNILARIA-VIP-2026',
  'GOLD-MASTER-99',
];

export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler usuário:', e);
    return null;
  }
}

export function saveCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  } catch (e) {
    console.error('Erro ao salvar usuário:', e);
  }
}

export function validateLifetimeKey(key: string, email: string): { valid: boolean; message: string } {
  const cleanKey = key.trim().toUpperCase();
  
  if (!cleanKey) {
    return { valid: false, message: 'Digite uma chave de ativação válida.' };
  }

  // Verifica chaves pré-configuradas ou padrão GOLD-XXXX
  const isValidFormat =
    DEFAULT_LIFETIME_KEYS.includes(cleanKey) ||
    cleanKey.startsWith('GOLD-') ||
    cleanKey.startsWith('AUTOGOLD-') ||
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
    const key = `autogold_profile_${email}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return { ...DEFAULT_WORKSHOP_PROFILE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Erro ao carregar perfil da oficina:', e);
  }
  return { ...DEFAULT_WORKSHOP_PROFILE };
}

export function saveUserWorkshopProfile(email: string, profile: WorkshopProfile): void {
  try {
    const key = `autogold_profile_${email}`;
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (e) {
    console.error('Erro ao salvar perfil da oficina:', e);
  }
}

export function getUserMaterials(email: string): MaterialInsumo[] {
  try {
    const key = `autogold_materials_${email}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao carregar insumos:', e);
  }
  return [...DEFAULT_MATERIALS];
}

export function saveUserMaterials(email: string, materials: MaterialInsumo[]): void {
  try {
    const key = `autogold_materials_${email}`;
    localStorage.setItem(key, JSON.stringify(materials));
  } catch (e) {
    console.error('Erro ao salvar insumos:', e);
  }
}

export function getUserQuotes(email: string): Quote[] {
  try {
    const key = `autogold_quotes_${email}`;
    const raw = localStorage.getItem(key);
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
      if (modified) {
        localStorage.setItem(key, JSON.stringify(enriched));
      }
      return enriched;
    }
    // Inicializa com dados de amostra para a primeira experiência do usuário
    localStorage.setItem(key, JSON.stringify(SAMPLE_QUOTES));
    return [...SAMPLE_QUOTES];
  } catch (e) {
    console.error('Erro ao carregar orçamentos:', e);
  }
  return [...SAMPLE_QUOTES];
}

export function saveUserQuotes(email: string, quotes: Quote[]): void {
  try {
    const key = `autogold_quotes_${email}`;
    localStorage.setItem(key, JSON.stringify(quotes));
  } catch (e) {
    console.error('Erro ao salvar orçamentos:', e);
  }
}
