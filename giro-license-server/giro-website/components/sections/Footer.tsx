import { Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e descrição */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-4">GIRO</h3>
            <p className="text-sm text-slate-400 mb-4 max-w-md">
              Sistema completo de PDV para mercearias, padarias e pequenos
              comércios. Funciona 100% offline com sincronização mobile.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Desenvolvido por</span>
              <span className="font-semibold text-emerald-400">
                Arkheion Corp
              </span>
            </div>
          </div>

          {/* Links rápidos */}
          <div>
            <h4 className="font-semibold text-white mb-4">Links Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#recursos"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Recursos
                </a>
              </li>
              <li>
                <a
                  href="#precos"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Preços
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="hover:text-emerald-400 transition-colors"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#mobile"
                  className="hover:text-emerald-400 transition-colors"
                >
                  App Mobile
                </a>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <a
                  href="mailto:contato@arkheion-tiktrend.com.br"
                  className="hover:text-emerald-400 transition-colors"
                >
                  contato@arkheion-tiktrend.com.br
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <a
                  href="tel:+5511999999999"
                  className="hover:text-emerald-400 transition-colors"
                >
                  (11) 99999-9999
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>São Paulo, SP - Brasil</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha divisória */}
        <div className="border-t border-slate-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>
              © {currentYear} GIRO by Arkheion Corp. Todos os direitos
              reservados.
            </p>
            <div className="flex gap-6">
              <a
                href="/termos"
                className="hover:text-emerald-400 transition-colors"
              >
                Termos de Uso
              </a>
              <a
                href="/privacidade"
                className="hover:text-emerald-400 transition-colors"
              >
                Privacidade
              </a>
              <a
                href="/licenca"
                className="hover:text-emerald-400 transition-colors"
              >
                Licença
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
