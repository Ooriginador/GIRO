'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Copy, Download, ExternalLink, Monitor, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const downloads = [
  {
    platform: 'Windows',
    icon: Monitor,
    versions: [
      {
        name: 'Windows Installer (.msi)',
        description: 'Recomendado - Instalador padrão Windows',
        url: 'https://github.com/arkheion/giro-desktop/releases/latest/download/GIRO-Setup.msi',
        size: '~80 MB',
        recommended: true,
      },
      {
        name: 'Windows Portable (.exe)',
        description: 'Executável standalone, sem instalação',
        url: 'https://github.com/arkheion/giro-desktop/releases/latest/download/GIRO-Portable.exe',
        size: '~75 MB',
        recommended: false,
      },
    ],
  },
  {
    platform: 'Linux',
    icon: Terminal,
    versions: [
      {
        name: 'Debian/Ubuntu (.deb)',
        description: 'Para Ubuntu, Debian, Linux Mint',
        url: 'https://github.com/arkheion/giro-desktop/releases/latest/download/giro_amd64.deb',
        size: '~70 MB',
        recommended: true,
      },
      {
        name: 'AppImage',
        description: 'Universal - funciona em qualquer distro',
        url: 'https://github.com/arkheion/giro-desktop/releases/latest/download/GIRO.AppImage',
        size: '~85 MB',
        recommended: false,
      },
      {
        name: 'Fedora/RHEL (.rpm)',
        description: 'Para Fedora, CentOS, RHEL',
        url: 'https://github.com/arkheion/giro-desktop/releases/latest/download/giro.x86_64.rpm',
        size: '~70 MB',
        recommended: false,
      },
    ],
  },
];

const requirements = {
  windows: [
    'Windows 10 ou superior (64-bit)',
    '4 GB de RAM (8 GB recomendado)',
    '500 MB de espaço em disco',
    'Conexão com internet (para ativação)',
  ],
  linux: [
    'Ubuntu 20.04+ ou equivalente',
    'WebKitGTK 4.1',
    '4 GB de RAM (8 GB recomendado)',
    '500 MB de espaço em disco',
  ],
};

export default function DownloadPage() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            GIRO
          </Link>
          <div className="flex gap-4">
            <Link href="/pricing">
              <Button variant="ghost">Preços</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button>Criar Conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Download do GIRO Desktop</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Baixe a versão mais recente para seu sistema operacional.
          </p>
          <Badge variant="outline" className="text-sm">
            Versão atual: 1.0.0 • Lançado em 11/01/2026
          </Badge>
        </div>
      </section>

      {/* Download Cards */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {downloads.map((platform) => (
              <Card key={platform.platform} className="relative">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <platform.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{platform.platform}</CardTitle>
                      <CardDescription>
                        {platform.platform === 'Windows' ? 'Windows 10+' : 'Ubuntu 20.04+'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {platform.versions.map((version, idx) => (
                    <div
                      key={idx}
                      className={`p-4 border rounded-lg ${
                        version.recommended ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {version.name}
                            {version.recommended && (
                              <Badge variant="secondary" className="text-xs">
                                Recomendado
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{version.description}</div>
                        </div>
                        <span className="text-sm text-muted-foreground">{version.size}</span>
                      </div>
                      <Button
                        className="w-full mt-3"
                        variant={version.recommended ? 'default' : 'outline'}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Installation Guide */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Guia de Instalação Rápida</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Windows */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Windows
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <p>Baixe o instalador .msi</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <p>Execute o instalador e siga as instruções</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <p>Abra o GIRO e insira sua chave de licença</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <p className="text-green-700 font-medium">Pronto! Sistema ativado.</p>
                </div>
              </CardContent>
            </Card>

            {/* Linux */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Linux
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <p>Baixe o .deb ou AppImage</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="mb-2">Instale via terminal:</p>
                    <div className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-sm flex justify-between items-center">
                      <code>sudo dpkg -i giro_amd64.deb</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white h-6 w-6 p-0"
                        onClick={() => copyToClipboard('sudo dpkg -i giro_amd64.deb')}
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <p>Execute e ative com sua licença</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Requisitos do Sistema</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Windows
              </h3>
              <ul className="space-y-2">
                {requirements.windows.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Linux
              </h3>
              <ul className="space-y-2">
                {requirements.linux.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Support CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Precisa de ajuda?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Nossa equipe de suporte está pronta para ajudar na instalação.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="secondary">
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentação
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-white border-white hover:bg-white/10"
            >
              Contato via WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 GIRO - Sistema PDV. Todos os direitos reservados.</p>
          <p className="mt-2">
            Desenvolvido por <strong>Arkheion Corp</strong>
          </p>
        </div>
      </footer>
    </div>
  );
}
