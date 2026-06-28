import { perfumariaCatalog } from './perfumariaCatalog';

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  pixPrice: number;
  installments: { count: number; value: number };
  image: string;
  images: string[];
  category: string;
  categorySlug: string;
  collection?: string;
  tags: string[];
  description: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  stock: number;
  rating: number;
  reviews: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  discount?: number;
  sku: string;
}

function pix(price: number) {
  return +(price * 0.9).toFixed(2);
}

function inst(price: number, count = 6) {
  return +(price / count).toFixed(2);
}

const copaImgs = {
  femininaRetro: '/midias/copa-2026/camisa-feminina-retro-2022-tailandesa-179-99.jpeg',
  jogador2026_1: '/midias/copa-2026/camisa-jogador-tailandesa-2026-1.jpeg',
  jogador2026_2: '/midias/copa-2026/camisa-jogador-tailandesa-2026-2.jpeg',
  jogador2026_3: '/midias/copa-2026/camisa-jogador-tailandesa-2026-3.jpeg',
  jogador2026_4: '/midias/copa-2026/camisa-jogador-tailandesa-2026-4.jpeg',
  masculinaRetro: '/midias/copa-2026/camisa-retro-2022-torcedor-masculina-99-99.jpeg',
  plusAzul: '/midias/copa-2026/camisa-brasil-plus-size-azul-189-99.jpeg',
  plusPreta: '/midias/copa-2026/camisa-brasil-plus-size-preta-189-99.jpeg',
  plusAmarela: '/midias/copa-2026/camisa-brasil-plus-size-amarela-189-99.jpeg',
  infantilAmarelo: '/midias/copa-2026/conjunto-infantil-amarelo-299-99.jpeg',
};

const copaProducts: Product[] = [
  {
    id: 'copa-001',
    slug: 'camisa-feminina-retro-2022-tailandesa',
    name: 'Camisa Feminina Retrô 2022 Tailandesa',
    price: 179.99,
    pixPrice: pix(179.99),
    installments: { count: 6, value: inst(179.99) },
    image: copaImgs.femininaRetro,
    images: [copaImgs.femininaRetro],
    category: 'Feminino',
    categorySlug: 'feminino',
    collection: 'Copa 2026',
    tags: ['copa', 'brasil', 'feminino', 'retro', 'tailandesa'],
    description: 'Camisa feminina retrô da seleção 2022 em versão tailandesa. Modelagem ajustada, visual clássico e presença forte para quem quer vestir Brasil com estilo.',
    sizes: ['P', 'M', 'G', 'GG'],
    colors: [],
    stock: 12,
    rating: 4.9,
    reviews: 28,
    isNew: true,
    isBestSeller: true,
    sku: 'CBR-FEM-2022',
  },
  {
    id: 'copa-002',
    slug: 'camisa-jogador-tailandesa-2026',
    name: 'Camisa Jogador Tailandesa 1.1 2026',
    price: 334.99,
    pixPrice: 249.99,
    installments: { count: 6, value: inst(334.99) },
    image: copaImgs.jogador2026_1,
    images: [copaImgs.jogador2026_1, copaImgs.jogador2026_2, copaImgs.jogador2026_3, copaImgs.jogador2026_4],
    category: 'Masculino',
    categorySlug: 'masculino',
    collection: 'Copa 2026',
    tags: ['copa', 'brasil', 'masculino', 'tailandesa', 'jogador', '2026', 'offer-pix:249.99', 'offer-combo:2:449.99', 'offer-installments:6'],
    description: 'Camisa jogador tailandesa 1.1 da coleção 2026, com acabamento premium, textura marcante e visual forte para quem quer vestir a seleção em nível diferenciado. No PIX sai por R$ 249,99 e o combo com 2 unidades entra automaticamente por R$ 449,99 no carrinho.',
    sizes: ['P', 'M', 'G', 'GG', 'XG'],
    colors: [],
    stock: 20,
    rating: 5,
    reviews: 12,
    isNew: true,
    isBestSeller: true,
    discount: 25,
    sku: 'CBR-JOG-2026-11',
  },
  {
    id: 'copa-003',
    slug: 'camisa-retro-2022-torcedor-masculina-tailandesa',
    name: 'Camisa Retrô 2022 Torcedor Masculina Tailandesa',
    price: 99.99,
    originalPrice: 219.99,
    pixPrice: pix(99.99),
    installments: { count: 6, value: inst(99.99) },
    image: copaImgs.masculinaRetro,
    images: [copaImgs.masculinaRetro],
    category: 'Masculino',
    categorySlug: 'masculino',
    collection: 'Copa 2026',
    tags: ['copa', 'brasil', 'masculino', 'retro', 'tailandesa', 'torcedor', 'oferta'],
    description: 'Camisa retrô 2022 de torcedor em versão masculina tailandesa. Uma peça de impacto para destacar a coleção da Copa com preço promocional.',
    sizes: ['P', 'M', 'G', 'GG', 'XG'],
    colors: [],
    stock: 16,
    rating: 4.9,
    reviews: 41,
    isNew: true,
    isBestSeller: true,
    discount: 55,
    sku: 'CBR-MASC-2022',
  },
  {
    id: 'copa-004',
    slug: 'camisa-selecao-brasil-plus-size-azul-g1-g3',
    name: 'Camisa Seleção Brasil Plus Size Azul G1 ao G3',
    price: 189.99,
    pixPrice: pix(189.99),
    installments: { count: 6, value: inst(189.99) },
    image: copaImgs.plusAzul,
    images: [copaImgs.plusAzul],
    category: 'Masculino',
    categorySlug: 'masculino',
    collection: 'Copa 2026',
    tags: ['copa', 'brasil', 'plus-size', 'masculino', 'azul'],
    description: 'Camisa da seleção em corte grande plus size, disponível do G1 ao G3. Opção azul para quem quer conforto, caimento solto e presença marcante.',
    sizes: ['G1', 'G2', 'G3'],
    colors: [],
    stock: 9,
    rating: 4.8,
    reviews: 17,
    isNew: true,
    isBestSeller: true,
    sku: 'CBR-PLUS-AZUL',
  },
  {
    id: 'copa-005',
    slug: 'camisa-selecao-brasil-plus-size-preta-g1-g3',
    name: 'Camisa Seleção Brasil Plus Size Preta G1 ao G3',
    price: 189.99,
    pixPrice: pix(189.99),
    installments: { count: 6, value: inst(189.99) },
    image: copaImgs.plusPreta,
    images: [copaImgs.plusPreta],
    category: 'Masculino',
    categorySlug: 'masculino',
    collection: 'Copa 2026',
    tags: ['copa', 'brasil', 'plus-size', 'masculino', 'preta'],
    description: 'Camisa da seleção em versão preta plus size com corte grande do G1 ao G3. Ideal para quem gosta de uma pegada mais urbana e diferenciada.',
    sizes: ['G1', 'G2', 'G3'],
    colors: [],
    stock: 8,
    rating: 4.8,
    reviews: 13,
    isNew: true,
    isBestSeller: true,
    sku: 'CBR-PLUS-PRETA',
  },
  {
    id: 'copa-006',
    slug: 'camisa-selecao-brasil-plus-size-amarela-g1-g3',
    name: 'Camisa Seleção Brasil Plus Size Amarela G1 ao G3',
    price: 189.99,
    pixPrice: pix(189.99),
    installments: { count: 6, value: inst(189.99) },
    image: copaImgs.plusAmarela,
    images: [copaImgs.plusAmarela],
    category: 'Masculino',
    categorySlug: 'masculino',
    collection: 'Copa 2026',
    tags: ['copa', 'brasil', 'plus-size', 'masculino', 'amarela'],
    description: 'Camisa da seleção amarela em modelagem plus size G1 ao G3. Uma das peças mais representativas da coleção para quem quer vestir a paixão com conforto.',
    sizes: ['G1', 'G2', 'G3'],
    colors: [],
    stock: 10,
    rating: 4.9,
    reviews: 19,
    isNew: true,
    isBestSeller: true,
    sku: 'CBR-PLUS-AMARELA',
  },
  {
    id: 'copa-007',
    slug: 'conjunto-infantil-amarelo-camisa-short',
    name: 'Conjunto Infantil Amarelo Camisa + Short',
    price: 299.99,
    pixPrice: pix(299.99),
    installments: { count: 6, value: inst(299.99) },
    image: copaImgs.infantilAmarelo,
    images: [copaImgs.infantilAmarelo],
    category: 'Infantil',
    categorySlug: 'infantil',
    collection: 'Copa 2026',
    tags: ['copa', 'brasil', 'infantil', 'camisa', 'short'],
    description: 'Conjunto infantil amarelo com camisa e short, disponível de 3 a 14 anos. Perfeito para deixar a coleção da Copa completa também para os pequenos.',
    sizes: ['3 anos', '4 anos', '6 anos', '8 anos', '10 anos', '12 anos', '14 anos'],
    colors: [],
    stock: 11,
    rating: 4.9,
    reviews: 22,
    isNew: true,
    isBestSeller: true,
    sku: 'CBR-INF-KIT',
  },
];

export const products: Product[] = [...copaProducts, ...perfumariaCatalog];

export const collections = [
  {
    id: 'copa2026',
    label: 'Copa 2026',
    slug: 'copa-2026',
    description: 'Camisas em destaque da seleção',
    image: copaImgs.plusAmarela,
  },
  {
    id: 'masculino',
    label: 'Masculino',
    slug: 'masculino',
    description: 'Modelos masculinos e plus size',
    image: copaImgs.masculinaRetro,
  },
  {
    id: 'feminino',
    label: 'Feminino',
    slug: 'feminino',
    description: 'Camisa feminina retrô em destaque',
    image: copaImgs.femininaRetro,
  },
  {
    id: 'infantil',
    label: 'Infantil',
    slug: 'infantil',
    description: 'Conjunto completo para 3 a 14 anos',
    image: copaImgs.infantilAmarelo,
  },
  {
    id: 'perfumaria',
    label: 'Perfumaria',
    slug: 'perfumaria',
    description: 'Essências que deixam presença',
    image: perfumariaCatalog[0]?.image ?? copaImgs.plusAmarela,
  },
];

export const categories = [
  { slug: 'masculino', label: 'Masculino' },
  { slug: 'feminino', label: 'Feminino' },
  { slug: 'infantil', label: 'Infantil' },
  { slug: 'perfumaria', label: 'Perfumaria' },
];
