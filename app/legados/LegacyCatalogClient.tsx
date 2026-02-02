'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Filter,
  Heart,
  Users,
  TrendingUp,
  Clock,
  Sparkles,
  TreePine,
  Baby,
  Cat,
  GraduationCap,
  Stethoscope,
  Home,
  UtensilsCrossed,
  HelpCircle,
  ChevronDown,
  X,
} from 'lucide-react';

interface Campaign {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  logoImage: string | null;
  goalAmount: number;
  raisedAmount: number;
  category: string;
  organizationName: string;
  visionName: string;
  donationsCount: number;
  isFeatured: boolean;
  endDate?: string;
}

interface Props {
  initialCampaigns: Campaign[];
  categories: string[];
}

const categoryLabels: Record<string, string> = {
  CHILDREN: 'Niños',
  ELDERLY: 'Adultos Mayores',
  ANIMALS: 'Animales',
  ECOLOGICAL: 'Ecológico',
  EDUCATION: 'Educación',
  HEALTH: 'Salud',
  HOUSING: 'Vivienda',
  FOOD: 'Alimentación',
  OTHER: 'Otro',
};

const categoryIcons: Record<string, any> = {
  CHILDREN: Baby,
  ELDERLY: Users,
  ANIMALS: Cat,
  ECOLOGICAL: TreePine,
  EDUCATION: GraduationCap,
  HEALTH: Stethoscope,
  HOUSING: Home,
  FOOD: UtensilsCrossed,
  OTHER: HelpCircle,
};

export default function LegacyCatalogClient({ initialCampaigns, categories }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'amount'>('recent');
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredCampaigns = useMemo(() => {
    let filtered = [...initialCampaigns];

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.description.toLowerCase().includes(term) ||
          c.organizationName.toLowerCase().includes(term)
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((c) => c.category === selectedCategory);
    }

    // Ordenar
    switch (sortBy) {
      case 'progress':
        filtered.sort((a, b) => {
          const progressA = a.goalAmount > 0 ? a.raisedAmount / a.goalAmount : 0;
          const progressB = b.goalAmount > 0 ? b.raisedAmount / b.goalAmount : 0;
          return progressB - progressA;
        });
        break;
      case 'amount':
        filtered.sort((a, b) => b.raisedAmount - a.raisedAmount);
        break;
      default:
        // Ya viene ordenado por reciente del servidor
        break;
    }

    return filtered;
  }, [initialCampaigns, searchTerm, selectedCategory, sortBy]);

  const featuredCampaigns = filteredCampaigns.filter((c) => c.isFeatured);
  const regularCampaigns = filteredCampaigns.filter((c) => !c.isFeatured);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Legados de <span className="text-emerald-400">Impacto</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            Descubre proyectos sociales que están transformando comunidades. 
            Tu donación hace la diferencia.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar proyectos..."
              className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-full"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => {
                const Icon = categoryIcons[cat] || HelpCircle;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {categoryLabels[cat] || cat}
                  </button>
                );
              })}
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm"
              >
                <Filter className="w-4 h-4" />
                Ordenar
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showFilters && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-20">
                  {[
                    { id: 'recent', label: 'Más recientes' },
                    { id: 'progress', label: 'Mayor progreso' },
                    { id: 'amount', label: 'Más recaudado' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSortBy(option.id as any);
                        setShowFilters(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-slate-700 ${
                        sortBy === option.id ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{initialCampaigns.length}</p>
            <p className="text-slate-400 text-sm">Proyectos Activos</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(initialCampaigns.reduce((sum, c) => sum + c.raisedAmount, 0))}
            </p>
            <p className="text-slate-400 text-sm">Total Recaudado</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {initialCampaigns.reduce((sum, c) => sum + c.donationsCount, 0)}
            </p>
            <p className="text-slate-400 text-sm">Donaciones</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{categories.length}</p>
            <p className="text-slate-400 text-sm">Categorías</p>
          </div>
        </div>

        {/* Featured Campaigns */}
        {featuredCampaigns.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Proyectos Destacados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} featured />
              ))}
            </div>
          </div>
        )}

        {/* Regular Campaigns */}
        {regularCampaigns.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              {filteredCampaigns.length} Proyectos
              {selectedCategory !== 'all' && ` de ${categoryLabels[selectedCategory] || selectedCategory}`}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No hay proyectos</h3>
            <p className="text-slate-500">
              {searchTerm
                ? 'No encontramos proyectos con esa búsqueda'
                : 'No hay proyectos en esta categoría'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm">
            Cada donación es 100% transparente y rastreable
          </p>
        </div>
      </footer>
    </div>
  );
}

// Campaign Card Component
function CampaignCard({ campaign, featured = false }: { campaign: Campaign; featured?: boolean }) {
  const progress = campaign.goalAmount > 0 
    ? Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100) 
    : 0;
  
  const CategoryIcon = categoryIcons[campaign.category] || HelpCircle;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Check if campaign is ending soon (within 7 days)
  const isEndingSoon = campaign.endDate && 
    new Date(campaign.endDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Link href={`/legado/${campaign.slug}`}>
      <div className={`group bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all hover:shadow-xl hover:shadow-emerald-500/5 ${featured ? 'md:flex' : ''}`}>
        {/* Image */}
        <div className={`relative ${featured ? 'md:w-1/2' : ''} aspect-video`}>
          {campaign.coverImage ? (
            <Image
              src={campaign.coverImage}
              alt={campaign.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700" />
          )}
          
          {/* Logo overlay */}
          {campaign.logoImage && (
            <div className="absolute top-3 left-3">
              <Image
                src={campaign.logoImage}
                alt="Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-slate-900/80 backdrop-blur-sm text-xs text-white rounded-full flex items-center gap-1">
              <CategoryIcon className="w-3 h-3" />
              {categoryLabels[campaign.category] || campaign.category}
            </span>
          </div>

          {/* Ending soon badge */}
          {isEndingSoon && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 bg-red-500 text-xs text-white rounded-full flex items-center gap-1 animate-pulse">
                <Clock className="w-3 h-3" />
                ¡Termina pronto!
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-4 ${featured ? 'md:w-1/2 md:flex md:flex-col md:justify-center' : ''}`}>
          <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
            {campaign.title}
          </h3>
          <p className="text-slate-400 text-sm line-clamp-2 mb-4">
            {campaign.description || `Proyecto de ${campaign.visionName}`}
          </p>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-emerald-400 font-bold">
                {formatCurrency(campaign.raisedAmount)}
              </span>
              <span className="text-slate-500">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Meta: {formatCurrency(campaign.goalAmount)}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-slate-400">
              <Heart className="w-4 h-4 text-pink-400" />
              {campaign.donationsCount} donaciones
            </span>
            <span className="text-slate-500">
              {campaign.organizationName || campaign.visionName}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
