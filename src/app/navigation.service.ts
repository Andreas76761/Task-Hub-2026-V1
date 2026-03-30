import { Injectable, signal } from '@angular/core';

export type TabType = 'dashboard' | 'upload' | 'activities' | 'documents' | 'images' | 'ki-tools' | 'ki-resources' | 'admin' | 'settings' | 'export' | 'usermanual' | 'releaseletter' | 'systemdoku' | 'promptgallery' | 'stackoverflow' | 'todo-activities' | 'skills-agents' | 'presentations' | 'presentation-creator';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  activeTab = signal<TabType>('dashboard');

  navigateTo(tab: TabType) {
    this.activeTab.set(tab);
  }
}
