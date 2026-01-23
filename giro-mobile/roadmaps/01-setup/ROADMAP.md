# 🛠️ Setup - Roadmap do Agente

> **Projeto**: GIRO Mobile  
> **Responsabilidade**: Inicialização do projeto Expo e configuração base

---

## 📋 Tarefas

### Fase 1: Inicialização do Projeto

#### TASK-SETUP-001: Criar Projeto Expo

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 1h
- **Dependências**: Nenhuma
- **Status**: ⬜ Não iniciado

**Descrição**:
Inicializar projeto com Expo SDK 50+ e template TypeScript.

**Critérios de Aceite**:

- [ ] Projeto criado com `npx create-expo-app@latest`
- [ ] Template TypeScript selecionado
- [ ] App rodando no simulador/dispositivo
- [ ] Estrutura de pastas inicial criada

**Comandos**:

```bash
npx create-expo-app@latest giro-mobile-app --template tabs
cd giro-mobile-app
npx expo start
```

---

#### TASK-SETUP-002: Configurar TypeScript

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 30min
- **Dependências**: TASK-SETUP-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Configurar TypeScript com strict mode e path aliases.

**Critérios de Aceite**:

- [ ] `tsconfig.json` com strict habilitado
- [ ] Path aliases configurados (@/, @components/, etc)
- [ ] Sem erros de TypeScript no projeto base

**Arquivo**: `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"],
      "@components/*": ["app/components/*"],
      "@hooks/*": ["app/hooks/*"],
      "@lib/*": ["app/lib/*"],
      "@stores/*": ["app/stores/*"],
      "@types/*": ["app/types/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

---

#### TASK-SETUP-003: Instalar Dependências Core

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 30min
- **Dependências**: TASK-SETUP-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Instalar todas as dependências necessárias para o projeto.

**Critérios de Aceite**:

- [ ] NativeWind instalado e configurado
- [ ] Zustand instalado
- [ ] React Query instalado
- [ ] Expo Camera instalado
- [ ] expo-barcode-scanner instalado

**Comandos**:

```bash
# UI
npx expo install nativewind tailwindcss
npm install class-variance-authority clsx tailwind-merge

# State Management
npm install zustand immer

# Data Fetching (para cache)
npm install @tanstack/react-query

# Camera & Scanner
npx expo install expo-camera expo-barcode-scanner

# Network
npm install react-native-zeroconf
npx expo install expo-network

# Storage
npx expo install expo-secure-store @react-native-async-storage/async-storage

# Haptics & Feedback
npx expo install expo-haptics expo-av
```

---

### Fase 2: Configuração de Estilos

#### TASK-SETUP-004: Configurar NativeWind/TailwindCSS

- **Prioridade**: 🟡 Alta
- **Estimativa**: 1h
- **Dependências**: TASK-SETUP-003
- **Status**: ⬜ Não iniciado

**Descrição**:
Configurar NativeWind com tema customizado seguindo design system do GIRO.

**Critérios de Aceite**:

- [ ] `tailwind.config.js` configurado
- [ ] `babel.config.js` atualizado
- [ ] Cores do tema GIRO configuradas
- [ ] Estilos funcionando em componentes

**Arquivo**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        surface: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

---

#### TASK-SETUP-005: Criar Estrutura de Pastas

- **Prioridade**: 🟡 Alta
- **Estimativa**: 30min
- **Dependências**: TASK-SETUP-002
- **Status**: ⬜ Não iniciado

**Descrição**:
Criar estrutura de pastas seguindo arquitetura definida.

**Critérios de Aceite**:

- [ ] Pastas criadas conforme arquitetura
- [ ] Arquivos index.ts para exports
- [ ] README em cada pasta principal

**Estrutura**:

```
app/
├── (tabs)/                 # Navegação por tabs
│   ├── index.tsx           # Home (Scanner)
│   ├── estoque.tsx         # Consulta de estoque
│   ├── inventario.tsx      # Inventário
│   ├── validade.tsx        # Controle de validade
│   └── _layout.tsx         # Layout das tabs
├── components/
│   ├── ui/                 # Componentes base
│   ├── scanner/            # Componentes de scanner
│   ├── products/           # Componentes de produtos
│   └── shared/             # Compartilhados
├── hooks/
│   ├── useWebSocket.ts
│   ├── useDiscovery.ts
│   ├── useScanner.ts
│   └── useConnection.ts
├── lib/
│   ├── websocket.ts
│   ├── discovery.ts
│   ├── utils.ts
│   └── constants.ts
├── stores/
│   ├── connectionStore.ts
│   ├── productsStore.ts
│   └── settingsStore.ts
└── types/
    ├── product.ts
    ├── message.ts
    └── connection.ts
```

---

### Fase 3: Configuração de Ambiente

#### TASK-SETUP-006: Configurar Variáveis de Ambiente

- **Prioridade**: 🟢 Média
- **Estimativa**: 30min
- **Dependências**: TASK-SETUP-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Configurar variáveis de ambiente para diferentes builds.

**Critérios de Aceite**:

- [ ] `.env.example` criado
- [ ] `app.config.ts` usando variáveis
- [ ] Diferentes configs para dev/prod

**Arquivo**: `.env.example`

```env
# Configurações de Conexão
EXPO_PUBLIC_WS_PORT=3847
EXPO_PUBLIC_MDNS_SERVICE_TYPE=_giro._tcp

# Build
EXPO_PUBLIC_APP_VARIANT=development

# Debug
EXPO_PUBLIC_LOG_LEVEL=debug
```

**Arquivo**: `app.config.ts`

```typescript
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.EXPO_PUBLIC_APP_VARIANT === 'production' ? 'GIRO Mobile' : 'GIRO Mobile (Dev)',
  slug: 'giro-mobile',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.giro.mobile',
    infoPlist: {
      NSCameraUsageDescription: 'Usado para escanear códigos de barras',
      NSLocalNetworkUsageDescription: 'Usado para conectar ao GIRO Desktop',
      NSBonjourServices: ['_giro._tcp'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.giro.mobile',
    permissions: ['CAMERA', 'ACCESS_NETWORK_STATE', 'ACCESS_WIFI_STATE'],
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission:
          'Permitir $(PRODUCT_NAME) acessar a câmera para escanear códigos de barras',
      },
    ],
  ],
});
```

---

## 📊 Resumo

| Fase          | Tarefas | Estimativa |
| ------------- | ------- | ---------- |
| Inicialização | 3       | 2h         |
| Estilos       | 2       | 1.5h       |
| Ambiente      | 1       | 0.5h       |
| **Total**     | **6**   | **4h**     |

---

## ✅ Checklist Final

- [ ] Projeto Expo criado e rodando
- [ ] TypeScript configurado com strict mode
- [ ] Todas as dependências instaladas
- [ ] NativeWind funcionando
- [ ] Estrutura de pastas criada
- [ ] Variáveis de ambiente configuradas

---

## 🔗 Próximo Agente

Após conclusão, acionar: **Connection** (02-connection)

---

_Última atualização: Janeiro 2026_
