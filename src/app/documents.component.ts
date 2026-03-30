import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './gemini.service';
import { ToastService } from './toast.service';
import { DocumentService } from './document.service';
import { ClusterService } from './cluster.service';
import { Document } from './models';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [MatIconModule, DatePipe, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50">
      <div class="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Dokumentenarchiv</h1>
          <p class="text-sm text-gray-500 mt-1">Verwalte deine Projektdateien und Dokumente</p>
        </div>
        <div class="flex gap-3">
          <button (click)="findDuplicates()" [disabled]="isSearchingDuplicates()" class="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
            <mat-icon [class.animate-spin]="isSearchingDuplicates()">{{ isSearchingDuplicates() ? 'autorenew' : 'difference' }}</mat-icon> Duplikate suchen
          </button>
          <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
            <mat-icon>upload_file</mat-icon> Dokument hochladen
          </button>
        </div>
      </div>
      
      <!-- Advanced Filters -->
      <div class="p-4 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-center shrink-0">
        <div class="relative flex-1 min-w-[250px] max-w-md">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            placeholder="Suchen nach Name, Tag, Aktivität..." 
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
        </div>
        <select [(ngModel)]="selectedPriority" class="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
          <option value="">Alle Prioritäten</option>
          <option value="Hoch">Hoch</option>
          <option value="Mittel">Mittel</option>
          <option value="Niedrig">Niedrig</option>
        </select>
        <select [(ngModel)]="selectedCluster" class="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
          <option value="">Alle Cluster</option>
          @for (group of clusterService.mainGroups(); track group.id) {
            <option [value]="group.name">{{ group.name }}</option>
          }
        </select>
        <select [(ngModel)]="selectedType" class="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
          <option value="">Alle Typen</option>
          <option value="PDF">PDF</option>
          <option value="Word">Word</option>
          <option value="Excel">Excel</option>
          <option value="Text">Text</option>
          <option value="JSON">JSON</option>
          <option value="CSV">CSV</option>
          <option value="HTML">HTML</option>
        </select>
      </div>
      
      <div class="flex-1 overflow-auto p-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priorität</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktivität</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cluster</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              @for (doc of visibleDocuments(); track doc.id) {
                <tr class="hover:bg-blue-50 transition-colors cursor-pointer group" (dblclick)="openDocument(doc)" title="Doppelklick zum Öffnen">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <mat-icon class="text-gray-400 mr-3 group-hover:text-blue-500 transition-colors">{{ getIconForType(doc.type) }}</mat-icon>
                      <div class="text-sm font-medium text-gray-900">{{ doc.name }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {{ doc.type }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex gap-1 flex-wrap max-w-[150px]">
                      @for(tag of doc.tags; track tag) {
                        <span class="px-2 py-0.5 text-[10px] leading-4 font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">{{tag}}</span>
                      }
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                          [class.bg-red-100]="doc.priority === 'Hoch'" [class.text-red-800]="doc.priority === 'Hoch'"
                          [class.bg-yellow-100]="doc.priority === 'Mittel'" [class.text-yellow-800]="doc.priority === 'Mittel'"
                          [class.bg-green-100]="doc.priority === 'Niedrig'" [class.text-green-800]="doc.priority === 'Niedrig'">
                      {{ doc.priority }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ doc.activity }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{{ doc.cluster }}</div>
                    <div class="text-xs text-gray-400">{{ doc.subcluster }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ doc.date | date:'dd.MM.yyyy' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end gap-2">
                      <button class="text-purple-600 hover:text-purple-900" (click)="$event.stopPropagation(); analyzeDocument(doc)" title="KI Zusammenfassung">
                        <mat-icon [class.animate-spin]="isAnalyzing() === doc.id" style="font-size: 20px; width: 20px; height: 20px;">
                          {{ isAnalyzing() === doc.id ? 'autorenew' : 'auto_awesome' }}
                        </mat-icon>
                      </button>
                      <button class="text-blue-600 hover:text-blue-900" (click)="$event.stopPropagation(); openDocument(doc)" title="Öffnen">
                        <mat-icon style="font-size: 20px; width: 20px; height: 20px;">open_in_new</mat-icon>
                      </button>
                      <button class="text-gray-600 hover:text-gray-900" (click)="$event.stopPropagation(); shareDocument(doc)" title="Teilen">
                        <mat-icon style="font-size: 20px; width: 20px; height: 20px;">share</mat-icon>
                      </button>
                      <button class="text-gray-600 hover:text-gray-900" (click)="$event.stopPropagation(); downloadDocument(doc)" title="Herunterladen">
                        <mat-icon style="font-size: 20px; width: 20px; height: 20px;">download</mat-icon>
                      </button>
                      <button class="text-red-600 hover:text-red-900" (click)="$event.stopPropagation(); deleteDocument(doc)" title="Löschen">
                        <mat-icon style="font-size: 20px; width: 20px; height: 20px;">delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (filteredDocuments().length === 0) {
                <tr>
                  <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <mat-icon class="mx-auto h-12 w-12 text-gray-400 mb-3">search_off</mat-icon>
                    <p>Keine Dokumente gefunden, die den Filterkriterien entsprechen.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (visibleCount() < filteredDocuments().length) {
            <div class="text-center py-6 border-t border-gray-200">
              <button 
                (click)="loadMore()"
                class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <mat-icon>expand_more</mat-icon>
                Mehr laden ({{ filteredDocuments().length - visibleCount() }} weitere)
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Duplicates Modal -->
      @if (duplicateResults()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div class="p-6 border-b border-gray-200 flex justify-between items-center shrink-0">
              <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                <mat-icon class="text-purple-600">difference</mat-icon>
                Gefundene Duplikate
              </h2>
              <button (click)="closeDuplicatesModal()" class="text-gray-400 hover:text-gray-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div class="space-y-6">
                @for (result of duplicateResults(); track result.originalId) {
                  <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div class="p-4 bg-purple-50 border-b border-gray-200">
                      <p class="text-sm font-medium text-purple-900 mb-1">KI-Begründung:</p>
                      <p class="text-sm text-purple-700">{{ result.reason }}</p>
                    </div>
                    
                    <!-- Original -->
                    @if (getDocumentById(result.originalId); as original) {
                      <div class="p-4 border-b border-gray-100 bg-green-50/30">
                        <div class="flex justify-between items-center">
                          <div class="flex items-center gap-3">
                            <div class="p-2 bg-green-100 text-green-700 rounded-lg">
                              <mat-icon>verified</mat-icon>
                            </div>
                            <div>
                              <p class="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Original</p>
                              <p class="font-medium text-gray-900">{{ original.name }}</p>
                              <p class="text-xs text-gray-500">{{ original.type }} • {{ original.size }} • {{ original.date | date:'short' }}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                    
                    <!-- Duplicates -->
                    <div class="p-4 bg-white">
                      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Mögliche Duplikate</p>
                      <div class="space-y-3">
                        @for (dupId of result.duplicateIds; track dupId) {
                          @if (getDocumentById(dupId); as dup) {
                            <div class="flex justify-between items-center p-3 rounded-lg border border-red-100 bg-red-50/30">
                              <div class="flex items-center gap-3">
                                <mat-icon class="text-red-400">content_copy</mat-icon>
                                <div>
                                  <p class="font-medium text-gray-900">{{ dup.name }}</p>
                                  <p class="text-xs text-gray-500">{{ dup.type }} • {{ dup.size }} • {{ dup.date | date:'short' }}</p>
                                </div>
                              </div>
                              <button (click)="deleteDuplicate(dup.id)" class="text-red-600 hover:text-red-800 hover:bg-red-100 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1">
                                <mat-icon style="font-size: 16px; width: 16px; height: 16px;">delete</mat-icon> Löschen
                              </button>
                            </div>
                          }
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="p-6 border-t border-gray-200 shrink-0 flex justify-end">
              <button (click)="closeDuplicatesModal()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                Schließen
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class DocumentsComponent {
  geminiService = inject(GeminiService);
  toastService = inject(ToastService);
  documentService = inject(DocumentService);
  clusterService = inject(ClusterService);
  
  searchTerm = signal('');
  selectedPriority = signal('');
  selectedCluster = signal('');
  selectedType = signal('');
  isAnalyzing = signal<string | null>(null);
  visibleCount = signal<number>(20);
  isSearchingDuplicates = signal(false);
  duplicateResults = signal<{originalId: string, duplicateIds: string[], reason: string}[] | null>(null);

  documents = this.documentService.documents;

  filteredDocuments = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const prio = this.selectedPriority();
    const cluster = this.selectedCluster();
    const type = this.selectedType();

    return this.documents().filter(doc => {
      const matchesSearch = !term || 
        doc.name.toLowerCase().includes(term) || 
        doc.activity.toLowerCase().includes(term) ||
        doc.tags.some(t => t.toLowerCase().includes(term));
      
      const matchesPriority = !prio || doc.priority === prio;
      const matchesCluster = !cluster || doc.cluster === cluster;
      const matchesType = !type || doc.type === type;

      return matchesSearch && matchesPriority && matchesCluster && matchesType;
    });
  });

  visibleDocuments = computed(() => {
    return this.filteredDocuments().slice(0, this.visibleCount());
  });

  loadMore() {
    this.visibleCount.update(c => c + 20);
  }

  getIconForType(type: string): string {
    switch (type.toLowerCase()) {
      case 'pdf': return 'picture_as_pdf';
      case 'word': return 'description';
      case 'excel': return 'table_chart';
      case 'json': return 'data_object';
      case 'csv': return 'view_list';
      case 'html': return 'html';
      case 'text': return 'article';
      default: return 'insert_drive_file';
    }
  }

  openDocument(doc: Document) {
    if (doc.url) {
      window.open(doc.url, '_blank');
    } else {
      this.toastService.show(`Das Dokument "${doc.name}" ist nur lokal verfügbar und kann nicht im Browser geöffnet werden.`, 'info');
    }
  }

  shareDocument(doc: Document) {
    this.toastService.show(`Teilen-Dialog für "${doc.name}" geöffnet.`, 'info');
  }

  downloadDocument(doc: Document) {
    this.toastService.show(`Download für "${doc.name}" gestartet.`, 'success');
  }

  deleteDocument(doc: Document) {
    this.documentService.deleteDocument(doc.id);
  }

  async analyzeDocument(doc: Document) {
    this.isAnalyzing.set(doc.id);
    const summary = await this.geminiService.generateDocumentSummary(doc.name);
    this.isAnalyzing.set(null);
    this.toastService.show(`KI Zusammenfassung für ${doc.name}:\n\n${summary}`, 'info');
  }

  async findDuplicates() {
    const docs = this.documents().map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      size: d.size
    }));
    
    if (docs.length < 2) {
      this.toastService.show('Nicht genügend Dokumente für eine Duplikatsuche vorhanden.', 'info');
      return;
    }

    this.isSearchingDuplicates.set(true);
    this.toastService.show('KI sucht nach Duplikaten...', 'info');
    
    const results = await this.geminiService.findDuplicates(docs);
    this.isSearchingDuplicates.set(false);
    
    if (results && results.length > 0) {
      this.duplicateResults.set(results);
    } else {
      this.toastService.show('Keine Duplikate gefunden.', 'success');
    }
  }

  closeDuplicatesModal() {
    this.duplicateResults.set(null);
  }

  deleteDuplicate(id: string) {
    this.documentService.deleteDocument(id);
    // Remove from results
    this.duplicateResults.update(results => {
      if (!results) return null;
      return results.map(r => ({
        ...r,
        duplicateIds: r.duplicateIds.filter(dupId => dupId !== id)
      })).filter(r => r.duplicateIds.length > 0);
    });
  }
  
  getDocumentById(id: string): Document | undefined {
    return this.documents().find(d => d.id === id);
  }
}

