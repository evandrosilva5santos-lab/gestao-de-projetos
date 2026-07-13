# 🎨 START-SYSTEM DESIGN GUIDELINES

Este projeto utiliza **Tailwind CSS v4** em conjunto com as primitivas do **Radix UI** (através do padrão shadcn/ui) para garantir um design de nível premium, rápido, responsivo e completamente acessível.

## 1. SISTEMA DE CORES E TOKENS (CSS VARIABLES)
Não utilize cores mágicas no código (ex: `text-[#FF0000]`).
Utilize o sistema de variáveis globais configurado no `globals.css` utilizando o espaço de cores **OKLCH** para garantir contraste perfeito:

```css
/* Exemplo de paleta no globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --radius: 0.5rem;
}
```

## 2. COMPONENTES UI (SHADCN / RADIX)
Os componentes visuais base ficam na pasta `/components/ui/`.
- Eles são seus. O código pertence ao projeto.
- Não importe bibliotecas pesadas de UI (como Material UI ou Ant Design). O padrão é instalar as primitivas Radix e estilizá-las com Tailwind.

## 3. AESTHETICS E UX PREMIUM (O "EFEITO UAU")
Aplicativos criados com a arquitetura Start-System devem parecer de última geração:
- **Glassmorphism:** Use `backdrop-blur-md bg-background/80` para headers e navbars para criar profundidade.
- **Micro-animações:** Botões e cards devem responder ao hover. Use `transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`.
- **Dark Mode:** Todos os aplicativos devem ter suporte a Dark Mode nativo usando `next-themes` e classes `dark:` do Tailwind.
- **Tipografia Moderna:** Utilize fontes como Inter, Roboto ou Outfit carregadas nativamente pelo `next/font`.

## 4. RESPONSIVIDADE E MOBILE-FIRST
O Tailwind usa a abordagem mobile-first.
Escreva a classe padrão para telas pequenas e utilize os prefixos `md:`, `lg:`, e `xl:` para adaptar o layout em telas maiores.
Nunca desenhe uma interface que quebra em um iPhone. A barra lateral (Sidebar) deve se transformar em um Sheet/Drawer no mobile.
