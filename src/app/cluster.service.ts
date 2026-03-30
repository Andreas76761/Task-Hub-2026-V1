import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface SubGroup {
  id: string;
  name: string;
}

export interface MainGroup {
  id: string;
  name: string;
  subGroups: SubGroup[];
}

@Injectable({
  providedIn: 'root'
})
export class ClusterService {
  private platformId = inject(PLATFORM_ID);
  
  mainGroups = signal<MainGroup[]>([
    {
      id: 'mercedes',
      name: 'Mercedes',
      subGroups: [{ id: 'athena', name: 'Athena' }]
    },
    {
      id: 'privat',
      name: 'Privat',
      subGroups: [{ id: 'youtube', name: 'Youtube' }]
    },
    {
      id: 'aktien',
      name: 'Aktien',
      subGroups: [{ id: 'ig-com', name: 'ig.com' }]
    },
    {
      id: 'ai',
      name: 'AI',
      subGroups: [{ id: 'perplexity', name: 'perplexity' }]
    }
  ]);

  constructor() {
    this.loadFromStorage();
    
    effect(() => {
      this.saveToStorage(this.mainGroups());
    });
  }

  private saveToStorage(groups: MainGroup[]) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('workspace_clusters', JSON.stringify(groups));
    }
  }

  private loadFromStorage() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('workspace_clusters');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.mainGroups.set(parsed);
          }
        } catch (e) {
          console.error('Failed to parse clusters from storage', e);
        }
      }
    }
  }

  addMainGroup(name: string) {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    this.mainGroups.update(groups => [...groups, { id, name, subGroups: [] }]);
  }

  removeMainGroup(id: string) {
    this.mainGroups.update(groups => groups.filter(g => g.id !== id));
  }

  addSubGroup(mainGroupId: string, name: string) {
    const subId = name.toLowerCase().replace(/\s+/g, '-');
    this.mainGroups.update(groups => groups.map(g => {
      if (g.id === mainGroupId) {
        return { ...g, subGroups: [...g.subGroups, { id: subId, name }] };
      }
      return g;
    }));
  }

  removeSubGroup(mainGroupId: string, subGroupId: string) {
    this.mainGroups.update(groups => groups.map(g => {
      if (g.id === mainGroupId) {
        return { ...g, subGroups: g.subGroups.filter(s => s.id !== subGroupId) };
      }
      return g;
    }));
  }
}
