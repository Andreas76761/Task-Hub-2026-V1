import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivityService } from './activity.service';
import { ClusterService } from './cluster.service';
import { Activity } from './models';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DatePipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule, FormsModule, DatePipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full bg-gray-50 overflow-hidden">
      <!-- Sidebar Filters -->
      <aside class="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <mat-icon>filter_list</mat-icon> Filter
          </h2>
        </div>
        
        <div class="p-6 space-y-8">
          <!-- Search -->
          <div>
            <label for="search-input" class="block text-sm font-medium text-gray-700 mb-2">Suche</label>
            <div class="relative">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</mat-icon>
              <input 
                id="search-input"
                type="text" 
                [(ngModel)]="searchTerm"
                placeholder="URL, Titel oder Notiz..." 
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
            </div>
          </div>

          <!-- Cluster Filter -->
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-2">Cluster</span>
            <select [(ngModel)]="selectedCluster" class="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
              <option [value]="null">Alle Cluster</option>
              @for (group of clusterService.mainGroups(); track group.id) {
                <option [value]="group.name">{{ group.name }}</option>
              }
            </select>
          </div>

          <!-- Category Filter -->
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-2">Kategorie</span>
            <div class="space-y-2">
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="category" [value]="null" [(ngModel)]="selectedCategory" class="text-blue-600 focus:ring-blue-500 w-4 h-4">
                <span class="text-gray-700 group-hover:text-gray-900">Alle Kategorien</span>
              </label>
              @for (cat of activityService.categories(); track cat) {
                <label class="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" name="category" [value]="cat" [(ngModel)]="selectedCategory" class="text-blue-600 focus:ring-blue-500 w-4 h-4">
                  <span class="text-gray-700 group-hover:text-gray-900">{{ cat }}</span>
                </label>
              }
            </div>
          </div>

          <!-- Priority Filter -->
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-2">Priorität</span>
            <div class="flex gap-2">
              @for (prio of ['Alle', 'Hoch', 'Mittel', 'Niedrig']; track prio) {
                <button 
                  (click)="selectedPriority.set(prio === 'Alle' ? null : prio)"
                  class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors border"
                  [class]="selectedPriority() === (prio === 'Alle' ? null : prio) 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
                >
                  {{ prio }}
                </button>
              }
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col h-full overflow-hidden">
        <div class="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Aktivitäten Monitor</h1>
            <p class="text-sm text-gray-500 mt-1">
              {{ filteredActivities().length }} Einträge gefunden. 
              <span class="text-xs ml-2 text-gray-400">Tipp: Eine Quelle ist der Suchverlauf bei chrome://history/ und edge://history/all</span>
            </p>
          </div>
          <button 
            (click)="activityService.clearActivities()"
            class="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-2 rounded-md hover:bg-red-50 transition-colors"
          >
            <mat-icon class="text-sm" style="width: 18px; height: 18px; font-size: 18px;">delete_sweep</mat-icon>
            Daten löschen
          </button>
        </div>

        @if (activityService.isLoading()) {
          <div class="p-6 bg-blue-50 border-b border-blue-100 flex flex-col items-center justify-center shrink-0">
            <mat-icon class="animate-spin text-blue-500 mb-3" style="transform: scale(1.5); width: 36px; height: 36px;">
              {{ activityService.loadingProgress() === 'Dashboard erstellt' ? 'check_circle' : 'autorenew' }}
            </mat-icon>
            <h3 class="text-lg font-medium text-blue-900 mb-1">{{ activityService.loadingProgress() || 'Verarbeite Datei...' }}</h3>
            <p class="text-blue-700 text-sm">Bitte warten, die Daten werden verarbeitet.</p>
          </div>
        }

        <div class="flex-1 overflow-y-auto p-6">
          <div class="space-y-6 max-w-5xl mx-auto">
            @for (dateGroup of groupedActivities(); track dateGroup.dateStr) {
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center gap-2">
                  <mat-icon class="text-gray-500">calendar_today</mat-icon>
                  <h3 class="font-semibold text-gray-900">{{ dateGroup.dateStr }}</h3>
                  <span class="ml-auto bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {{ dateGroup.activities.length }}
                  </span>
                </div>
                
                <div class="divide-y divide-gray-100">
                  @for (activity of dateGroup.activities; track activity.id) {
                    <div class="p-6 hover:bg-gray-50 transition-colors">
                      <div class="flex items-start justify-between gap-4 mb-4">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {{ activity.category }}
                            </span>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {{ activity.cluster }}
                            </span>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              {{ activity.subcluster }}
                            </span>
                            <span 
                              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              [class.bg-red-100]="activity.priority === 'Hoch'"
                              [class.text-red-800]="activity.priority === 'Hoch'"
                              [class.bg-yellow-100]="activity.priority === 'Mittel'"
                              [class.text-yellow-800]="activity.priority === 'Mittel'"
                              [class.bg-green-100]="activity.priority === 'Niedrig'"
                              [class.text-green-800]="activity.priority === 'Niedrig'"
                            >
                              {{ activity.priority }}
                            </span>
                            <span class="text-xs text-gray-500 ml-2">{{ activity.date | date:'HH:mm' }}</span>
                          </div>
                          <h4 class="text-lg font-medium text-gray-900 truncate" [title]="activity.title">{{ activity.title }}</h4>
                          <a [href]="activity.url" target="_blank" class="text-sm text-blue-600 hover:underline truncate block mt-1">
                            {{ activity.url }}
                          </a>
                        </div>
                        
                        <!-- Actions -->
                        <div class="flex items-center gap-2 shrink-0">
                          <select 
                            [ngModel]="activity.priority" 
                            (ngModelChange)="updatePriority(activity.id, $event)"
                            class="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="Hoch">Hoch</option>
                            <option value="Mittel">Mittel</option>
                            <option value="Niedrig">Niedrig</option>
                          </select>
                          <button class="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors" (click)="deleteActivity(activity.id)" title="Löschen">
                            <mat-icon style="font-size: 20px; width: 20px; height: 20px; display: block;">delete</mat-icon>
                          </button>
                        </div>
                      </div>

                      <!-- Screenshots -->
                      <div class="mb-4">
                        <h5 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Screenshots (3 Ansichten)</h5>
                        <div class="grid grid-cols-3 gap-4">
                          @for (screenshot of activity.screenshots; track $index) {
                            <div class="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group">
                              <img [src]="screenshot" alt="Screenshot" class="w-full h-full object-cover" referrerpolicy="no-referrer" loading="lazy" (error)="handleImageError($event, activity.domain)">
                              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <a [href]="screenshot" target="_blank" class="text-white hover:text-blue-200">
                                  <mat-icon>zoom_in</mat-icon>
                                </a>
                              </div>
                            </div>
                          }
                        </div>
                      </div>

                      <!-- Notes -->
                      <div>
                        <h5 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <mat-icon class="text-xs" style="width: 16px; height: 16px; font-size: 16px;">edit_note</mat-icon> Interne Vermerke
                        </h5>
                        <textarea 
                          [ngModel]="activity.notes"
                          (change)="updateNotes(activity.id, $any($event.target).value)"
                          placeholder="Notizen zu dieser Seite hinzufügen..."
                          class="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white"
                          rows="2"
                        ></textarea>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
            
            @if (groupedActivities().length === 0) {
              <div class="text-center py-12 bg-white rounded-xl border border-gray-200">
                <mat-icon class="text-gray-400 mb-3" style="transform: scale(2); width: 48px; height: 48px;">search_off</mat-icon>
                <h3 class="text-lg font-medium text-gray-900">Keine Aktivitäten gefunden</h3>
                <p class="text-gray-500 mt-1">Versuche andere Filtereinstellungen.</p>
              </div>
            }

            @if (visibleCount() < filteredActivities().length) {
              <div class="text-center py-6">
                <button 
                  (click)="loadMore()"
                  class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-2 shadow-sm"
                >
                  <mat-icon>expand_more</mat-icon>
                  Mehr laden ({{ filteredActivities().length - visibleCount() }} weitere)
                </button>
              </div>
            }
          </div>
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent {
  activityService = inject(ActivityService);
  clusterService = inject(ClusterService);
  
  searchTerm = signal<string>('');
  selectedCategory = signal<string | null>(null);
  selectedCluster = signal<string | null>(null);
  selectedPriority = signal<string | null>(null);

  visibleCount = signal<number>(200);

  filteredActivities = computed(() => {
    let acts = this.activityService.activities();
    const term = this.searchTerm().toLowerCase();
    const cat = this.selectedCategory();
    const cluster = this.selectedCluster();
    const prio = this.selectedPriority();

    if (term) {
      acts = acts.filter(a => 
        a.title.toLowerCase().includes(term) || 
        a.url.toLowerCase().includes(term) || 
        a.notes.toLowerCase().includes(term)
      );
    }
    if (cat) {
      acts = acts.filter(a => a.category === cat);
    }
    if (cluster) {
      acts = acts.filter(a => a.cluster === cluster);
    }
    if (prio) {
      acts = acts.filter(a => a.priority === prio);
    }

    return acts;
  });

  groupedActivities = computed(() => {
    const acts = this.filteredActivities().slice(0, this.visibleCount());
    const groups = new Map<string, Activity[]>();

    acts.forEach(a => {
      let dateStr = 'Unbekannt';
      if (a.date instanceof Date && !isNaN(a.date.getTime())) {
        // Fast ISO string formatting for grouping
        dateStr = a.date.toISOString().split('T')[0];
      }
      
      if (!groups.has(dateStr)) {
        groups.set(dateStr, []);
      }
      groups.get(dateStr)!.push(a);
    });

    return Array.from(groups.entries())
      .map(([dateStr, activities]) => ({ dateStr, activities }))
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  });

  loadMore() {
    this.visibleCount.update(c => c + 200);
  }

  updatePriority(id: string, priority: 'Hoch' | 'Mittel' | 'Niedrig') {
    this.activityService.updateActivity(id, { priority });
  }

  updateNotes(id: string, notes: string) {
    this.activityService.updateActivity(id, { notes });
  }

  deleteActivity(id: string) {
    this.activityService.deleteActivity(id);
  }

  handleImageError(event: Event, domain: string) {
    const img = event.target as HTMLImageElement;
    // Fallback to picsum if thum.io fails
    const seed = encodeURIComponent(domain + Math.random());
    img.src = `https://picsum.photos/seed/${seed}/600/400`;
  }
}
