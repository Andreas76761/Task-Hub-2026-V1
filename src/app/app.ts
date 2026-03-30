import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import { ActivitiesComponent } from './activities.component';
import { DocumentsComponent } from './documents.component';
import { ImagesComponent } from './images.component';
import { KiToolsComponent } from './ki-tools.component';
import { KiResourcesComponent } from './ki-resources.component';
import { AdminComponent } from './admin.component';
import { UploadPageComponent } from './upload-page.component';
import { SettingsComponent } from './settings.component';
import { ExportComponent } from './export.component';
import { AnalyticsDashboardComponent } from './analytics-dashboard.component';
import { DocumentationComponent } from './documentation.component';
import { PromptGalleryComponent } from './prompt-gallery.component';
import { StackOverflowComponent } from './stack-overflow.component';
import { TodoActivitiesComponent } from './todo-activities.component';
import { SkillsAgentsComponent } from './skills-agents.component';
import { PresentationsComponent } from './presentations.component';
import { PresentationCreatorComponent } from './presentation-creator.component';
import { ToastsComponent } from './toasts.component';
import { MatIconModule } from '@angular/material/icon';
import { NavigationService } from './navigation.service';
import { signal } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [ActivitiesComponent, DocumentsComponent, ImagesComponent, KiToolsComponent, KiResourcesComponent, AdminComponent, UploadPageComponent, SettingsComponent, ExportComponent, AnalyticsDashboardComponent, ToastsComponent, MatIconModule, DocumentationComponent, PromptGalleryComponent, StackOverflowComponent, TodoActivitiesComponent, SkillsAgentsComponent, PresentationsComponent, PresentationCreatorComponent],
  styleUrl: './app.css',
  template: `
    <div class="flex h-screen w-full bg-gray-100 font-sans overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div class="p-6">
          <h1 class="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <mat-icon class="text-blue-400">insights</mat-icon>
            Workspace
          </h1>
        </div>
        <nav class="flex-1 px-4 space-y-2 overflow-y-auto">
          <button 
            (click)="nav.navigateTo('dashboard')" 
            [class.bg-slate-800]="nav.activeTab() === 'dashboard'" 
            [class.text-blue-400]="nav.activeTab() === 'dashboard'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
          >
            <mat-icon>dashboard</mat-icon> Dashboard
          </button>
          
          <div class="h-px bg-slate-800 my-2"></div>
          
          <button 
            (click)="nav.navigateTo('activities')" 
            [class.bg-slate-800]="nav.activeTab() === 'activities'" 
            [class.text-blue-400]="nav.activeTab() === 'activities'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
          >
            <mat-icon>monitor_heart</mat-icon> Aktivitäten Monitor
          </button>
          <button 
            (click)="nav.navigateTo('documents')" 
            [class.bg-slate-800]="nav.activeTab() === 'documents'" 
            [class.text-blue-400]="nav.activeTab() === 'documents'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
          >
            <mat-icon>folder</mat-icon> Dokumentenarchiv
          </button>
          <button 
            (click)="nav.navigateTo('upload')" 
            [class.bg-slate-800]="nav.activeTab() === 'upload'" 
            [class.text-blue-400]="nav.activeTab() === 'upload'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
          >
            <mat-icon>cloud_upload</mat-icon> Dateien Hochladen
          </button>

          <!-- Ressource Burger Menu -->
          <div class="relative">
            <button 
              (click)="toggleResourceMenu()" 
              [class.bg-slate-800]="isResourceTabActive()" 
              [class.text-blue-400]="isResourceTabActive()"
              class="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
            >
              <div class="flex items-center gap-3">
                <mat-icon>photo_library</mat-icon> Ressource
              </div>
              <mat-icon class="text-sm transition-transform duration-200" [class.rotate-180]="resourceMenuOpen()">expand_more</mat-icon>
            </button>
            
            @if (resourceMenuOpen()) {
              <div class="pl-12 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <button 
                  (click)="nav.navigateTo('images')" 
                  [class.text-blue-400]="nav.activeTab() === 'images'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  Bilddatenbank
                </button>
                <button 
                  (click)="nav.navigateTo('ki-tools')" 
                  [class.text-blue-400]="nav.activeTab() === 'ki-tools'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  KI Tools
                </button>
                <button 
                  (click)="nav.navigateTo('ki-resources')" 
                  [class.text-blue-400]="nav.activeTab() === 'ki-resources'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  KI Ressourcen
                </button>
                <button 
                  (click)="nav.navigateTo('promptgallery')" 
                  [class.text-blue-400]="nav.activeTab() === 'promptgallery'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  Promptgallery
                </button>
                <button 
                  (click)="nav.navigateTo('stackoverflow')" 
                  [class.text-blue-400]="nav.activeTab() === 'stackoverflow'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  Stackoverflow
                </button>
                <button 
                  (click)="nav.navigateTo('todo-activities')" 
                  [class.text-blue-400]="nav.activeTab() === 'todo-activities'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  To Do Aktivitäten
                </button>
                <button 
                  (click)="nav.navigateTo('skills-agents')" 
                  [class.text-blue-400]="nav.activeTab() === 'skills-agents'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  Skills & Agenten
                </button>
                <button 
                  (click)="nav.navigateTo('presentations')" 
                  [class.text-blue-400]="nav.activeTab() === 'presentations'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  Präsentationen Archiv
                </button>
                <button 
                  (click)="nav.navigateTo('presentation-creator')" 
                  [class.text-blue-400]="nav.activeTab() === 'presentation-creator'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  Präsentation erstellen
                </button>
              </div>
            }
          </div>
          
          <div class="h-px bg-slate-800 my-2"></div>
          
          <button 
            (click)="nav.navigateTo('export')" 
            [class.bg-slate-800]="nav.activeTab() === 'export'" 
            [class.text-blue-400]="nav.activeTab() === 'export'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
          >
            <mat-icon>table_view</mat-icon> Exportbereich
          </button>
          <button 
            (click)="nav.navigateTo('settings')" 
            [class.bg-slate-800]="nav.activeTab() === 'settings'" 
            [class.text-blue-400]="nav.activeTab() === 'settings'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
          >
            <mat-icon>tune</mat-icon> Einstellungen
          </button>

          <!-- Documentation Burger Menu -->
          <div class="relative">
            <button 
              (click)="toggleDocsMenu()" 
              [class.bg-slate-800]="isDocsTabActive()" 
              [class.text-blue-400]="isDocsTabActive()"
              class="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
            >
              <div class="flex items-center gap-3">
                <mat-icon>menu_book</mat-icon> Dokumentation
              </div>
              <mat-icon class="text-sm transition-transform duration-200" [class.rotate-180]="docsMenuOpen()">expand_more</mat-icon>
            </button>
            
            @if (docsMenuOpen()) {
              <div class="pl-12 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <button 
                  (click)="nav.navigateTo('usermanual')" 
                  [class.text-blue-400]="nav.activeTab() === 'usermanual'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  1) Usermanual
                </button>
                <button 
                  (click)="nav.navigateTo('releaseletter')" 
                  [class.text-blue-400]="nav.activeTab() === 'releaseletter'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  2) Releaseletter
                </button>
                <button 
                  (click)="nav.navigateTo('systemdoku')" 
                  [class.text-blue-400]="nav.activeTab() === 'systemdoku'"
                  class="w-full text-left py-2 text-xs font-medium hover:text-white transition-colors text-slate-400"
                >
                  3) Systemdoku
                </button>
              </div>
            }
          </div>

          <button 
            (click)="nav.navigateTo('admin')" 
            [class.bg-slate-800]="nav.activeTab() === 'admin'" 
            [class.text-blue-400]="nav.activeTab() === 'admin'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
          >
            <mat-icon>settings</mat-icon> Admin Bereich
          </button>
        </nav>
        <div class="p-4 border-t border-slate-800">
          <div class="flex items-center gap-3 px-4 py-2">
            <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">A</div>
            <div class="text-sm">
              <p class="font-medium text-white">Admin User</p>
              <p class="text-slate-400 text-xs">admin&#64;workspace.local</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 relative overflow-hidden">
        @switch (nav.activeTab()) {
          @case ('dashboard') { <app-analytics-dashboard class="block h-full"></app-analytics-dashboard> }
          @case ('upload') { <app-upload-page class="block h-full"></app-upload-page> }
          @case ('activities') { <app-activities class="block h-full"></app-activities> }
          @case ('documents') { <app-documents class="block h-full"></app-documents> }
          @case ('images') { <app-images class="block h-full"></app-images> }
          @case ('ki-tools') { <app-ki-tools class="block h-full"></app-ki-tools> }
          @case ('ki-resources') { <app-ki-resources class="block h-full"></app-ki-resources> }
          @case ('promptgallery') { <app-prompt-gallery class="block h-full"></app-prompt-gallery> }
          @case ('stackoverflow') { <app-stack-overflow class="block h-full"></app-stack-overflow> }
          @case ('todo-activities') { <app-todo-activities class="block h-full"></app-todo-activities> }
          @case ('skills-agents') { <app-skills-agents class="block h-full"></app-skills-agents> }
          @case ('presentations') { <app-presentations class="block h-full"></app-presentations> }
          @case ('presentation-creator') { <app-presentation-creator class="block h-full"></app-presentation-creator> }
          @case ('admin') { <app-admin class="block h-full"></app-admin> }
          @case ('settings') { <app-settings class="block h-full"></app-settings> }
          @case ('export') { <app-export class="block h-full"></app-export> }
          @case ('usermanual') { <app-documentation type="usermanual" class="block h-full"></app-documentation> }
          @case ('releaseletter') { <app-documentation type="releaseletter" class="block h-full"></app-documentation> }
          @case ('systemdoku') { <app-documentation type="systemdoku" class="block h-full"></app-documentation> }
        }
      </main>
      <app-toasts></app-toasts>
    </div>
  `,
})
export class App {
  nav = inject(NavigationService);
  docsMenuOpen = signal(false);
  resourceMenuOpen = signal(false);

  toggleDocsMenu() {
    this.docsMenuOpen.update(v => !v);
  }

  toggleResourceMenu() {
    this.resourceMenuOpen.update(v => !v);
  }

  isDocsTabActive() {
    const tab = this.nav.activeTab();
    return tab === 'usermanual' || tab === 'releaseletter' || tab === 'systemdoku';
  }

  isResourceTabActive() {
    const tab = this.nav.activeTab();
    return tab === 'images' || tab === 'ki-tools' || tab === 'ki-resources' || tab === 'promptgallery' || tab === 'stackoverflow' || tab === 'todo-activities' || tab === 'skills-agents' || tab === 'presentations' || tab === 'presentation-creator';
  }
}

