import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ClusterService } from './cluster.service';
import { KiCategoryService } from './ki-category.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-gray-50">
      <div class="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p class="text-sm text-gray-500 mt-1">Verwalte deine Hauptgruppen, Subgruppen und KI-Kategorien</p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-4xl mx-auto space-y-8">
          
          <!-- KI Categories Section -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 class="font-semibold text-gray-800 flex items-center gap-2">
                <mat-icon class="text-emerald-600">category</mat-icon>
                KI Tool Kategorien
              </h2>
              <div class="flex gap-2">
                <input 
                  type="text" 
                  [(ngModel)]="newKiCategoryName" 
                  placeholder="Neue KI Kategorie..." 
                  class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  (keyup.enter)="addKiCategory()"
                >
                <button 
                  (click)="addKiCategory()"
                  class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <mat-icon style="font-size: 18px; width: 18px; height: 18px;">add</mat-icon> Hinzufügen
                </button>
              </div>
            </div>

            <div class="p-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                @for (cat of kiCategoryService.categories(); track cat.id) {
                  <div class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 group">
                    <span class="text-sm text-gray-700 font-medium">{{ cat.name }}</span>
                    <button 
                      (click)="kiCategoryService.deleteCategory(cat.id)"
                      class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <mat-icon style="font-size: 16px; width: 16px; height: 16px;">close</mat-icon>
                    </button>
                  </div>
                }
              </div>
            </div>
          </section>

          <!-- Main Groups Section -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 class="font-semibold text-gray-800 flex items-center gap-2">
                <mat-icon class="text-blue-600">account_tree</mat-icon>
                Hauptgruppen & Subgruppen
              </h2>
              <div class="flex gap-2">
                <input 
                  type="text" 
                  [(ngModel)]="newMainGroupName" 
                  placeholder="Neue Hauptgruppe..." 
                  class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  (keyup.enter)="addMainGroup()"
                >
                <button 
                  (click)="addMainGroup()"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <mat-icon style="font-size: 18px; width: 18px; height: 18px;">add</mat-icon> Hinzufügen
                </button>
              </div>
            </div>

            <div class="divide-y divide-gray-100">
              @for (group of clusterService.mainGroups(); track group.id) {
                <div class="p-6 space-y-4">
                  <div class="flex justify-between items-center">
                    <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                      {{ group.name }}
                      <span class="text-xs font-normal text-gray-400">({{ group.subGroups.length }} Subgruppen)</span>
                    </h3>
                    <button 
                      (click)="clusterService.removeMainGroup(group.id)"
                      class="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                      title="Hauptgruppe löschen"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>

                  <!-- Subgroups List -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    @for (sub of group.subGroups; track sub.id) {
                      <div class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 group">
                        <span class="text-sm text-gray-700 font-medium">{{ sub.name }}</span>
                        <button 
                          (click)="clusterService.removeSubGroup(group.id, sub.id)"
                          class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <mat-icon style="font-size: 16px; width: 16px; height: 16px;">close</mat-icon>
                        </button>
                      </div>
                    }
                    
                    <!-- Add Subgroup Input -->
                    <div class="flex gap-2">
                      <input 
                        #subInput
                        type="text" 
                        placeholder="Neue Subgruppe..." 
                        class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        (keyup.enter)="addSubGroup(group.id, subInput)"
                      >
                      <button 
                        (click)="addSubGroup(group.id, subInput)"
                        class="bg-gray-100 hover:bg-gray-200 text-gray-600 p-1.5 rounded-lg transition-colors"
                      >
                        <mat-icon style="font-size: 18px; width: 18px; height: 18px;">add</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Info Card -->
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-6 flex gap-4">
            <mat-icon class="text-blue-600">info</mat-icon>
            <div>
              <h4 class="font-bold text-blue-900">Über das Clustering</h4>
              <p class="text-sm text-blue-800 mt-1">
                Diese Gruppen werden von der KI verwendet, um deine Aktivitäten und Dokumente automatisch zu kategorisieren. 
                Die KI versucht, die passendste Haupt- und Subgruppe basierend auf dem Inhalt zu finden.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  clusterService = inject(ClusterService);
  kiCategoryService = inject(KiCategoryService);
  newMainGroupName = '';
  newKiCategoryName = '';

  addMainGroup() {
    if (this.newMainGroupName.trim()) {
      this.clusterService.addMainGroup(this.newMainGroupName.trim());
      this.newMainGroupName = '';
    }
  }

  addSubGroup(mainGroupId: string, input: HTMLInputElement) {
    if (input.value.trim()) {
      this.clusterService.addSubGroup(mainGroupId, input.value.trim());
      input.value = '';
    }
  }

  addKiCategory() {
    if (this.newKiCategoryName.trim()) {
      this.kiCategoryService.addCategory(this.newKiCategoryName.trim());
      this.newKiCategoryName = '';
    }
  }
}
