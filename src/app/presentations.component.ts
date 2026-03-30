import { Component, signal, computed, inject, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ToastService } from './toast.service';
import { CommonModule } from '@angular/common';
import { 
  auth, db, storage, onAuthStateChanged, User,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, 
  ref, uploadBytes, getDownloadURL, deleteObject,
  OperationType, handleFirestoreError 
} from './firebase';
import { Presentation } from './models';

@Component({
  selector: 'app-presentations',
  standalone: true,
  imports: [MatIconModule, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50 relative">
      <div class="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Präsentationen Archiv</h1>
          <p class="text-sm text-gray-500 mt-1">Zentrale Verwaltung von PDF, PowerPoint und Word Dateien</p>
        </div>
        <div class="flex gap-3">
          <button (click)="triggerFileUpload()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
            <mat-icon>add_to_photos</mat-icon> Präsentation hinzufügen
          </button>
          <input type="file" #fileInput class="hidden" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" (change)="onFilesUploaded($event)">
        </div>
      </div>
      
      <!-- Advanced Filters -->
      <div class="p-4 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-center shrink-0">
        <div class="relative flex-1 min-w-[250px] max-w-md">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            placeholder="Suchen nach Titel, Tag, Kategorie..." 
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
        </div>

        <select [(ngModel)]="selectedType" class="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
          <option value="">Alle Dateitypen</option>
          <option value="pdf">PDF</option>
          <option value="ppt">PowerPoint</option>
          <option value="word">Word</option>
        </select>

        <select [(ngModel)]="selectedCategory" class="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
          <option value="">Alle Kategorien</option>
          <option value="Marketing">Marketing</option>
          <option value="Vertrieb">Vertrieb</option>
          <option value="Technik">Technik</option>
          <option value="Schulung">Schulung</option>
        </select>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          @for (pres of filteredPresentations(); track pres.id) {
            <div 
              class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group cursor-pointer flex flex-col transition-all duration-200 hover:shadow-md"
            >
              <div class="aspect-video relative overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                <mat-icon class="text-gray-300" style="font-size: 64px; width: 64px; height: 64px;">
                  {{ getFileIcon(pres.type) }}
                </mat-icon>
                
                <div class="absolute top-2 right-2">
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded uppercase"
                        [class.bg-red-100]="pres.type === 'pdf'" [class.text-red-700]="pres.type === 'pdf'"
                        [class.bg-orange-100]="pres.type === 'ppt'" [class.text-orange-700]="pres.type === 'ppt'"
                        [class.bg-blue-100]="pres.type === 'word'" [class.text-blue-700]="pres.type === 'word'">
                    {{ pres.type }}
                  </span>
                </div>

                <!-- Hover Actions -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors" (click)="openEditDialog(pres)" title="Bearbeiten">
                    <mat-icon style="font-size: 20px; width: 20px; height: 20px; display: block;">edit</mat-icon>
                  </button>
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors" (click)="downloadFile(pres)" title="Herunterladen">
                    <mat-icon style="font-size: 20px; width: 20px; height: 20px; display: block;">download</mat-icon>
                  </button>
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors" (click)="deletePresentation(pres)" title="Löschen">
                    <mat-icon style="font-size: 20px; width: 20px; height: 20px; display: block;">delete</mat-icon>
                  </button>
                </div>
              </div>
              <div class="p-4 flex-1 flex flex-col">
                <h3 class="font-medium text-gray-900 truncate" [title]="pres.title">{{ pres.title }}</h3>
                <div class="text-xs text-gray-500 mt-1 flex justify-between">
                  <span>{{ pres.category }}</span>
                  <span>{{ pres.size }}</span>
                </div>
                <div class="flex flex-wrap gap-1 mt-3 mt-auto">
                  @for (tag of pres.tags; track tag) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {{ tag }}
                    </span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
        
        @if (filteredPresentations().length === 0) {
          <div class="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 mt-6">
            <mat-icon class="mx-auto h-12 w-12 text-gray-400 mb-3">search_off</mat-icon>
            <p>Keine Präsentationen gefunden.</p>
          </div>
        }
      </div>

      <!-- Edit Metadata Modal -->
      @if (editingPresentation()) {
        <div class="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                <mat-icon class="text-emerald-600">edit_note</mat-icon>
                Metadaten bearbeiten
              </h2>
              <button (click)="closeEditDialog()" class="text-gray-400 hover:text-gray-600 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6 space-y-4">
              <div>
                <label for="editTitle" class="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <input 
                  id="editTitle"
                  type="text" 
                  [(ngModel)]="editForm.title" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
              </div>

              <div>
                <label for="editCategory" class="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                <select 
                  id="editCategory"
                  [(ngModel)]="editForm.category" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
                  <option value="Marketing">Marketing</option>
                  <option value="Vertrieb">Vertrieb</option>
                  <option value="Technik">Technik</option>
                  <option value="Schulung">Schulung</option>
                </select>
              </div>

              <div>
                <label for="editTags" class="block text-sm font-medium text-gray-700 mb-1">Tags (kommagetrennt)</label>
                <input 
                  id="editTags"
                  type="text" 
                  [(ngModel)]="editForm.tags" 
                  placeholder="Tag1, Tag2, Tag3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
              </div>
            </div>

            <div class="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button (click)="closeEditDialog()" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors">Abbrechen</button>
              <button 
                (click)="saveMetadata()" 
                class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shadow-md"
              >
                <mat-icon>save</mat-icon>
                Speichern
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class PresentationsComponent {
  private toast = inject(ToastService);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  presentations = signal<Presentation[]>([]);
  searchTerm = signal('');
  selectedType = signal('');
  selectedCategory = signal('');
  user = signal<User | null>(null);
  isAuthReady = signal(false);

  editingPresentation = signal<Presentation | null>(null);
  editForm = {
    title: '',
    category: '',
    tags: ''
  };

  filteredPresentations = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const type = this.selectedType();
    const cat = this.selectedCategory();

    return this.presentations().filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(term) || 
                          p.tags.some(t => t.toLowerCase().includes(term)) ||
                          p.category.toLowerCase().includes(term);
      const matchesType = !type || p.type === type;
      const matchesCategory = !cat || p.category === cat;
      return matchesSearch && matchesType && matchesCategory;
    });
  });

  constructor() {
    onAuthStateChanged(auth, (u) => {
      this.user.set(u);
      this.isAuthReady.set(true);
      if (u) {
        this.loadPresentations();
      } else {
        this.presentations.set([]);
      }
    });
  }

  private loadPresentations() {
    const q = query(collection(db, 'presentations'), where('uid', '==', this.user()?.uid));
    onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data()['date']?.toDate() || new Date()
      } as Presentation));
      this.presentations.set(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'presentations');
    });
  }

  getFileIcon(type: string): string {
    switch (type) {
      case 'pdf': return 'picture_as_pdf';
      case 'ppt': return 'slideshow';
      case 'word': return 'description';
      default: return 'insert_drive_file';
    }
  }

  triggerFileUpload() {
    this.fileInput.nativeElement.click();
  }

  async onFilesUploaded(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.user()) return;

    const files = Array.from(input.files);
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        let type: 'pdf' | 'ppt' | 'word' = 'pdf';
        if (fileExt === 'ppt' || fileExt === 'pptx') type = 'ppt';
        if (fileExt === 'doc' || fileExt === 'docx') type = 'word';

        const storagePath = `presentations/${this.user()?.uid}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        const newPres: Omit<Presentation, 'id'> = {
          uid: this.user()!.uid,
          title: file.name,
          type: type,
          category: 'Allgemein',
          tags: [type, 'Neu'],
          date: new Date(),
          size: this.formatBytes(file.size),
          fileUrl: url,
          storagePath: storagePath
        };

        await setDoc(doc(collection(db, 'presentations')), newPres);
        this.toast.show(`Datei ${file.name} erfolgreich hochgeladen`, 'success');
      } catch (error) {
        this.toast.show(`Fehler beim Hochladen von ${file.name}`, 'error');
        console.error(error);
      }
    }
    input.value = '';
  }

  private formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  openEditDialog(pres: Presentation) {
    this.editingPresentation.set(pres);
    this.editForm = {
      title: pres.title,
      category: pres.category,
      tags: pres.tags.join(', ')
    };
  }

  closeEditDialog() {
    this.editingPresentation.set(null);
  }

  async saveMetadata() {
    const pres = this.editingPresentation();
    if (!pres) return;

    try {
      const updatedTags = this.editForm.tags.split(',').map(t => t.trim()).filter(t => t);
      await updateDoc(doc(db, 'presentations', pres.id), {
        title: this.editForm.title,
        category: this.editForm.category,
        tags: updatedTags
      });
      this.toast.show('Metadaten aktualisiert', 'success');
      this.closeEditDialog();
    } catch (error) {
      this.toast.show('Fehler beim Speichern', 'error');
      console.error(error);
    }
  }

  async deletePresentation(pres: Presentation) {
    if (!confirm(`Möchten Sie "${pres.title}" wirklich löschen?`)) return;

    try {
      // Delete from Storage
      const storageRef = ref(storage, pres.storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'presentations', pres.id));
      this.toast.show('Präsentation gelöscht', 'success');
    } catch (error) {
      this.toast.show('Fehler beim Löschen', 'error');
      console.error(error);
    }
  }

  downloadFile(pres: Presentation) {
    window.open(pres.fileUrl, '_blank');
  }
}
