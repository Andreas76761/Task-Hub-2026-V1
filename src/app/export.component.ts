import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivityService } from './activity.service';
import { DocumentService } from './document.service';
import { ClusterService } from './cluster.service';
import { ToastService } from './toast.service';
import { Activity, Document } from './models';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-gray-50">
      <div class="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Exportbereich</h1>
          <p class="text-sm text-gray-500 mt-1">Exportiere deine Daten in Excel-Listen</p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-4xl mx-auto space-y-8">
          
          <!-- Export Configuration -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <mat-icon class="text-green-600">file_download</mat-icon>
              <h2 class="font-semibold text-gray-800">Excel Export Konfiguration</h2>
            </div>

            <div class="p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Data Source -->
                <div>
                  <label for="exportSource" class="block text-sm font-medium text-gray-700 mb-2">Datenquelle</label>
                  <select id="exportSource" [(ngModel)]="exportSource" class="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm">
                    <option value="activities">Aktivitäten Monitor</option>
                    <option value="documents">Dokumentenarchiv</option>
                    <option value="all">Alle Daten (getrennte Blätter)</option>
                  </select>
                </div>

                <!-- Date Range -->
                <div>
                  <label for="startDate" class="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
                  <div class="flex gap-2">
                    <input id="startDate" type="date" [(ngModel)]="startDate" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500">
                    <input id="endDate" type="date" [(ngModel)]="endDate" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500">
                  </div>
                </div>

                <!-- Category/Cluster Filter -->
                <div>
                  <label for="selectedCluster" class="block text-sm font-medium text-gray-700 mb-2">Hauptgruppe (Cluster)</label>
                  <select id="selectedCluster" [(ngModel)]="selectedCluster" class="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm">
                    <option [value]="null">Alle Hauptgruppen</option>
                    @for (group of clusterService.mainGroups(); track group.id) {
                      <option [value]="group.name">{{ group.name }}</option>
                    }
                  </select>
                </div>

                <!-- Subcategory/Subcluster Filter -->
                <div>
                  <label for="selectedSubcluster" class="block text-sm font-medium text-gray-700 mb-2">Subgruppe (Subcluster)</label>
                  <select id="selectedSubcluster" [(ngModel)]="selectedSubcluster" class="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm">
                    <option [value]="null">Alle Subgruppen</option>
                    @for (sub of availableSubclusters(); track sub.id) {
                      <option [value]="sub.name">{{ sub.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="pt-6 border-t border-gray-100 flex justify-between items-center">
                <div class="text-sm text-gray-500">
                  <span class="font-medium text-gray-900">{{ filteredDataCount() }}</span> Datensätze werden exportiert
                </div>
                <button 
                  (click)="exportToExcel()"
                  [disabled]="filteredDataCount() === 0"
                  class="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
                >
                  <mat-icon>table_view</mat-icon>
                  In Excel exportieren
                </button>
              </div>
            </div>
          </section>

          <!-- Preview Section -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <mat-icon class="text-gray-600">visibility</mat-icon>
              <h2 class="font-semibold text-gray-800">Vorschau (Top 5)</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                  <tr>
                    <th class="px-6 py-3">Datum</th>
                    <th class="px-6 py-3">Titel/Name</th>
                    <th class="px-6 py-3">Hauptgruppe</th>
                    <th class="px-6 py-3">Subgruppe</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (item of previewData(); track item.id) {
                    <tr class="hover:bg-gray-50 transition-colors">
                      <td class="px-6 py-4 whitespace-nowrap text-gray-500">{{ item.date | date:'shortDate' }}</td>
                      <td class="px-6 py-4 font-medium text-gray-900 truncate max-w-xs">{{ getItemTitle(item) }}</td>
                      <td class="px-6 py-4">
                        <span class="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{{ item.cluster }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{{ getItemSub(item) }}</span>
                      </td>
                    </tr>
                  }
                  @if (previewData().length === 0) {
                    <tr>
                      <td colspan="4" class="px-6 py-12 text-center text-gray-500 italic">
                        Keine Daten für die gewählten Filter gefunden.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  `
})
export class ExportComponent {
  activityService = inject(ActivityService);
  documentService = inject(DocumentService);
  clusterService = inject(ClusterService);
  toastService = inject(ToastService);

  exportSource = signal<'activities' | 'documents' | 'all'>('activities');
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedCluster = signal<string | null>(null);
  selectedSubcluster = signal<string | null>(null);

  availableSubclusters = computed(() => {
    const clusterName = this.selectedCluster();
    if (!clusterName) return [];
    const group = this.clusterService.mainGroups().find(g => g.name === clusterName);
    return group ? group.subGroups : [];
  });

  filteredActivities = computed(() => {
    let data = this.activityService.activities();
    const start = this.startDate();
    const end = this.endDate();
    const cluster = this.selectedCluster();
    const sub = this.selectedSubcluster();

    if (start) data = data.filter(a => new Date(a.date) >= new Date(start));
    if (end) data = data.filter(a => new Date(a.date) <= new Date(end));
    if (cluster) data = data.filter(a => a.cluster === cluster);
    if (sub) data = data.filter(a => a.subcluster === sub);

    return data;
  });

  filteredDocuments = computed(() => {
    let data = this.documentService.documents();
    const start = this.startDate();
    const end = this.endDate();
    const cluster = this.selectedCluster();
    const sub = this.selectedSubcluster();

    if (start) data = data.filter(d => new Date(d.date) >= new Date(start));
    if (end) data = data.filter(d => new Date(d.date) <= new Date(end));
    if (cluster) data = data.filter(d => d.cluster === cluster);
    if (sub) data = data.filter(d => d.tags.includes(sub));

    return data;
  });

  filteredDataCount = computed(() => {
    const source = this.exportSource();
    if (source === 'activities') return this.filteredActivities().length;
    if (source === 'documents') return this.filteredDocuments().length;
    return this.filteredActivities().length + this.filteredDocuments().length;
  });

  previewData = computed(() => {
    const source = this.exportSource();
    if (source === 'activities') return this.filteredActivities().slice(0, 5);
    if (source === 'documents') return this.filteredDocuments().slice(0, 5);
    const combined: (Activity | Document)[] = [...this.filteredActivities(), ...this.filteredDocuments()];
    return combined
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  });

  getItemTitle(item: Activity | Document): string {
    if ('title' in item) return (item as Activity).title;
    if ('name' in item) return (item as Document).name;
    return 'Unbekannt';
  }

  getItemSub(item: Activity | Document): string {
    if ('subcluster' in item && item.subcluster) return item.subcluster;
    if ('tags' in item && (item as Document).tags) return (item as Document).tags[0] || '-';
    return '-';
  }

  exportToExcel() {
    const source = this.exportSource();
    const wb = XLSX.utils.book_new();

    if (source === 'activities' || source === 'all') {
      const data = this.filteredActivities().map(a => ({
        Datum: a.date.toLocaleString(),
        Titel: a.title,
        URL: a.url,
        Kategorie: a.category,
        Hauptgruppe: a.cluster,
        Subgruppe: a.subcluster,
        Priorität: a.priority,
        Notizen: a.notes,
        Domain: a.domain
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Aktivitäten');
    }

    if (source === 'documents' || source === 'all') {
      const data = this.filteredDocuments().map(d => ({
        Datum: new Date(d.date).toLocaleString(),
        Name: d.name,
        Typ: d.type,
        Größe: d.size,
        Hauptgruppe: d.cluster,
        Tags: d.tags.join(', '),
        Priorität: d.priority,
        Aktivität: d.activity
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Dokumente');
    }

    const fileName = `Workspace_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    this.toastService.show('Excel-Export erfolgreich erstellt.', 'success');
  }
}
