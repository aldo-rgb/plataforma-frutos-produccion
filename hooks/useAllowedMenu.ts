import { useState, useEffect } from 'react';
import { MENU_ITEMS } from '@/config/menuPermissions';

interface User {
  rol: string;
  [key: string]: any;
}

interface UseAllowedMenuProps {
  user: User | null;
}

/**
 * Hook para filtrar los items del menú según los permisos del usuario
 * @param user - Usuario actual con su rol
 * @returns menuItems filtrados y estado de loading
 */
export function useAllowedMenu({ user }: UseAllowedMenuProps) {
  const [allowedItems, setAllowedItems] = useState<typeof MENU_ITEMS>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function filterMenu() {
      if (!user) {
        setLoading(false);
        return;
      }

      // =====================================================
      // 1. REGLA DE ORO: Si es ADMINISTRADOR, ve TODO automáticamente.
      // =====================================================
      if (user.rol === 'ADMINISTRADOR') {
        setAllowedItems(MENU_ITEMS);
        setLoading(false);
        return;
      }

      try {
        // =====================================================
        // 2. Si es mortal (Mentor, Coordinador, Game Changer), 
        //    consultamos la BD
        // =====================================================
        const res = await fetch('/api/admin/permisos');
        
        if (!res.ok) {
          throw new Error('Error al cargar permisos');
        }
        
        const allPermissions = await res.json();

        // =====================================================
        // 3. Filtramos: ¿Qué permisos tiene MI rol específico?
        // =====================================================
        // Buscamos en la respuesta de la BD las reglas donde 
        // role == mi_rol y isEnabled == true
        const myAllowedKeys = allPermissions
          .filter((p: any) => p.role === user.rol && p.isEnabled)
          .map((p: any) => p.menuKey);

        // =====================================================
        // 4. Construimos el menú final
        // =====================================================
        const filteredMenu = MENU_ITEMS.filter(item => 
          // Se queda si el ID está en mi lista de permitidos
          myAllowedKeys.includes(item.id) 
          // O si es una sección pública (como "Ranking" que quizás siempre quieras mostrar)
          || item.section === 'General' 
        );

        setAllowedItems(filteredMenu);

      } catch (error) {
        console.error("Error filtrando menú", error);
        // Fallback de seguridad: Si falla, mostrar solo lo básico
        setAllowedItems(MENU_ITEMS.filter(i => i.section === 'General'));
      } finally {
        setLoading(false);
      }
    }

    filterMenu();
  }, [user]);

  return { menuItems: allowedItems, loading };
}
